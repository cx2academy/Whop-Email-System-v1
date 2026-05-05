# Queues

This directory contains the email send queue abstraction.

## Architecture

The queue layer provides a provider-agnostic interface for scheduling and
processing email sends at volume. This decouples campaign dispatch from
the actual sending mechanism.

## Phase Roadmap

- **Phase 1 (current):** Directory scaffold and interface definitions only.
- **Phase 4:** Full queue implementation with:
  - Send queue abstraction (Resend primary / SMTP fallback)
  - Rate limiting and batch chunking
  - Retry logic with exponential backoff
  - Dead-letter handling
  - Idempotency keys to prevent duplicate sends

## Design Principles

- Queue entries are idempotent — resending the same `emailSendId` is a no-op if already sent
- Batch size and rate limits are configurable via env vars
- Queue is provider-agnostic — can be backed by pg-boss, BullMQ, or a simple
  DB polling loop in v1
