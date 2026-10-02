// Copyright 2026 Adobe. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

//! Offline HTTP contracts: never point these tests at a shared Figma file.

use std::io::{BufRead, BufReader, Read, Write};
use std::net::TcpListener;
use std::sync::{
    atomic::{AtomicBool, Ordering},
    Arc, Mutex,
};
use std::thread::{self, JoinHandle};
use std::time::Duration;

use assert_cmd::Command;
use serde_json::{json, Value};

#[derive(Clone, Copy, PartialEq)]
enum Scenario {
    Success,
    Drift,
    Reorder,
    ModeOrder,
    Mismatch,
    MissingMapping,
    Disconnect,
    Malformed,
    ServerError,
    ReadbackFailure,
    Rejected,
    NumericNear,
    NumericFar,
}

struct Server {
    url: String,
    requests: Arc<Mutex<Vec<(String, Value)>>>,
    stop: Arc<AtomicBool>,
    thread: Option<JoinHandle<()>>,
}

fn baseline() -> Value {
    json!({"status":200,"error":false,"meta":{
        "variables":{
            "number":{"id":"number","name":"platformScale/line-height-100","key":"kn","variableCollectionId":"scale",
                "resolvedType":"FLOAT","valuesByMode":{"desktop":1.3},"description":"original"},
            "old":{"id":"old","name":"deprecated","key":"ko","variableCollectionId":"scale",
                "resolvedType":"FLOAT","valuesByMode":{"desktop":99},"description":"deprecated"}
        },
        "variableCollections":{
            "scale":{"id":"scale","name":".Platform scale","key":"ks","isExtension":false,
                "modes":[{"modeId":"desktop","name":"Desktop"}],"defaultModeId":"desktop","variableIds":["number","old"]},
            "color":{"id":"color","name":".Color theme","key":"kc","isExtension":false,
                "modes":[{"modeId":"light","name":"Light"},{"modeId":"dark","name":"Dark"}],
                "defaultModeId":"light","variableIds":[]}
        }
    }})
}

fn apply(live: &mut Value, payload: &Value) -> Value {
    let mut mappings = serde_json::Map::new();
    for variable in payload["variables"].as_array().unwrap() {
        if variable["action"] == "CREATE" {
            let temp = variable["id"].as_str().unwrap();
            let id = format!("real-{temp}");
            mappings.insert(temp.into(), json!(id));
            live["meta"]["variables"][&id] =
                json!({"id":id,"key":format!("key-{id}"),"valuesByMode":{}});
            let collection = variable["variableCollectionId"].as_str().unwrap();
            live["meta"]["variableCollections"][collection]["variableIds"]
                .as_array_mut()
                .unwrap()
                .push(json!(id));
        }
    }
    let real = |id: &str| {
        mappings
            .get(id)
            .and_then(Value::as_str)
            .unwrap_or(id)
            .to_string()
    };
    for variable in payload["variables"].as_array().unwrap() {
        let id = real(variable["id"].as_str().unwrap());
        for (field, value) in variable.as_object().unwrap() {
            if field != "action" {
                live["meta"]["variables"][&id][field] = value.clone();
            }
        }
        live["meta"]["variables"][&id]["id"] = json!(id);
    }
    for value in payload["variableModeValues"].as_array().unwrap() {
        let id = real(value["variableId"].as_str().unwrap());
        let mode = value["modeId"].as_str().unwrap();
        let mut expected = value["value"].clone();
        if expected["type"] == "VARIABLE_ALIAS" {
            expected["id"] = json!(real(expected["id"].as_str().unwrap()));
        }
        live["meta"]["variables"][&id]["valuesByMode"][mode] = expected;
    }
    json!({"status":200,"error":false,"meta":{"tempIdToRealId":mappings}})
}

