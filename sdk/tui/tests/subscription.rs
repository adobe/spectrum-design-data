// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! Identity-keyed subscription tests (GH #1022).
//!
//! Time is injected as `Instant` values so the interval pacing is fully
//! deterministic — no sleeping or wall-clock flakiness.

use std::time::Instant;

use design_data_tui::subscription::TICK_INTERVAL;
use design_data_tui::{subscriptions, Message, Model, SubscriptionId, Subscriptions};

#[test]
fn tick_subscription_fires_once_per_interval() {
    let mut subs: Subscriptions<Message> = Subscriptions::new();
    let start = Instant::now();
    subs.diff(subscriptions(&Model::new()), start);

    // Immediately after starting: the interval has not elapsed yet.
    assert!(
        subs.poll(start).is_empty(),
        "tick must not fire before one interval elapses"
    );

    // Exactly one interval later: exactly one Tick.
    let t1 = start + TICK_INTERVAL;
    let fired = subs.poll(t1);
    assert_eq!(fired.len(), 1, "exactly one tick per interval");
    assert!(
        matches!(fired[0], Message::Tick),
        "the tick emits Message::Tick"
    );

    // Polling again at the same instant must not double-fire.
    assert!(
        subs.poll(t1).is_empty(),
        "tick must fire once per interval, not repeatedly"
    );

    // The next interval fires exactly once more.
    let t2 = t1 + TICK_INTERVAL;
    assert_eq!(subs.poll(t2).len(), 1, "one tick on the next interval");
}

#[test]
fn diff_starts_and_stops_streams_by_identity() {
    let mut subs: Subscriptions<Message> = Subscriptions::new();
    let now = Instant::now();

    // The default subscription set starts a single Tick stream.
    subs.diff(subscriptions(&Model::new()), now);
    assert_eq!(subs.active_ids(), vec![SubscriptionId::Tick]);

    // Re-diffing the same set keeps it active (no duplicates).
    subs.diff(subscriptions(&Model::new()), now);
    assert_eq!(subs.active_ids(), vec![SubscriptionId::Tick]);

    // An empty desired set stops the stream.
    subs.diff(Vec::new(), now);
    assert!(subs.active_ids().is_empty(), "vanished id stops its stream");
}

#[test]
fn next_timeout_counts_down_within_the_interval() {
    let mut subs: Subscriptions<Message> = Subscriptions::new();
    let start = Instant::now();
    subs.diff(subscriptions(&Model::new()), start);

    // At start the full interval remains.
    assert_eq!(subs.next_timeout(start), Some(TICK_INTERVAL));

    // Halfway through, roughly half remains (and never exceeds the interval).
    let half = start + TICK_INTERVAL / 2;
    let remaining = subs.next_timeout(half).expect("active tick");
    assert!(remaining <= TICK_INTERVAL);
    assert!(remaining <= TICK_INTERVAL / 2 + std::time::Duration::from_millis(1));

    // With no active subscriptions there is no timeout.
    subs.diff(Vec::new(), half);
    assert_eq!(subs.next_timeout(half), None);
}
