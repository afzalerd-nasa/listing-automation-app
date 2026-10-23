# Security Specification — afzal Listing Automation

## 1. Data Invariants
1. **Strict Tenant Isolation**: Every document in `/products`, `/listingErrors`, `/claims`, `/claimEvidence`, `/bulkJobs`, `/spApiConnections`, and `/auditLogs` is owned by a single authenticated seller tenant (`ownerId == request.auth.uid`), or accessible by a verified Administrator (`afzalerd@gmail.com` or `/admins/{uid}`).
2. **Verified Identity**: All writes require `request.auth != null` and `request.auth.token.email_verified == true`.
3. **Immutable Ownership & Creation Timestamps**: `ownerId` and `createdAt` can never be mutated during an `update` operation (`incoming().ownerId == existing().ownerId && incoming().createdAt == existing().createdAt`).
4. **Server Timestamp Enforcement**: All `createdAt` and `updatedAt` fields must equal `request.time`.
5. **Audit Log Immutability**: Documents in `/auditLogs/{logId}` are append-only (`allow update, delete: if false;`).
6. **Strict Schema & Key Whitelisting**: Every entity helper (`isValidUserProfile`, `isValidProduct`, `isValidListingError`, `isValidClaim`, `isValidClaimEvidence`, `isValidBulkJob`, `isValidSpApiConnection`, `isValidAuditLog`) enforces `hasAll` and `hasOnly` key checks, string `.size()` bounds, and valid enum values.

## 2. The "Dirty Dozen" Payloads
1. **Identity Spoofing on Product Creation**: `{ "ownerId": "other-seller-uid", "sku": "SKU-1", ... }` -> Rejected by `incoming().ownerId == request.auth.uid`.
2. **Unverified Email Write**: Authenticated request with `email_verified: false` -> Rejected by `isVerifiedUser()`.
3. **Shadow Field Injection on Claim**: Adding `"isAutoApproved": true` to `/claims/{claimId}` -> Rejected by `data.keys().hasOnly(...)`.
4. **Audit Log Tampering**: Updating or deleting an existing `/auditLogs/{logId}` -> Rejected by `allow update, delete: if false`.
5. **Cross-Tenant List Scraping**: Querying `/products` without `where('ownerId', '==', uid)` -> Rejected by `allow list: if isSignedIn() && resource.data.ownerId == request.auth.uid`.
6. **Denial-of-Wallet 1MB String**: Sending a 50,000-character string in `Product.description` -> Rejected by `data.description.size() <= 2000`.
7. **ID Poisoning**: Creating `/products/invalid$id!with*spaces` -> Rejected by `isValidId(productId)`.
8. **Timestamp Forgery**: Setting `createdAt` to a past timestamp instead of `request.time` -> Rejected by `incoming().createdAt == request.time`.
9. **Owner Transfer Attack**: Updating `ownerId` on an existing `/claims/{claimId}` -> Rejected by `incoming().ownerId == existing().ownerId`.
10. **PII Leak on UserProfile**: Reading `/users/{otherUid}` as a non-admin -> Rejected by `isOwner(userId) || isAdmin()`.
11. **Invalid Enum Injection**: Setting `Claim.eligibilityStatus` to `"Guaranteed"` -> Rejected by enum allowlist check.
12. **Negative Financial Amount**: Setting `Claim.potentialAmountInr` to `-5000` -> Rejected by `data.potentialAmountInr >= 0`.