impl Server {
    fn new(scenario: Scenario) -> Self {
        let listener = TcpListener::bind("127.0.0.1:0").unwrap();
        listener.set_nonblocking(true).unwrap();
        let url = format!("http://{}", listener.local_addr().unwrap());
        let requests = Arc::new(Mutex::new(Vec::new()));
        let stop = Arc::new(AtomicBool::new(false));
        let captured = Arc::clone(&requests);
        let stopped = Arc::clone(&stop);
        let thread = thread::spawn(move || {
            let mut live = baseline();
            let mut gets = 0;
            while !stopped.load(Ordering::SeqCst) {
                let (mut stream, _) = match listener.accept() {
                    Ok(connection) => connection,
                    Err(error) if error.kind() == std::io::ErrorKind::WouldBlock => {
                        thread::sleep(Duration::from_millis(5));
                        continue;
                    }
                    Err(error) => panic!("mock accept: {error}"),
                };
                stream.set_nonblocking(false).unwrap();
                stream
                    .set_read_timeout(Some(Duration::from_secs(5)))
                    .unwrap();
                let mut reader = BufReader::new(stream.try_clone().unwrap());
                let mut first = String::new();
                reader.read_line(&mut first).unwrap();
                let method = first.split_whitespace().next().unwrap().to_string();
                assert!(first.contains("/v1/files/offline-file/variables"));
                let mut length = 0;
                loop {
                    let mut line = String::new();
                    reader.read_line(&mut line).unwrap();
                    if line == "\r\n" {
                        break;
                    }
                    if let Some(value) = line.to_lowercase().strip_prefix("content-length:") {
                        length = value.trim().parse().unwrap();
                    }
                }
                let mut bytes = vec![0; length];
                reader.read_exact(&mut bytes).unwrap();
                let payload: Value = if bytes.is_empty() {
                    Value::Null
                } else {
                    serde_json::from_slice(&bytes).unwrap()
                };
                captured
                    .lock()
                    .unwrap()
                    .push((method.clone(), payload.clone()));
                let mut status = 200;
                let response = if method == "GET" {
                    gets += 1;
                    if gets == 2 {
                        match scenario {
                            Scenario::Drift => {
                                live["meta"]["variables"]["old"]["description"] =
                                    json!("concurrent edit")
                            }
                            Scenario::Reorder => live["meta"]["variableCollections"]["scale"]
                                ["variableIds"]
                                .as_array_mut()
                                .unwrap()
                                .reverse(),
                            Scenario::ModeOrder => live["meta"]["variableCollections"]["color"]
                                ["modes"]
                                .as_array_mut()
                                .unwrap()
                                .reverse(),
                            _ => {}
                        }
                    }
                    if gets == 3 && scenario == Scenario::ReadbackFailure {
                        status = 403;
                        json!({"error":true,"message":"credential-sentinel"}).to_string()
                    } else {
                        live.to_string()
                    }
                } else {
                    assert_eq!(method, "POST");
                    if scenario == Scenario::Rejected {
                        status = 403;
                        json!({"error":true,"message":"credential-sentinel"}).to_string()
                    } else {
                        let mut response = apply(&mut live, &payload);
                        match scenario {
                            Scenario::Mismatch => {
                                live["meta"]["variables"]["old"]["description"] =
                                    json!("unexpected change")
                            }
                            Scenario::MissingMapping => {
                                response["meta"]["tempIdToRealId"] = json!({})
                            }
                            Scenario::Disconnect => continue,
                            Scenario::Malformed => {
                                stream.write_all(b"HTTP/1.1 200 OK\r\nContent-Length: 1\r\nConnection: close\r\n\r\n{").unwrap();
                                continue;
                            }
                            Scenario::ServerError => status = 500,
                            Scenario::NumericNear => {
                                live["meta"]["variables"]["number"]["valuesByMode"]["desktop"] =
                                    json!(1.7000005)
                            }
                            Scenario::NumericFar => {
                                live["meta"]["variables"]["number"]["valuesByMode"]["desktop"] =
                                    json!(1.700002)
                            }
                            _ => {}
                        }
                        response.to_string()
                    }
                };
                write!(stream, "HTTP/1.1 {status} Mock\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{response}", response.len()).unwrap();
            }
        });
        Self {
            url,
            requests,
            stop,
            thread: Some(thread),
        }
    }

    fn methods(&self) -> Vec<String> {
        self.requests
            .lock()
            .unwrap()
            .iter()
            .map(|(method, _)| method.clone())
            .collect()
    }
}

impl Drop for Server {
    fn drop(&mut self) {
        self.stop.store(true, Ordering::SeqCst);
        let result = self.thread.take().unwrap().join();
        if !thread::panicking() {
            result.expect("mock server thread failed");
        }
    }
}

