// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! `design-data changelog`: append a release to each component's `changelog/<component>.json`.
//!
//! Git is called as a subprocess and nothing here assumes the monorepo layout: the dataset
//! directory may sit anywhere in any repository. Each revision is exported with `git archive`
//! into a temporary directory, so the working tree is never touched.

use std::collections::BTreeMap;
use std::path::{Path, PathBuf};
use std::process::ExitCode;
use std::process::{Command, Stdio};

use design_data_core::changelog::{
    entries_for_step, source_of, to_json, Baseline, CommitChanges, ComponentLog, Step,
    STARTING_VERSION,
};
use design_data_core::record_diff::{diff_datasets, DatasetSnapshot};
use miette::{miette, IntoDiagnostic, WrapErr};

fn git(dir: &Path, args: &[&str]) -> miette::Result<String> {
    let out = Command::new("git")
        .arg("-C")
        .arg(dir)
        .args(args)
        .output()
        .into_diagnostic()
        .wrap_err("failed to run git")?;
    if !out.status.success() {
        return Err(miette!(
            "git {} failed: {}",
            args.join(" "),
            String::from_utf8_lossy(&out.stderr).trim()
        ));
    }
    Ok(String::from_utf8_lossy(&out.stdout).trim().to_string())
}

/// `owner/name` of a GitHub remote, in https or ssh form.
fn github_repo(dir: &Path) -> Option<String> {
    let url = git(dir, &["remote", "get-url", "origin"]).ok()?;
    let tail = url.split("github.com").nth(1)?;
    let tail = tail.trim_start_matches([':', '/']).trim_end_matches(".git");
    (tail.matches('/').count() == 1).then(|| tail.to_string())
}

/// Export the dataset directory at `rev` and load it. A revision without the directory is empty.
fn snapshot_at(top: &Path, prefix: &str, rev: &str) -> miette::Result<DatasetSnapshot> {
    let tmp = tempfile::tempdir().into_diagnostic()?;
    let spec = if prefix.is_empty() {
        ".".to_string()
    } else {
        prefix.trim_end_matches('/').to_string()
    };
    let present = Command::new("git")
        .arg("-C")
        .arg(top)
        .args(["cat-file", "-e", &format!("{rev}:{spec}")])
        .stderr(Stdio::null())
        .status()
        .into_diagnostic()?
        .success();
    if !present {
        return DatasetSnapshot::load(tmp.path()).into_diagnostic();
    }
    let mut child = Command::new("git")
        .arg("-C")
        .arg(top)
        .args(["archive", "--format=tar", rev, "--", &spec])
        .stdout(Stdio::piped())
        .spawn()
        .into_diagnostic()?;
    tar::Archive::new(child.stdout.take().expect("piped stdout"))
        .unpack(tmp.path())
        .into_diagnostic()
        .wrap_err("failed to unpack git archive")?;
    if !child.wait().into_diagnostic()?.success() {
        return Err(miette!("git archive {rev} failed"));
    }
    let root = if prefix.is_empty() {
        tmp.path().to_path_buf()
    } else {
        tmp.path().join(&spec)
    };
    DatasetSnapshot::load(&root)
        .into_diagnostic()
        .wrap_err_with(|| format!("failed to load dataset at {rev}"))
}

/// `@scope/pkg@3.7.1` → `3.7.1`.
fn release_label(reference: &str) -> String {
    reference
        .rsplit('@')
        .next()
        .unwrap_or(reference)
        .to_string()
}

pub struct Args {
    pub from: String,
    pub to: String,
    pub component: Option<String>,
    pub dataset: Option<PathBuf>,
    pub release: Option<String>,
    pub tags: Option<String>,
}

/// A release the range is cut into: the label it is recorded under and the commit it ends at.
struct Cut {
    label: String,
    commit: String,
    date: String,
}

