export type UserRole = 'Administrator' | 'Seller' | 'Reviewer';

export type NavigationTab =
  | 'overview'
  | 'products'
  | 'generator'
  | 'bulk'
  | 'errors'
  | 'claims'
  | 'evidence'
  | 'connection'
  | 'reports'
  | 'audit'
  | 'settings';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  sellerAccountId: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface FieldProvenance {
  field: string;
  extractedValue: string;
  source: string;
  confidence: number;
  status: 'Verified' | 'Needs Review' | 'Conflict Detected';
}

export interface CatalogConflict {
  field: string;
  supplierValue: string;
  amazonCatalogValue: string;
  resolutionAdvice: string;
}

export interface ProductRecord {
  id: string;
  ownerId: string;
  sku: string;
  asin: string;
  gtin: string;
  title: string;
  brand: string;
  manufacturer: string;
  category: string;
  productType: string;
  bullets: string[];
  description: string;
  searchKeywords: string;
  modelNumber: string;
  partNumber: string;
  color: string;
  size: string;
  material: string;
  dimensions: string;
  weight: string;
  packageQuantity: number;
  includedAccessories: string;
  technicalSpecs: string;
  compatibility: string;
  countryOfOrigin: string;
  hsnCode: string;
  mrpInr: number;
  sellingPriceInr: number;
  inventoryCount: number;
  fulfilmentChannel: 'FBA' | 'Easy Ship' | 'Self-Ship';
  status:
    | 'Draft'
    | 'Needs Review'
    | 'Ready for Approval'
    | 'Approved'
    | 'Published (SP-API Verified)'
    | 'Submission Failed';
  spApiSubmissionId: string;
  spApiVerifiedAt: string;
  sourceSummary: string;
  confidenceScore: number;
  missingFieldsCount: number;
  conflictSummary: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface ListingErrorRecord {
  id: string;
  ownerId: string;
  productId: string;
  sku: string;
  asin: string;
  errorCode: string;
  severity: 'ERROR' | 'WARNING' | 'SUPPRESSED';
  issueType: string;
  amazonMessage: string;
  plainExplanation: string;
  fieldAffected: string;
  oldValue: string;
  proposedValue: string;
  status: 'Open' | 'Fix Proposed' | 'Approved' | 'Resolved (SP-API Verified)';
  spApiVerificationId: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface PolicyRule {
  id: string;
  policyName: string;
  officialSourceUrl: string;
  effectiveDate: string;
  reviewDate: string;
  eligibleFulfilmentMethods: ('FBA' | 'Easy Ship' | 'Self-Ship')[];
  eventConditions: string;
  requiredEvidence: string[];
  deadlineDays: number;
  exclusionConditions: string;
  reviewStatus: 'Verified Active Policy' | 'Policy Verification Required';
}

export interface ClaimRecord {
  id: string;
  ownerId: string;
  claimRef: string;
  claimType: string;
  fulfilmentMethod: 'FBA' | 'Easy Ship' | 'Self-Ship';
  orderId: string;
  asin: string;
  sku: string;
  fnsku: string;
  shipmentId: string;
  transactionId: string;
  eventDate: string;
  deadlineDate: string;
  policyRuleId: string;
  policyName: string;
  eligibilityStatus:
    | 'Potentially eligible'
    | 'Needs Review'
    | 'Not Eligible under current rules'
    | 'Policy Verification Required';
  potentialAmountInr: number;
  requestedAmountInr: number;
  approvedAmountInr: number;
  receivedAmountInr: number;
  workflowStatus:
    | 'Candidate'
    | 'Under Review'
    | 'Ready to Submit'
    | 'Submitted to Seller Central'
    | 'Reimbursement Confirmed'
    | 'Rejected';
  factualExplanation: string;
  requestedResolution: string;
  sellerAccuracyConfirmed: boolean;
  amazonCaseId: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface ClaimEvidenceRecord {
  id: string;
  ownerId: string;
  claimId: string;
  claimRef: string;
  documentType: string;
  fileName: string;
  referenceNumber: string;
  issueDate: string;
  extractedSummary: string;
  verifiedStatus: 'Verified' | 'Needs Review' | 'Missing Required Signature';
  createdAt?: any;
}

export interface BulkImportJobRecord {
  id: string;
  ownerId: string;
  fileName: string;
  totalRows: number;
  validRows: number;
  errorRows: number;
  duplicateSkus: number;
  status:
    | 'Validated'
    | 'Pending Approval'
    | 'Processing SP-API Feed'
    | 'Completed'
    | 'Partial Failure';
  spApiFeedId: string;
  rowSummary: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface SpApiConnectionRecord {
  ownerId: string;
  marketplaceId: string;
  marketplaceName: string;
  sellerId: string;
  mode: 'SANDBOX' | 'LIVE_PRODUCTION';
  connectionStatus:
    | 'Connected (Sandbox)'
    | 'Connected (Live SP-API)'
    | 'Token Expired'
    | 'Disconnected';
  lastSyncAt: string;
  activeRoles: string;
  updatedAt?: any;
}

export interface AuditLogRecord {
  id: string;
  ownerId: string;
  actorEmail: string;
  actorRole: string;
  action: string;
  module: string;
  targetId: string;
  details: string;
  verificationState:
    | 'AI Recommendation Only'
    | 'User Approved'
    | 'SP-API Verified'
    | 'Sandbox Simulated'
    | 'Failed';
  createdAt?: any;
}
