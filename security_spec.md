# Security Specification & Threat Model — Atelier Loupe

## 1. Data Invariants
1. **PII Isolation**: User email addresses reside exclusively in `/users/{userId}` which is readable and writable only by `request.auth.uid == userId`. Public collections (`/profiles` and `/puzzleScores`) never store email, phone, or address fields.
2. **Verified Identity Binding**: Every create and update operation requires `request.auth != null` and `request.auth.token.email_verified == true`. All `uid` fields must equal `request.auth.uid` on creation and remain immutable on update.
3. **One Best Entry Per Puzzle**: `/puzzleScores/{scoreId}` enforces `scoreId == puzzleDate + '_' + request.auth.uid` so a player cannot flood a puzzle's leaderboard with duplicate entries.
4. **Monotonic Best Score & Strict Bounds**: Score, timeSeconds, accuracy, hintsUsed, mistakes, and stars are strictly bounded integers/numbers (`score >= 0 && score <= 25000`, `timeSeconds >= 1 && timeSeconds <= 86400`).
5. **Server Timestamp Integrity**: `createdAt` must equal `request.time` on creation and remain immutable on update; `updatedAt` must equal `request.time` on both creation and update.
6. **Master Gate on Subcollections**: `/users/{userId}/completions/{puzzleDate}` verifies the parent `/users/{userId}` exists via `exists()` and matches ownership.

## 2. The "Dirty Dozen" Adversarial Payloads (All Must Return PERMISSION_DENIED)
1. **Shadow Field Injection on Profile**: `{ uid, displayName: "Ace", ..., isAdmin: true }` -> Rejected by `keys().hasOnly(...)`.
2. **Identity Spoofing on Score**: Creating `/puzzleScores/2026-11-17_victim` as `attacker` -> Rejected by `scoreId == puzzleDate + '_' + request.auth.uid` and `uid == request.auth.uid`.
3. **PII Leak Attempt**: Reading `/users/{otherUserId}` as an authenticated non-owner -> Rejected by `isOwner(userId)`.
4. **Unverified Email Write**: Creating a profile when `request.auth.token.email_verified == false` -> Rejected by `isVerifiedUser()`.
5. **Client Timestamp Forgery**: Creating a score with `createdAt: Timestamp(2020-01-01)` -> Rejected by `incoming().createdAt == request.time`.
6. **Immutable Field Mutation**: Updating `createdAt` or `uid` on an existing `/profiles/{userId}` -> Rejected by immutability checks and `affectedKeys().hasOnly(...)`.
7. **Oversized String Poisoning**: Sending a 500-char `displayName` or 5KB `motto` -> Rejected by `.size() <= 32` / `.size() <= 120`.
8. **Path ID Poisoning**: Creating `/users/{uid}/completions/../../hack` -> Rejected by `isValidPuzzleDate(puzzleDate)`.
9. **Score Inflation Beyond Cap**: Submitting `score: 9999999` -> Rejected by `score <= 25000`.
10. **Negative Time Exploit**: Submitting `timeSeconds: -5` -> Rejected by `timeSeconds >= 1`.
11. **Invalid Avatar Enum**: Submitting `avatarId: "<script>"` -> Rejected by allowlist `in [...]`.
12. **Private Flag Bypass on List**: Querying `/profiles` for `isPublic == false` documents -> Rejected by `resource.data.isPublic == true || isOwner(userId)`.