pub fn run(args: Args) -> miette::Result<ExitCode> {
    let dataset = match args.dataset {
        Some(d) => d,
        None => {
            let cwd = std::env::current_dir().into_diagnostic()?;
            let resolved = design_data_core::data_source::resolve(&cwd, &Default::default())
                .into_diagnostic()?;
            resolved
                .tokens_root
                .parent()
                .map(Path::to_path_buf)
                .ok_or_else(|| miette!("could not find a dataset; pass --dataset"))?
        }
    };
    let dataset = dataset
        .canonicalize()
        .into_diagnostic()
        .wrap_err("dataset path")?;
    let top = PathBuf::from(git(&dataset, &["rev-parse", "--show-toplevel"])?)
        .canonicalize()
        .into_diagnostic()?;
    let prefix = dataset
        .strip_prefix(&top)
        .map_err(|_| miette!("dataset is outside its git repository"))?
        .to_string_lossy()
        .to_string();
    let spec = if prefix.is_empty() {
        ".".to_string()
    } else {
        prefix.clone()
    };

    let rev = |r: &str| git(&top, &["rev-parse", &format!("{r}^{{commit}}")]);
    let (base, head) = (rev(&args.from)?, rev(&args.to)?);
    let range = format!("{base}..{head}");
    let repo = github_repo(&top);

    // Position of every first-parent commit, so each commit lands in the release that ships it.
    let order: Vec<String> = git(&top, &["rev-list", "--first-parent", "--reverse", &range])?
        .lines()
        .map(str::to_string)
        .collect();
    let position = |sha: &str| order.iter().position(|c| c == sha);
    let cut_date = |sha: &str| git(&top, &["log", "-1", "--format=%cs", sha]);

    // Cuts, in order. With --tags: one per matching stable tag inside the range, then the tail.
    let mut cuts: Vec<(usize, Cut)> = Vec::new();
    if let Some(glob) = &args.tags {
        for tag in git(&top, &["tag", "--list", glob])?.lines() {
            let label = release_label(tag);
            if label.contains('-') {
                continue; // pre-releases ship inside the next stable release
            }
            let commit = rev(tag)?;
            if let Some(i) = position(&commit) {
                cuts.push((
                    i,
                    Cut {
                        label,
                        date: cut_date(&commit)?,
                        commit,
                    },
                ));
            }
        }
        cuts.sort_by_key(|(i, _)| *i);
    }
    let tail_label = match (&args.release, args.to.as_str(), cuts.last()) {
        (Some(r), _, _) => Some(r.clone()),
        (None, _, Some(_)) => None,
        (None, "HEAD", None) => return Err(miette!("--release is required when --to is HEAD")),
        (None, to, None) => Some(release_label(to)),
    };
    if let Some(label) = tail_label {
        if cuts.last().is_none_or(|(_, c)| c.commit != head) {
            cuts.push((
                order.len().saturating_sub(1),
                Cut {
                    label,
                    date: cut_date(&head)?,
                    commit: head.clone(),
                },
            ));
        }
    }
    let release_of = |sha: &str| -> Option<usize> {
        let i = position(sha)?;
        cuts.iter().position(|(end, _)| i <= *end)
    };

    let out_dir = dataset.join("changelog");
    let load_log = |c: &str| -> miette::Result<Option<ComponentLog>> {
        let p = out_dir.join(format!("{c}.json"));
        if !p.is_file() {
            return Ok(None);
        }
        let text = std::fs::read_to_string(&p).into_diagnostic()?;
        Ok(Some(
            serde_json::from_str(&text)
                .into_diagnostic()
                .wrap_err_with(|| p.display().to_string())?,
        ))
    };

    let log = git(
        &top,
        &[
            "log",
            "--first-parent",
            "--reverse",
            "--format=%H%x1f%cs%x1f%s",
            &range,
            "--",
            &spec,
        ],
    )?;
    let commits: Vec<(String, String, String)> = log
        .lines()
        .filter_map(|l| {
            let mut p = l.split('\x1f');
            Some((
                p.next()?.to_string(),
                p.next()?.to_string(),
                p.next()?.to_string(),
            ))
        })
        .collect();

    // Each commit is diffed once for every component; entries gather per release and component.
    let mut prev = snapshot_at(&top, &prefix, &base)?;
    let at_base: Vec<String> = prev.components.keys().cloned().collect();
    let mut gathered: BTreeMap<(usize, String), Vec<CommitChanges>> = BTreeMap::new();
    for (sha, cdate, subject) in &commits {
        let next = snapshot_at(&top, &prefix, sha)?;
        let diff = diff_datasets(&prev, &next);
        let step = Step {
            sha: sha.clone(),
            date: cdate.clone(),
            source: source_of(sha, subject, repo.as_deref()),
        };
        // Commits past the last cut belong to no release; they are left for a later run.
        if let Some(r) = release_of(sha) {
            for (c, changes) in entries_for_step(&prev, &next, &diff, &step) {
                gathered.entry((r, c)).or_default().push(changes);
            }
        }
        prev = next;
    }

    std::fs::create_dir_all(&out_dir).into_diagnostic()?;
    let mut logs: BTreeMap<String, (ComponentLog, bool)> = BTreeMap::new();
    let mut skipped = 0;
    for ((r, component), commits) in gathered {
        if args.component.as_deref().is_some_and(|c| c != component) {
            continue;
        }
        if !logs.contains_key(&component) {
            let existing = load_log(&component)?;
            let mut log = existing
                .clone()
                .unwrap_or_else(|| ComponentLog::new(&component));
            if existing.is_none() && at_base.contains(&component) {
                log.baseline = Some(Baseline {
                    release: release_label(&args.from),
                    version: STARTING_VERSION.into(),
                    commit: base.clone(),
                });
            }
            logs.insert(component.clone(), (log, false));
        }
        let (log, changed) = logs.get_mut(&component).expect("inserted");
        let cut = &cuts[r].1;
        if log.append(&cut.label, &cut.date, &cut.commit, commits) {
            *changed = true;
        } else {
            skipped += 1;
        }
    }
    // A component with nothing newer still hands its pending `unreleased` changes to this release.
    if let (None, Some((_, cut))) = (&args.tags, cuts.last()) {
        for entry in std::fs::read_dir(&out_dir).into_diagnostic()?.flatten() {
            let path = entry.path();
            let Some(component) = path
                .file_stem()
                .and_then(|s| s.to_str())
                .map(str::to_string)
            else {
                continue;
            };
            if path.extension().is_none_or(|e| e != "json")
                || logs.contains_key(&component)
                || args.component.as_deref().is_some_and(|c| c != component)
            {
                continue;
            }
            if let Some(mut log) = load_log(&component)? {
                if log.adopt_unreleased(&cut.label, &cut.date, &cut.commit) {
                    logs.insert(component, (log, true));
                }
            }
        }
    }
    // A component that existed at the start and never changed still gets a file, at 1.0.0.
    for component in &at_base {
        if logs.contains_key(component)
            || args.component.as_deref().is_some_and(|c| c != component)
            || out_dir.join(format!("{component}.json")).exists()
        {
            continue;
        }
        let mut log = ComponentLog::new(component);
        log.baseline = Some(Baseline {
            release: release_label(&args.from),
            version: STARTING_VERSION.into(),
            commit: base.clone(),
        });
        logs.insert(component.clone(), (log, true));
    }
    let mut written = 0;
    for (component, (log, changed)) in logs {
        if changed {
            std::fs::write(out_dir.join(format!("{component}.json")), to_json(&log))
                .into_diagnostic()?;
            written += 1;
        }
    }
    eprintln!(
        "{} release(s): {written} component changelogs written, {skipped} component releases already recorded",
        cuts.len()
    );
    Ok(ExitCode::SUCCESS)
}
