# ADR 0001: Private database boundary by default

- Status: Accepted
- Date: 2026-07-25

## Context

The replacement architecture routes business-data writes through the Rust API. The first Supabase migration must establish a safe boundary without guessing the legacy business schema or exposing placeholder tables through the Supabase Data API.

Supabase Data API access is controlled by both PostgreSQL grants and row-level security. Objects in an unexposed schema add a separate boundary, while objects created in an exposed schema can receive default privileges depending on project age and platform configuration.

## Decision

- Put internal business tables and helper functions in the `private` schema by default.
- Do not grant `anon`, `authenticated`, or `service_role` access to that schema.
- Revoke automatic Data API privileges for future tables, functions, and sequences created by `postgres` in `public`.
- Expose a `public` object only in a reviewed migration that adds the minimum grants and RLS policies together with allowed and denied tests.
- Keep Supabase-managed `auth` and `storage` schemas outside this decision.

## Consequences

The database starts closed by default. A feature that needs the Data API requires explicit work, but its exposed surface is easy to audit. The Rust application's dedicated database role and grants will be defined with the first persistence-backed vertical slice.

No legacy rows or personal data are introduced by this migration.

## Validation and recovery

`mise run check:db` rebuilds the local database, runs pgTAP boundary tests, and lints the resulting schema. The tests create probe objects inside a transaction to confirm that future `public` objects do not inherit Data API privileges.

Before this migration reaches a shared remote environment, it can be removed by dropping the empty local database and replaying the remaining migrations. After remote application, recovery must use a new forward migration that restores only the explicitly approved default privileges. The `private` schema may be dropped only after verifying that it is empty.

---

本文書は [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) の下で提供されます。
