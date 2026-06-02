# Copyright 2026 Adobe. All rights reserved.
# This file is licensed to you under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License. You may obtain a copy
# of the License at http://www.apache.org/licenses/LICENSE-2.0
#
# Clean-room image for Demo A, B, C automation.
# Demo D CANNOT run in this container (requires host Claude auth + MCP + network).
#
# Build context: repo root (so the full source tree is available).
# Typical use: auto-demo.sh handles docker build/run automatically with --docker.
#
# Manual use:
#   docker build -t spectrum-design-data-demo -f tools/demo/auto/Dockerfile .
#   docker run --rm -v "$(pwd):/workspace:rw" spectrum-design-data-demo \
#     bash /workspace/tools/demo/auto/auto-demo.sh C --verify

FROM rust:1.82-slim AS builder

RUN apt-get update && apt-get install -y --no-install-recommends \
      pkg-config \
      libssl-dev \
      ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /workspace

# Pre-cache dependencies by copying manifests first.
COPY sdk/Cargo.toml sdk/Cargo.lock* ./sdk/
COPY sdk/crates/ ./sdk/crates/ 2>/dev/null || true

# Build the design-data CLI in release mode.
COPY sdk/ ./sdk/
RUN cargo build -p design-data-cli --release --manifest-path sdk/Cargo.toml

# ─── runtime image ────────────────────────────────────────────────────────────

FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
      bash \
      python3 \
      curl \
      ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install rmux (tmux-compatible fork) — needed to drive PTY sessions.
# Pin to a known version; the binary is statically linked.
ARG RMUX_VERSION=0.3.1
RUN curl -fsSL "https://github.com/Helvesec/rmux/releases/download/v${RMUX_VERSION}/rmux-x86_64-unknown-linux-musl.tar.gz" \
    | tar -xz -C /usr/local/bin/ \
    || (echo "rmux download failed — falling back to tmux" && \
        apt-get update && apt-get install -y --no-install-recommends tmux && \
        ln -s /usr/bin/tmux /usr/local/bin/rmux) \
    && chmod +x /usr/local/bin/rmux

# Install asciinema (for record mode).
RUN curl -fsSL https://github.com/asciinema/asciinema/releases/download/v3.0.0/asciinema-x86_64-unknown-linux-gnu.tar.gz \
    | tar -xz -C /usr/local/bin/ \
    || pip3 install asciinema \
    || apt-get install -y --no-install-recommends asciinema

# Copy the built CLI.
COPY --from=builder /workspace/sdk/target/release/design-data /usr/local/bin/design-data

# The repo is bind-mounted at /workspace at runtime, so we don't COPY it here.
# This keeps the image small and always reflects the current working tree.
WORKDIR /workspace

ENTRYPOINT ["/bin/bash"]
