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

#[test]
fn poll_exactly_at_interval_boundary_fires_exactly_once() {
    // Verify that polling exactly at the boundary (not past it) still fires.
    let mut subs: Subscriptions<Message> = Subscriptions::new();
    let start = Instant::now();
    subs.diff(subscriptions(&Model::new()), start);

    // Exactly one interval later.
    let at_boundary = start + TICK_INTERVAL;
    let fired = subs.poll(at_boundary);
    assert_eq!(
        fired.len(),
        1,
        "poll at the exact boundary should fire once"
    );

    // Polling again immediately must not re-fire (no double-fire).
    let immediate_repeat = subs.poll(at_boundary);
    assert!(
        immediate_repeat.is_empty(),
        "polling again at the same instant must not re-fire"
    );
}

#[test]
fn empty_subscriptions_next_timeout_is_none() {
    let subs: Subscriptions<Message> = Subscriptions::new();
    assert_eq!(
        subs.next_timeout(Instant::now()),
        None,
        "no subscriptions → no timeout"
    );
}

#[test]
fn diff_with_same_set_preserves_timer() {
    // Re-diffing with the same desired id-set must *not* reset the clock.
    // `diff()` only starts clocks for newly-added ids; existing ids keep their
    // existing clock so pacing is uninterrupted (see subscription.rs `diff` doc).
    // Here we start a tick subscription, advance almost to the boundary, diff
    // again with the same set, and assert the timer is still near expiry — not
    // reset to a fresh full interval.
    let mut subs: Subscriptions<Message> = Subscriptions::new();
    let start = Instant::now();
    subs.diff(subscriptions(&Model::new()), start);

    // Almost at the boundary — re-diff before it fires.
    let almost = start + TICK_INTERVAL - std::time::Duration::from_millis(1);
    subs.diff(subscriptions(&Model::new()), almost); // same desired set — timer preserved

    // The timeout at `almost` should be at most 1 ms (almost at boundary).
    let remaining = subs.next_timeout(almost).expect("still active");
    assert!(
        remaining <= std::time::Duration::from_millis(2),
        "timer should be near expiry: {remaining:?}"
    );
}

#[test]
fn subscription_poll_does_not_emit_before_interval_elapses() {
    // If poll is called repeatedly before the interval, nothing fires.
    let mut subs: Subscriptions<Message> = Subscriptions::new();
    let start = Instant::now();
    subs.diff(subscriptions(&Model::new()), start);

    // Poll at sub-interval increments — no ticks should fire.
    let step = TICK_INTERVAL / 4;
    for i in 1..4u32 {
        let t = start + step * i;
        assert!(
            subs.poll(t).is_empty(),
            "tick must not fire before interval at step {i}"
        );
    }
}