fn run(server: &Server, flags: &[&str]) -> (std::process::Output, tempfile::TempDir) {
    let directory = tempfile::tempdir().unwrap();
    let tokens = directory.path().join("tokens");
    std::fs::create_dir(&tokens).unwrap();
    std::fs::write(tokens.join("typography.json"), json!({
        "line-height-100":{"$schema":"https://example.com/multiplier.json","value":1.7},
        "heading-line-height":{"$schema":"https://example.com/alias.json","value":"{line-height-100}"}
    }).to_string()).unwrap();
    let output = Command::cargo_bin("design-data")
        .unwrap()
        .timeout(Duration::from_secs(20))
        .args(["figma", "export"])
        .arg(tokens)
        .args([
            "--file-key",
            "offline-file",
            "--token",
            "credential-sentinel",
            "--verification-out",
        ])
        .env("FIGMA_API_BASE_URL", &server.url)
        .arg(directory.path().join("reports"))
        .args(flags)
        .output()
        .unwrap();
    assert!(!String::from_utf8_lossy(&output.stdout).contains("credential-sentinel"));
    assert!(!String::from_utf8_lossy(&output.stderr).contains("credential-sentinel"));
    (output, directory)
}

#[test]
fn verified_success_requires_readback_and_records_artifacts() {
    for scenario in [Scenario::Success, Scenario::Reorder] {
        let server = Server::new(scenario);
        let (output, directory) = run(&server, &[]);
        assert!(
            output.status.success(),
            "{}",
            String::from_utf8_lossy(&output.stderr)
        );
        assert!(String::from_utf8_lossy(&output.stderr).contains("Figma write verified"));
        assert_eq!(server.methods(), ["GET", "GET", "POST", "GET"]);
        let report: Value = serde_json::from_slice(
            &std::fs::read(directory.path().join("reports/readback.json")).unwrap(),
        )
        .unwrap();
        assert_eq!(report["verified"], true);
        assert_eq!(report["creates"], 1);
        assert_eq!(report["updates"], 1);
        let preflight: Value = serde_json::from_slice(
            &std::fs::read(directory.path().join("reports/preflight.json")).unwrap(),
        )
        .unwrap();
        assert_eq!(preflight["concurrentChangesDetected"], false);
        use sha2::{Digest, Sha256};
        let requests = server.requests.lock().unwrap();
        let posted = &requests
            .iter()
            .find(|(method, _)| method == "POST")
            .unwrap()
            .1;
        assert_eq!(
            preflight["payloadSha256"],
            format!("{:x}", Sha256::digest(serde_json::to_vec(posted).unwrap()))
        );
    }
}

#[test]
fn concurrent_metadata_and_mode_order_drift_prevent_post() {
    for scenario in [Scenario::Drift, Scenario::ModeOrder] {
        let server = Server::new(scenario);
        let (output, _) = run(&server, &[]);
        assert!(!output.status.success());
        assert!(String::from_utf8_lossy(&output.stderr).contains("POST aborted"));
        assert_eq!(server.methods(), ["GET", "GET"]);
    }
}

#[test]
fn readback_mismatch_missing_mapping_and_read_failure_are_not_success() {
    for scenario in [
        Scenario::Mismatch,
        Scenario::MissingMapping,
        Scenario::ReadbackFailure,
    ] {
        let server = Server::new(scenario);
        let (output, _) = run(&server, &[]);
        assert!(!output.status.success());
        let stderr = String::from_utf8_lossy(&output.stderr);
        assert!(!stderr.contains("Done."));
        assert!(stderr.contains("before retrying"));
        assert_eq!(server.methods(), ["GET", "GET", "POST", "GET"]);
    }
}

#[test]
fn ambiguous_post_is_probed_once_and_never_retried_even_with_bypasses() {
    for scenario in [
        Scenario::Disconnect,
        Scenario::Malformed,
        Scenario::ServerError,
    ] {
        let server = Server::new(scenario);
        let (output, directory) = run(
            &server,
            &["--allow-concurrent-changes", "--skip-readback-verification"],
        );
        assert!(!output.status.success());
        assert!(String::from_utf8_lossy(&output.stderr).contains("outcome is ambiguous"));
        assert_eq!(server.methods(), ["GET", "GET", "POST", "GET"]);
        let report: Value = serde_json::from_slice(
            &std::fs::read(directory.path().join("reports/ambiguous-outcome.json")).unwrap(),
        )
        .unwrap();
        assert_eq!(report["verified"], false);
        assert_eq!(report["automaticMutationRetries"], 0);
    }
}

