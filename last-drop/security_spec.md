# Firestore Security Specification

## 1. Data Invariants
1. A `UserAccount` document at `/users/{userId}` can only be read, created, or updated by the authenticated owner whose `request.auth.uid == userId` and `request.auth.token.email_verified == true`.
2. `UserAccount.uid` and `UserAccount.tagId` (`^#[0-9]{4}$`) and `UserAccount.createdAt` are immutable after creation.
3. On creation of `/users/{userId}`, a matching `/accountTags/{tagCode}` document must be atomically claimed (`existsAfter`) where `tagCode` matches the 4 digits of `tagId` (`'#' + tagCode == incoming().tagId`), preventing duplicate `#XXXX` IDs across accounts.
4. `AccountTagClaim` documents at `/accountTags/{tagCode}` cannot be updated or deleted once created, and cannot be listed to prevent user enumeration.
5. Every string, list, and map field in `UserAccount` enforces strict type, key allowlisting (`hasOnly`), and bounded size checks (`displayName <= 24`, `ownedCosmetics.size() <= 64`, `sk.size() <= 20`).
6. Timestamps `createdAt` and `updatedAt` must equal `request.time`.

## 2. Dirty Dozen Adversarial Payloads
1. **Unauthenticated read/write**: `request.auth == null` reading `/users/abc` -> DENIED.
2. **Unverified email write**: `request.auth.token.email_verified == false` creating `/users/{uid}` -> DENIED.
3. **Cross-user profile read**: User A reading `/users/userB` -> DENIED.
4. **Cross-user profile write**: User A writing `/users/userB` with `uid: "userB"` -> DENIED.
5. **Identity spoofing**: User A creating `/users/userA` with `uid: "userB"` -> DENIED.
6. **Shadow / ghost field injection**: Creating `/users/userA` with an extra key `isAdmin: true` -> DENIED (`hasOnly`).
7. **Immutable tagId tampering**: Updating `/users/userA` to change `tagId` from `#0192` to `#0001` -> DENIED.
8. **Invalid tagId format**: Creating `/users/userA` with `tagId: "ADMIN"` -> DENIED (`matches('^#[0-9]{4}$')`).
9. **Oversized array DoW attack**: Updating `ownedCosmetics` with 200 strings -> DENIED (`size() <= 64`).
10. **Client-forged timestamp**: Creating or updating with a client-supplied past/future timestamp instead of `request.time` -> DENIED.
11. **Orphaned user without unique tag claim**: Creating `/users/userA` without atomically creating `/accountTags/{tagCode}` -> DENIED (`existsAfter`).
12. **Collection list scraping**: Calling `getDocs(collection(db, 'users'))` or `getDocs(collection(db, 'accountTags'))` -> DENIED (`allow list: if false`).
