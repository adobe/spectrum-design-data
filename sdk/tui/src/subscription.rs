// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! Identity-keyed subscriptions (GH #1022), modeled on iced's `Subscription`.
//!
//! A [`Subscription`] declares an external event source the runtime should keep
//! alive while the application wants it. Each subscription carries a
//! [`SubscriptionId`]; the runtime diffs the desired set against the active set
//! every frame ([`Subscriptions::diff`]) so that:
//!
//! * a new id starts a fresh stream (its clock begins now), and
//! * a vanished id stops its stream.
//!
//! The only built-in source today is a periodic interval, used for the runtime
//! `Tick`. This replaces the hard-coded poll-timeout tick the event loop used
//! before: the tick is now just another subscription the runtime polls. Streams
//! are synchronous (no async runtime); time is supplied by the caller as an
//! [`Instant`], which keeps the runner fully deterministic in tests.

use std::time::{Duration, Instant};

use crate::message::Message;
use crate::model::Model;

/// The runtime tick cadence (~60 fps), used by the default [`subscriptions`].
pub const TICK_INTERVAL: Duration = Duration::from_millis(16);

/// How long a toast overlay stays visible before auto-dismissal.
pub const TOAST_DURATION: Duration = Duration::from_millis(3_000);

/// Stable identity for a subscription. Two subscriptions with the same id are
/// the "same" stream across frames; the runtime starts a stream when its id
/// first appears and stops it when the id disappears.
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum SubscriptionId {
    /// The periodic runtime tick that drives time-based updates.
    Tick,
    /// An application-defined subscription, distinguished by a static name.
    Named(&'static str),
}

/// The backing event source for a [`Subscription`].
enum Kind<M> {
    /// Emit a message every `interval`.
    Interval {
        interval: Duration,
        produce: Box<dyn Fn() -> M + Send>,
    },
}

/// A declarative external event source identified by a [`SubscriptionId`].
///
/// Returned from [`subscriptions`] (and, in principle, from `update`); the
/// runtime owns the lifecycle via [`Subscriptions`].
pub struct Subscription<M> {
    id: SubscriptionId,
    kind: Kind<M>,
}

impl<M> Subscription<M> {
    /// A subscription that emits `produce()` once every `interval`.
    pub fn interval(
        id: SubscriptionId,
        interval: Duration,
        produce: impl Fn() -> M + Send + 'static,
    ) -> Self {
        Self {
            id,
            kind: Kind::Interval {
                interval,
                produce: Box::new(produce),
            },
        }
    }

    /// This subscription's identity.
    pub fn id(&self) -> &SubscriptionId {
        &self.id
    }
}

/// An active subscription plus the bookkeeping the runner needs to pace it.
struct Active<M> {
    sub: Subscription<M>,
    last_fired: Instant,
}

/// The runtime's set of running subscriptions, reconciled each frame.
pub struct Subscriptions<M> {
    active: Vec<Active<M>>,
}

impl<M> Default for Subscriptions<M> {
    fn default() -> Self {
        Self::new()
    }
}

impl<M> Subscriptions<M> {
    pub fn new() -> Self {
        Self { active: Vec::new() }
    }

    /// Reconcile the active set with the `desired` set, keyed by identity.
    ///
    /// Ids present in `desired` but not yet active are started (their clock
    /// begins at `now`); active ids absent from `desired` are stopped; ids in
    /// both keep their existing clock so pacing is uninterrupted.
    pub fn diff(&mut self, desired: Vec<Subscription<M>>, now: Instant) {
        self.active
            .retain(|a| desired.iter().any(|s| s.id() == a.sub.id()));
        for sub in desired {
            if !self.active.iter().any(|a| a.sub.id() == sub.id()) {
                self.active.push(Active {
                    sub,
                    last_fired: now,
                });
            }
        }
    }

    /// Time until the soonest subscription is due, or `None` when there are no
    /// active subscriptions. Useful as an event-poll timeout.
    pub fn next_timeout(&self, now: Instant) -> Option<Duration> {
        self.active
            .iter()
            .map(|a| match &a.sub.kind {
                Kind::Interval { interval, .. } => {
                    interval.saturating_sub(now.saturating_duration_since(a.last_fired))
                }
            })
            .min()
    }

    /// Emit a message for every subscription whose interval has elapsed by
    /// `now`, advancing each fired subscription's clock.
    ///
    /// Note: a fired subscription's clock is reset with `last_fired = now`
    /// rather than `last_fired += interval`, so missed intervals are *not*
    /// caught up — at most one message fires per `poll`, no matter how far
    /// behind we are. This intentionally avoids burst/replay under load and is
    /// the right behavior for the ~16ms UI tick. A future subscription that
    /// needs precise cadence (e.g. exact beats over time) would need the
    /// accumulating `last_fired += interval` variant instead.
    pub fn poll(&mut self, now: Instant) -> Vec<M> {
        let mut out = Vec::new();
        for a in &mut self.active {
            match &a.sub.kind {
                Kind::Interval { interval, produce } => {
                    if now.saturating_duration_since(a.last_fired) >= *interval {
                        out.push(produce());
                        a.last_fired = now;
                    }
                }
            }
        }
        out
    }

    /// The ids of all currently active subscriptions (order matches start order).
    pub fn active_ids(&self) -> Vec<SubscriptionId> {
        self.active.iter().map(|a| a.sub.id().clone()).collect()
    }
}

/// The subscriptions the runtime should keep active for `model`.
///
/// Returns at minimum a periodic [`SubscriptionId::Tick`]. When a toast is
/// active, a [`SubscriptionId::Named("toast")`] interval is added; it fires
/// at [`TOAST_DURATION`] cadence. In practice it behaves as a one-shot: the
/// first fire dispatches [`Message::ToastExpired`], which clears the toast,
/// so the next [`Subscriptions::diff`] removes the subscription before it
/// can fire a second time. The one-shot property is emergent — it relies on
/// `diff` being called after every message, which the runtime guarantees.
///
/// [`model.toast`]: crate::model::Model::toast
pub fn subscriptions(model: &Model) -> Vec<Subscription<Message>> {
    let mut subs = vec![Subscription::interval(
        SubscriptionId::Tick,
        TICK_INTERVAL,
        || Message::Tick,
    )];
    if model.toast().is_some() {
        subs.push(Subscription::interval(
            SubscriptionId::Named("toast"),
            TOAST_DURATION,
            || Message::ToastExpired,
        ));
    }
    subs
}
