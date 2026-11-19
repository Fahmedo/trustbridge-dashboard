# Maintainer Conflicts

Registration conflicts are recorded when two users attempt to claim the same
Stellar address. They block honest contributors from payouts, so maintainers
need a deterministic, paged view before deciding who owns the wallet.

---

## List API contract

`GET /api/maintainer/conflicts`

| Query param | Default | Rule |
| --- | --- | --- |
| `page` | `1` | Positive integer; invalid or `0` falls back to `1`. |
| `pageSize` | `25` | Positive integer clamped to `100`; invalid values fall back to `25`. |

The session and maintainer-org checks are unchanged: unauthenticated requests
get `401`, non-maintainers get `403`, and results stay scoped to
`session.user.maintainerOrgId`.

```json
{
  "conflicts": [
    {
      "id": "conflict-a",
      "attemptedAddress": "G…",
      "attemptedUserId": "user-alice",
      "existingUserId": "user-bob",
      "createdAt": "2026-11-10T09:00:00.000Z",
      "maintainerOrgId": "org-demo"
    }
  ],
  "pagination": { "page": 1, "pageSize": 25, "total": 4, "totalPages": 1 }
}
```

**Ordering is stable**: `createdAt` descending, then `id` ascending as a
tie-breaker. Two claims recorded in the same millisecond therefore appear in
the same order on every page. A page past the end is an empty `conflicts` array
with the same pagination metadata, not an error.

The canonical scenarios are in the non-test fixture module
`tests/fixtures/maintainer-conflict-fixtures.ts`: `TWO_USERS_ONE_WALLET`,
`CONFLICT_FIXTURES`, `EXPECTED_STABLE_ORDER`, and
`CONFLICT_PAGINATION_CASES`.

---

## Two users, one wallet — resolution workflow

1. **List the conflicts.** Start with `GET /api/maintainer/conflicts` and page
   through with `page` / `pageSize`; do not rely on insertion order from the
   database.
2. **Identify the claimants.** Resolve `attemptedUserId` and `existingUserId`
   in the contributor table, and note the shared `attemptedAddress`.
3. **Verify ownership out of band.** Use the existing Freighter signed proof /
   readiness flow with the claimed address. Never decide ownership from the
   address string or registration timestamp alone.
4. **Apply the existing remedy.** Ask the losing claimant to register a
   different address. If a claim is abusive, use the documented maintainer ban
   endpoint with a mandatory reason. There is **no** conflict-resolution
   endpoint today — do not hand-edit `RegistrationConflict.resolved` without a
   matching audit record.
5. **Record the decision** in the team's incident/audit record with the
   conflict `id`, the owner's user id, and the evidence used.
6. **Re-list** the same page to confirm the state visible to maintainers is
   consistent with the decision.

---

## Failure modes

| Symptom | Action |
| --- | --- |
| Same conflict appears on two pages | Check that the caller is using the documented `createdAt DESC, id ASC` order; duplicate rows with different ids are separate claims. |
| `403` from the list endpoint | The session user is not a maintainer in the requested org; re-authenticate with the correct org account. |
| Empty page with `total > 0` | `page` exceeds `totalPages`; clamp to the reported `totalPages`. |
| Conflicting results across orgs | Org scoping is intentional; query with the correct maintainer org, never by omitting the scope. |
