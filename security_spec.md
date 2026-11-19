# Security Specification — LM3D Consignados

## 1. Data Invariants

1. **Master Owner Isolation**: Every document in `/users/{userId}` and its subcollections (`pdvs`, `produtos`, `acertos`, `inventarios`) belongs strictly to `userId` (`ownerId == userId == request.auth.uid`). No cross-user read, list, write, or delete is permitted.
2. **Verified Email Requirement**: All authenticated write operations and private data reads require `request.auth != null && request.auth.token.email_verified == true`.
3. **Path-ID & Field-ID Consistency**: Every document ID (`{pdvId}`, `{produtoId}`, `{acertoId}`, `{inventarioId}`, `{userId}`) must match `^[a-zA-Z0-9_\-]+$` (1–128 chars) and equal `incoming().id` (or `incoming().uid` for user profile).
4. **Immutability**: `ownerId` (or `uid`), `id`, and `createdAt` cannot be modified after creation.
5. **Server Timestamp Integrity**: `createdAt == request.time` on `create`, and `updatedAt == request.time` on both `create` and `update`.
6. **Strict Schema & No Ghost Fields**: Every `create` checks `keys().hasAll(...) && keys().hasOnly(...)`; every `update` begins with `isValid[Entity]` and constrains changed keys with `incoming().diff(existing()).affectedKeys().hasOnly(...)`.
7. **Bounded Strings & Arrays**: All strings enforce `.size() <= MAX` and all arrays enforce `.size() <= MAX` plus element type verification on index 0 when non-empty.
8. **Secure List Queries**: `allow list` never delegates filtering to the client alone; it explicitly enforces `resource.data.ownerId == request.auth.uid` (and `request.auth.uid == userId`) without `get()` or `exists()` lookups.

## 2. The "Dirty Dozen" Attack Payloads

1. **Unauthenticated Read/Write**: `request.auth == null` reading `/users/u1/pdvs/pdv-1` -> `PERMISSION_DENIED`.
2. **Unverified Email Spoof**: `request.auth.token.email_verified == false` attempting to create `/users/u1` or `/users/u1/pdvs/pdv-1` -> `PERMISSION_DENIED`.
3. **Cross-Tenant Access**: User `u2` attempting `get`, `list`, `create`, `update`, or `delete` under `/users/u1/pdvs` -> `PERMISSION_DENIED`.
4. **Owner Spoofing**: User `u1` creating `/users/u1/pdvs/pdv-1` with `{ "ownerId": "u2", ... }` -> `PERMISSION_DENIED`.
5. **Ghost / Shadow Field Injection**: User `u1` sending `{ ..., "isAdmin": true }` or `{ ..., "role": "superadmin" }` on create or update -> `PERMISSION_DENIED`.
6. **Poisoned Document ID**: User `u1` creating `/users/u1/pdvs/pdv$bad!id` or a >128-char ID -> `PERMISSION_DENIED`.
7. **Document ID Mismatch**: User `u1` creating `/users/u1/pdvs/pdv-1` with `{ "id": "pdv-999", ... }` -> `PERMISSION_DENIED`.
8. **Forged Timestamp**: User `u1` creating a product with `createdAt` or `updatedAt` set to a client-forged timestamp != `request.time` -> `PERMISSION_DENIED`.
9. **Immutable Field Mutation**: User `u1` updating `/users/u1/produtos/prod-1` attempting to mutate `createdAt`, `id`, or `ownerId` -> `PERMISSION_DENIED`.
10. **Value / Type Poisoning**: User `u1` updating `nomeLoja` to `12345` (number), negative `estoqueAtelie: -5`, or a 2000-char string in `nomeLoja` -> `PERMISSION_DENIED`.
11. **Unbounded Array / Denial-of-Wallet**: User `u1` submitting `coresPopulares` with 25 items or `itensNoDisplay` with 205 items -> `PERMISSION_DENIED`.
12. **PII Leak via Blanket List**: Any user listing `/users` or listing `/users/u1/pdvs` without `request.auth.uid == 'u1'` -> `PERMISSION_DENIED`.
