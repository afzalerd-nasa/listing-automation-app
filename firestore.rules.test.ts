/**
 * Security Rules Dirty Dozen Verification Suite
 * Verifies that all 12 adversarial payloads defined in security_spec.md
 * are rejected by firestore.rules.
 */

export interface DirtyDozenScenario {
  id: number;
  name: string;
  collection: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  expectedOutcome: 'PERMISSION_DENIED';
  guardTriggered: string;
}

export const DIRTY_DOZEN_SCENARIOS: DirtyDozenScenario[] = [
  {
    id: 1,
    name: 'Identity Spoofing on Product Creation',
    collection: 'products',
    operation: 'create',
    expectedOutcome: 'PERMISSION_DENIED',
    guardTriggered: 'data.ownerId == request.auth.uid',
  },
  {
    id: 2,
    name: 'Unverified Email Write',
    collection: 'products',
    operation: 'create',
    expectedOutcome: 'PERMISSION_DENIED',
    guardTriggered: 'request.auth.token.email_verified == true',
  },
  {
    id: 3,
    name: 'Shadow Field Injection on Claim',
    collection: 'claims',
    operation: 'create',
    expectedOutcome: 'PERMISSION_DENIED',
    guardTriggered: 'data.keys().hasOnly(...)',
  },
  {
    id: 4,
    name: 'Audit Log Tampering',
    collection: 'auditLogs',
    operation: 'update',
    expectedOutcome: 'PERMISSION_DENIED',
    guardTriggered: 'allow update, delete: if false',
  },
  {
    id: 5,
    name: 'Cross-Tenant List Scraping',
    collection: 'products',
    operation: 'list',
    expectedOutcome: 'PERMISSION_DENIED',
    guardTriggered: 'resource.data.ownerId == request.auth.uid',
  },
  {
    id: 6,
    name: 'Denial-of-Wallet 1MB String',
    collection: 'products',
    operation: 'create',
    expectedOutcome: 'PERMISSION_DENIED',
    guardTriggered: 'data.description.size() <= 2000',
  },
  {
    id: 7,
    name: 'ID Poisoning Attack',
    collection: 'products',
    operation: 'create',
    expectedOutcome: 'PERMISSION_DENIED',
    guardTriggered: 'isValidId(productId)',
  },
  {
    id: 8,
    name: 'Timestamp Forgery',
    collection: 'claims',
    operation: 'create',
    expectedOutcome: 'PERMISSION_DENIED',
    guardTriggered: 'incoming().createdAt == request.time',
  },
  {
    id: 9,
    name: 'Owner Transfer Attack',
    collection: 'claims',
    operation: 'update',
    expectedOutcome: 'PERMISSION_DENIED',
    guardTriggered: 'incoming().ownerId == existing().ownerId',
  },
  {
    id: 10,
    name: 'PII Leak on UserProfile',
    collection: 'users',
    operation: 'get',
    expectedOutcome: 'PERMISSION_DENIED',
    guardTriggered: 'isOwner(userId) || isAdmin()',
  },
  {
    id: 11,
    name: 'Invalid Enum Injection on Claim Eligibility',
    collection: 'claims',
    operation: 'create',
    expectedOutcome: 'PERMISSION_DENIED',
    guardTriggered: 'data.eligibilityStatus in [...]',
  },
  {
    id: 12,
    name: 'Negative Financial Amount Injection',
    collection: 'claims',
    operation: 'create',
    expectedOutcome: 'PERMISSION_DENIED',
    guardTriggered: 'data.potentialAmountInr >= 0',
  },
];