#[test]
fn rejection_does_not_retry_or_echo_error_body() {
    let server = Server::new(Scenario::Rejected);
    let (output, _) = run(&server, &[]);
    assert!(!output.status.success());
    assert_eq!(server.methods(), ["GET", "GET", "POST"]);
}

#[test]
fn dry_run_is_one_read_and_creates_no_artifacts() {
    let server = Server::new(Scenario::Success);
    let (output, directory) = run(&server, &["--dry-run"]);
    assert!(output.status.success());
    let payload: Value = serde_json::from_slice(&output.stdout).unwrap();
    assert!(payload["variables"].is_array());
    assert_eq!(server.methods(), ["GET"]);
    assert!(!directory.path().join("reports").exists());
}

#[test]
fn bypasses_are_explicit_and_never_claim_verified_success() {
    let server = Server::new(Scenario::Drift);
    let (output, _) = run(&server, &["--allow-concurrent-changes"]);
    assert!(
        output.status.success(),
        "{}",
        String::from_utf8_lossy(&output.stderr)
    );
    assert!(String::from_utf8_lossy(&output.stderr).contains("overriding concurrent changes"));
    assert_eq!(server.methods(), ["GET", "GET", "POST", "GET"]);

    let server = Server::new(Scenario::Mismatch);
    let (output, directory) = run(&server, &["--skip-readback-verification"]);
    assert!(output.status.success());
    let stderr = String::from_utf8_lossy(&output.stderr);
    assert!(stderr.contains("unverified write accepted"));
    assert!(!stderr.contains("Done."));
    assert_eq!(server.methods(), ["GET", "GET", "POST"]);
    let report: Value = serde_json::from_slice(
        &std::fs::read(directory.path().join("reports/readback.json")).unwrap(),
    )
    .unwrap();
    assert_eq!(report["verified"], false);
}

#[test]
fn invalid_tolerance_and_nonloopback_override_fail_before_get() {
    for flags in [
        vec!["--numeric-tolerance", "NaN"],
        vec!["--numeric-tolerance", "inf"],
        vec!["--numeric-tolerance=-1"],
        vec!["--figma-api-base-url", "https://example.com"],
    ] {
        let server = Server::new(Scenario::Success);
        let (output, _) = run(&server, &flags);
        assert!(!output.status.success());
        assert!(server.methods().is_empty());
    }
}

#[test]
fn tolerance_flag_checks_actual_thresholds() {
    for (scenario, flags, success) in [
        (Scenario::NumericNear, vec![], true),
        (Scenario::NumericFar, vec![], false),
        (
            Scenario::NumericNear,
            vec!["--numeric-tolerance", "0"],
            false,
        ),
        (
            Scenario::NumericFar,
            vec!["--numeric-tolerance", "0.000003"],
            true,
        ),
    ] {
        let server = Server::new(scenario);
        let (output, _) = run(&server, &flags);
        assert_eq!(
            output.status.success(),
            success,
            "{}",
            String::from_utf8_lossy(&output.stderr)
        );
        assert_eq!(server.methods(), ["GET", "GET", "POST", "GET"]);
    }
}

#[test]
fn prior_reports_are_not_reused_and_never_trigger_a_write() {
    let server = Server::new(Scenario::Success);
    let directory = tempfile::tempdir().unwrap();
    let tokens = directory.path().join("tokens");
    let reports = directory.path().join("reports");
    std::fs::create_dir(&tokens).unwrap();
    std::fs::create_dir(&reports).unwrap();
    std::fs::write(
        tokens.join("typography.json"),
        json!({
            "line-height-100":{"$schema":"https://example.com/multiplier.json","value":1.7}
        })
        .to_string(),
    )
    .unwrap();
    std::fs::write(reports.join("readback.json"), "previous report").unwrap();
    let output = Command::cargo_bin("design-data")
        .unwrap()
        .timeout(Duration::from_secs(20))
        .args(["figma", "export"])
        .arg(tokens)
        .args([
            "--file-key",
            "offline-file",
            "--token",
            "credential-sentinel",
        ])
        .env("FIGMA_API_BASE_URL", &server.url)
        .arg("--verification-out")
        .arg(&reports)
        .output()
        .unwrap();
    assert!(!output.status.success());
    assert!(String::from_utf8_lossy(&output.stderr).contains("fresh directory"));
    assert_eq!(server.methods(), ["GET"]);
    assert_eq!(
        std::fs::read_to_string(reports.join("readback.json")).unwrap(),
        "previous report"
    );
}
