import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import {
  UserProfile,
  UserRole,
  ProductRecord,
  ListingErrorRecord,
  ClaimRecord,
  ClaimEvidenceRecord,
  BulkImportJobRecord,
  SpApiConnectionRecord,
  AuditLogRecord,
} from '../types';

function clampStr(val: unknown, maxLen: number, fallback = ''): string {
  const str = typeof val === 'string' && val.trim().length > 0 ? val.trim() : fallback;
  return str.slice(0, maxLen);
}

function clampInt(val: unknown, min: number, max: number, fallback = 0): number {
  const num = typeof val === 'number' && !Number.isNaN(val) ? Math.round(val) : fallback;
  return Math.max(min, Math.min(max, num));
}

function clampNum(val: unknown, min = 0, fallback = 0): number {
  const num = typeof val === 'number' && !Number.isNaN(val) ? val : fallback;
  return Math.max(min, num);
}

function makeDocId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export async function ensureUserProfile(
  uid: string,
  email: string,
  displayName: string
): Promise<UserProfile> {
  const path = `users/${uid}`;
  try {
    const ref = doc(db, 'users', uid);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      return snap.data() as UserProfile;
    }
    const defaultRole: UserRole =
      email.toLowerCase() === 'afzalerd@gmail.com' ? 'Administrator' : 'Seller';
    const payload = {
      uid: clampStr(uid, 128),
      email: clampStr(email, 256, 'seller@amazon.in'),
      displayName: clampStr(displayName, 120, 'Amazon India Seller'),
      role: defaultRole,
      sellerAccountId: 'AMZN-IN-A21TJRUUN4KGV',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    await setDoc(ref, payload);
    return {
      ...payload,
      role: defaultRole,
    };
  } catch (err) {
    return handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function updateUserRole(uid: string, role: UserRole): Promise<void> {
  const path = `users/${uid}`;
  try {
    await updateDoc(doc(db, 'users', uid), {
      role,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function createAuditLog(
  ownerId: string,
  actorEmail: string,
  actorRole: string,
  action: string,
  module: string,
  targetId: string,
  details: string,
  verificationState: AuditLogRecord['verificationState']
): Promise<void> {
  const logId = makeDocId('log');
  const path = `auditLogs/${logId}`;
  try {
    await setDoc(doc(db, 'auditLogs', logId), {
      ownerId: clampStr(ownerId, 128),
      actorEmail: clampStr(actorEmail, 256, 'seller@amazon.in'),
      actorRole: clampStr(actorRole, 32, 'Seller'),
      action: clampStr(action, 120, 'System Action'),
      module: clampStr(module, 64, 'Catalog'),
      targetId: clampStr(targetId, 128, 'N/A'),
      details: clampStr(details, 1000, 'Action recorded.'),
      verificationState,
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function saveProductRecord(
  ownerId: string,
  input: Partial<ProductRecord>,
  existingId?: string
): Promise<string> {
  const id = existingId || makeDocId('prod');
  const path = `products/${id}`;
  const bullets = Array.isArray(input.bullets)
    ? input.bullets
        .filter((b) => typeof b === 'string' && b.trim().length > 0)
        .slice(0, 5)
        .map((b) => clampStr(b, 500))
    : [];

  const statusAllowed: ProductRecord['status'][] = [
    'Draft',
    'Needs Review',
    'Ready for Approval',
    'Approved',
    'Published (SP-API Verified)',
    'Submission Failed',
  ];
  const status = statusAllowed.includes(input.status as any)
    ? (input.status as ProductRecord['status'])
    : 'Needs Review';

  const channelAllowed: ProductRecord['fulfilmentChannel'][] = ['FBA', 'Easy Ship', 'Self-Ship'];
  const fulfilmentChannel = channelAllowed.includes(input.fulfilmentChannel as any)
    ? (input.fulfilmentChannel as ProductRecord['fulfilmentChannel'])
    : 'FBA';

  try {
    if (existingId) {
      await updateDoc(doc(db, 'products', existingId), {
        sku: clampStr(input.sku, 64, 'AFZ-SKU-001'),
        asin: clampStr(input.asin, 32, 'Pending ASIN'),
        gtin: clampStr(input.gtin, 32, 'Needs Review'),
        title: clampStr(input.title, 250, 'Untitled Amazon.in Product'),
        brand: clampStr(input.brand, 100, 'Needs Review'),
        manufacturer: clampStr(input.manufacturer, 120, 'Needs Review'),
        category: clampStr(input.category, 80, 'HOME_KITCHEN'),
        productType: clampStr(input.productType, 80, 'KITCHEN_APPLIANCE'),
        bullets,
        description: clampStr(input.description, 2000, 'Needs Review'),
        searchKeywords: clampStr(input.searchKeywords, 500, 'Needs Review'),
        modelNumber: clampStr(input.modelNumber, 80, 'Needs Review'),
        partNumber: clampStr(input.partNumber, 80, 'Needs Review'),
        color: clampStr(input.color, 64, 'Needs Review'),
        size: clampStr(input.size, 64, 'Needs Review'),
        material: clampStr(input.material, 100, 'Needs Review'),
        dimensions: clampStr(input.dimensions, 100, 'Needs Review'),
        weight: clampStr(input.weight, 64, 'Needs Review'),
        packageQuantity: clampInt(input.packageQuantity, 1, 10000, 1),
        includedAccessories: clampStr(input.includedAccessories, 300, 'Needs Review'),
        technicalSpecs: clampStr(input.technicalSpecs, 1000, 'Needs Review'),
        compatibility: clampStr(input.compatibility, 500, 'Standard'),
        countryOfOrigin: clampStr(input.countryOfOrigin, 64, 'Needs Review'),
        hsnCode: clampStr(input.hsnCode, 20, 'Needs Review'),
        mrpInr: clampNum(input.mrpInr, 0, 0),
        sellingPriceInr: clampNum(input.sellingPriceInr, 0, 0),
        inventoryCount: clampInt(input.inventoryCount, 0, 1000000, 25),
        fulfilmentChannel,
        status,
        spApiSubmissionId: clampStr(input.spApiSubmissionId, 128, 'Not Submitted'),
        spApiVerifiedAt: clampStr(input.spApiVerifiedAt, 64, 'Unverified'),
        sourceSummary: clampStr(input.sourceSummary, 300, 'Supplier Document + Manual Review'),
        confidenceScore: clampInt(input.confidenceScore, 0, 100, 88),
        missingFieldsCount: clampInt(input.missingFieldsCount, 0, 30, 0),
        conflictSummary: clampStr(input.conflictSummary, 500, 'None'),
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(doc(db, 'products', id), {
        ownerId: clampStr(ownerId, 128),
        sku: clampStr(input.sku, 64, 'AFZ-SKU-001'),
        asin: clampStr(input.asin, 32, 'Pending ASIN'),
        gtin: clampStr(input.gtin, 32, 'Needs Review'),
        title: clampStr(input.title, 250, 'Untitled Amazon.in Product'),
        brand: clampStr(input.brand, 100, 'Needs Review'),
        manufacturer: clampStr(input.manufacturer, 120, 'Needs Review'),
        category: clampStr(input.category, 80, 'HOME_KITCHEN'),
        productType: clampStr(input.productType, 80, 'KITCHEN_APPLIANCE'),
        bullets,
        description: clampStr(input.description, 2000, 'Needs Review'),
        searchKeywords: clampStr(input.searchKeywords, 500, 'Needs Review'),
        modelNumber: clampStr(input.modelNumber, 80, 'Needs Review'),
        partNumber: clampStr(input.partNumber, 80, 'Needs Review'),
        color: clampStr(input.color, 64, 'Needs Review'),
        size: clampStr(input.size, 64, 'Needs Review'),
        material: clampStr(input.material, 100, 'Needs Review'),
        dimensions: clampStr(input.dimensions, 100, 'Needs Review'),
        weight: clampStr(input.weight, 64, 'Needs Review'),
        packageQuantity: clampInt(input.packageQuantity, 1, 10000, 1),
        includedAccessories: clampStr(input.includedAccessories, 300, 'Needs Review'),
        technicalSpecs: clampStr(input.technicalSpecs, 1000, 'Needs Review'),
        compatibility: clampStr(input.compatibility, 500, 'Standard'),
        countryOfOrigin: clampStr(input.countryOfOrigin, 64, 'Needs Review'),
        hsnCode: clampStr(input.hsnCode, 20, 'Needs Review'),
        mrpInr: clampNum(input.mrpInr, 0, 0),
        sellingPriceInr: clampNum(input.sellingPriceInr, 0, 0),
        inventoryCount: clampInt(input.inventoryCount, 0, 1000000, 25),
        fulfilmentChannel,
        status,
        spApiSubmissionId: clampStr(input.spApiSubmissionId, 128, 'Not Submitted'),
        spApiVerifiedAt: clampStr(input.spApiVerifiedAt, 64, 'Unverified'),
        sourceSummary: clampStr(input.sourceSummary, 300, 'Supplier Document + Manual Review'),
        confidenceScore: clampInt(input.confidenceScore, 0, 100, 88),
        missingFieldsCount: clampInt(input.missingFieldsCount, 0, 30, 0),
        conflictSummary: clampStr(input.conflictSummary, 500, 'None'),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
    return id;
  } catch (err) {
    return handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function createListingErrorRecord(
  ownerId: string,
  input: Omit<ListingErrorRecord, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const id = makeDocId('err');
  const path = `listingErrors/${id}`;
  try {
    await setDoc(doc(db, 'listingErrors', id), {
      ownerId: clampStr(ownerId, 128),
      productId: clampStr(input.productId, 128, 'prod-ref'),
      sku: clampStr(input.sku, 64, 'AFZ-SKU-001'),
      asin: clampStr(input.asin, 32, 'B09X7K2IN1'),
      errorCode: clampStr(input.errorCode, 64, '90215'),
      severity: input.severity || 'ERROR',
      issueType: clampStr(input.issueType, 100, 'Missing Required Attribute'),
      amazonMessage: clampStr(input.amazonMessage, 1000, 'Attribute missing.'),
      plainExplanation: clampStr(input.plainExplanation, 1000, 'Explanation required.'),
      fieldAffected: clampStr(input.fieldAffected, 80, 'countryOfOrigin'),
      oldValue: clampStr(input.oldValue, 500, 'Needs Review'),
      proposedValue: clampStr(input.proposedValue, 500, 'India'),
      status: input.status || 'Fix Proposed',
      spApiVerificationId: clampStr(input.spApiVerificationId, 128, 'Pending'),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return id;
  } catch (err) {
    return handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function updateListingErrorStatus(
  errorId: string,
  proposedValue: string,
  status: ListingErrorRecord['status'],
  spApiVerificationId: string,
  plainExplanation: string
): Promise<void> {
  const path = `listingErrors/${errorId}`;
  try {
    await updateDoc(doc(db, 'listingErrors', errorId), {
      proposedValue: clampStr(proposedValue, 500, 'India'),
      status,
      spApiVerificationId: clampStr(spApiVerificationId, 128, 'Pending'),
      plainExplanation: clampStr(plainExplanation, 1000, 'Verified.'),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function createClaimRecord(
  ownerId: string,
  input: Omit<ClaimRecord, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const id = makeDocId('clm');
  const path = `claims/${id}`;
  try {
    await setDoc(doc(db, 'claims', id), {
      ownerId: clampStr(ownerId, 128),
      claimRef: clampStr(input.claimRef, 64, `CLM-IN-${Date.now().toString().slice(-5)}`),
      claimType: clampStr(input.claimType, 100, 'FBA Inventory Lost or Damaged'),
      fulfilmentMethod: input.fulfilmentMethod || 'FBA',
      orderId: clampStr(input.orderId, 64, 'N/A'),
      asin: clampStr(input.asin, 32, 'B09X7K2IN1'),
      sku: clampStr(input.sku, 64, 'AFZ-KITCH-FLASK-1000'),
      fnsku: clampStr(input.fnsku, 64, 'X001AFZFLK'),
      shipmentId: clampStr(input.shipmentId, 64, 'FBA15K992IN'),
      transactionId: clampStr(input.transactionId, 64, 'TXN-IN-88219'),
      eventDate: clampStr(input.eventDate, 32, '2026-10-05'),
      deadlineDate: clampStr(input.deadlineDate, 32, '2026-12-04'),
      policyRuleId: clampStr(input.policyRuleId, 64, 'POL-IN-FBA-LOST-01'),
      policyName: clampStr(
        input.policyName,
        160,
        'Amazon.in FBA Lost & Damaged Fulfillment Center Inventory Policy'
      ),
      eligibilityStatus: input.eligibilityStatus || 'Potentially eligible',
      potentialAmountInr: clampNum(input.potentialAmountInr, 0, 0),
      requestedAmountInr: clampNum(input.requestedAmountInr, 0, 0),
      approvedAmountInr: clampNum(input.approvedAmountInr, 0, 0),
      receivedAmountInr: clampNum(input.receivedAmountInr, 0, 0),
      workflowStatus: input.workflowStatus || 'Candidate',
      factualExplanation: clampStr(input.factualExplanation, 2000, 'Pending factual draft.'),
      requestedResolution: clampStr(input.requestedResolution, 500, 'Pending resolution request.'),
      sellerAccuracyConfirmed: Boolean(input.sellerAccuracyConfirmed),
      amazonCaseId: clampStr(input.amazonCaseId, 64, 'Not Submitted'),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return id;
  } catch (err) {
    return handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function updateClaimRecord(
  claimId: string,
  updates: {
    eligibilityStatus: ClaimRecord['eligibilityStatus'];
    potentialAmountInr: number;
    requestedAmountInr: number;
    approvedAmountInr: number;
    receivedAmountInr: number;
    workflowStatus: ClaimRecord['workflowStatus'];
    factualExplanation: string;
    requestedResolution: string;
    sellerAccuracyConfirmed: boolean;
    amazonCaseId: string;
  }
): Promise<void> {
  const path = `claims/${claimId}`;
  try {
    await updateDoc(doc(db, 'claims', claimId), {
      eligibilityStatus: updates.eligibilityStatus,
      potentialAmountInr: clampNum(updates.potentialAmountInr, 0, 0),
      requestedAmountInr: clampNum(updates.requestedAmountInr, 0, 0),
      approvedAmountInr: clampNum(updates.approvedAmountInr, 0, 0),
      receivedAmountInr: clampNum(updates.receivedAmountInr, 0, 0),
      workflowStatus: updates.workflowStatus,
      factualExplanation: clampStr(updates.factualExplanation, 2000, 'Factual explanation.'),
      requestedResolution: clampStr(updates.requestedResolution, 500, 'Requested resolution.'),
      sellerAccuracyConfirmed: Boolean(updates.sellerAccuracyConfirmed),
      amazonCaseId: clampStr(updates.amazonCaseId, 64, 'Not Submitted'),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function createClaimEvidenceRecord(
  ownerId: string,
  input: Omit<ClaimEvidenceRecord, 'id' | 'ownerId' | 'createdAt'>
): Promise<string> {
  const id = makeDocId('evd');
  const path = `claimEvidence/${id}`;
  try {
    await setDoc(doc(db, 'claimEvidence', id), {
      ownerId: clampStr(ownerId, 128),
      claimId: clampStr(input.claimId, 128, 'clm-default'),
      claimRef: clampStr(input.claimRef, 64, 'CLM-IN-001'),
      documentType: clampStr(input.documentType, 80, 'GST Tax Invoice'),
      fileName: clampStr(input.fileName, 160, 'invoice.pdf'),
      referenceNumber: clampStr(input.referenceNumber, 80, 'GST-INV-2026-01'),
      issueDate: clampStr(input.issueDate, 32, '2026-10-01'),
      extractedSummary: clampStr(input.extractedSummary, 500, 'Verified HSN & unit count.'),
      verifiedStatus: input.verifiedStatus || 'Verified',
      createdAt: serverTimestamp(),
    });
    return id;
  } catch (err) {
    return handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function createBulkImportJobRecord(
  ownerId: string,
  input: Omit<BulkImportJobRecord, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const id = makeDocId('job');
  const path = `bulkJobs/${id}`;
  try {
    await setDoc(doc(db, 'bulkJobs', id), {
      ownerId: clampStr(ownerId, 128),
      fileName: clampStr(input.fileName, 160, 'amazon_in_bulk_import.csv'),
      totalRows: clampInt(input.totalRows, 0, 100000, 0),
      validRows: clampInt(input.validRows, 0, 100000, 0),
      errorRows: clampInt(input.errorRows, 0, 100000, 0),
      duplicateSkus: clampInt(input.duplicateSkus, 0, 100000, 0),
      status: input.status || 'Validated',
      spApiFeedId: clampStr(input.spApiFeedId, 128, 'Pending Approval'),
      rowSummary: clampStr(input.rowSummary, 2000, 'Validated rows.'),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return id;
  } catch (err) {
    return handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function updateBulkImportJobStatus(
  jobId: string,
  status: BulkImportJobRecord['status'],
  spApiFeedId: string,
  rowSummary: string,
  validRows: number,
  errorRows: number
): Promise<void> {
  const path = `bulkJobs/${jobId}`;
  try {
    await updateDoc(doc(db, 'bulkJobs', jobId), {
      status,
      spApiFeedId: clampStr(spApiFeedId, 128, 'FEED-IN-01'),
      rowSummary: clampStr(rowSummary, 2000, 'Feed processed.'),
      validRows: clampInt(validRows, 0, 100000, 0),
      errorRows: clampInt(errorRows, 0, 100000, 0),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function saveSpApiConnection(
  ownerId: string,
  input: Omit<SpApiConnectionRecord, 'ownerId' | 'updatedAt'>
): Promise<void> {
  const path = `spApiConnections/${ownerId}`;
  try {
    const ref = doc(db, 'spApiConnections', ownerId);
    const snap = await getDoc(ref);
    const payload = {
      ownerId: clampStr(ownerId, 128),
      marketplaceId: clampStr(input.marketplaceId, 32, 'A21TJRUUN4KGV'),
      marketplaceName: clampStr(input.marketplaceName, 64, 'Amazon.in (India)'),
      sellerId: clampStr(input.sellerId, 64, 'A39AFZALSLLERIN'),
      mode: input.mode || 'SANDBOX',
      connectionStatus: input.connectionStatus || 'Connected (Sandbox)',
      lastSyncAt: clampStr(input.lastSyncAt, 64, new Date().toISOString()),
      activeRoles: clampStr(
        input.activeRoles,
        300,
        'Product Listing, Pricing, Inventory & Order Tracking, Finance & Accounting'
      ),
      updatedAt: serverTimestamp(),
    };
    if (snap.exists()) {
      await updateDoc(ref, {
        marketplaceId: payload.marketplaceId,
        marketplaceName: payload.marketplaceName,
        sellerId: payload.sellerId,
        mode: payload.mode,
        connectionStatus: payload.connectionStatus,
        lastSyncAt: payload.lastSyncAt,
        activeRoles: payload.activeRoles,
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(ref, payload);
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function deleteRecordById(collectionName: string, docId: string): Promise<void> {
  const path = `${collectionName}/${docId}`;
  try {
    await deleteDoc(doc(db, collectionName, docId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

// Seed realistic initial Amazon India seller workspace for a newly authenticated seller
export async function seedInitialWorkspaceData(
  ownerId: string,
  actorEmail: string,
  actorRole: string
): Promise<void> {
  const prod1Id = await saveProductRecord(ownerId, {
    sku: 'AFZ-KITCH-FLASK-1000',
    asin: 'B09X7K2IN1',
    gtin: '8901234567890',
    title:
      'Milton Thermosteel Flip Lid Flask 1000ml Stainless Steel Vacuum Insulated Bottle (Hot & Cold 24 Hrs)',
    brand: 'Milton',
    manufacturer: 'Hamilton Housewares Pvt. Ltd., Vapi, Gujarat',
    category: 'HOME_KITCHEN',
    productType: 'STORAGE_CONTAINER',
    bullets: [
      'Double-walled 304 food-grade stainless steel vacuum flask with inner copper coating for 24-hour temperature retention.',
      'Flip-lid leak-proof spout allows convenient one-handed pouring for travel, office, and kitchen use.',
      'Rust-free exterior in brushed silver finish; compact 10.5 x 10.5 x 31.5 cm profile fits standard backpack pockets.',
      'Includes 1 insulated 1000 ml flask, 1 nylon carrying pouch with strap, and user care leaflet.',
      'Manufactured in India under HSN 96170011 with Legal Metrology compliant MRP packaging.',
    ],
    description:
      'Engineered with 304 stainless steel and an internal copper heat-reflective layer, the Milton Thermosteel Flip Lid 1000ml Vacuum Flask keeps beverages hot or cold for up to 24 hours.',
    searchKeywords:
      'thermosteel water bottle 1 litre hot water flask steel bottle office gym travel milton 1000ml',
    modelNumber: 'TH-FLIP-1000-SLV',
    partNumber: 'MLT-1000-FLIP',
    color: 'Silver',
    size: '1000 ml',
    material: '304 Stainless Steel',
    dimensions: '10.5 x 10.5 x 31.5 cm',
    weight: '540 g',
    packageQuantity: 1,
    includedAccessories: '1 Insulated Flask, 1 Nylon Carrying Pouch, User Care Leaflet',
    technicalSpecs: '24 Hours Hot/Cold, 304 Grade Steel, Copper Coated Inner Wall',
    compatibility: 'Universal Beverage Storage',
    countryOfOrigin: 'India',
    hsnCode: '96170011',
    mrpInr: 1295,
    sellingPriceInr: 999,
    inventoryCount: 142,
    fulfilmentChannel: 'FBA',
    status: 'Published (SP-API Verified)',
    spApiSubmissionId: 'AMZN-IN-SUB-89021K',
    spApiVerifiedAt: '2026-10-22T14:20:00Z',
    sourceSummary: 'Amazon SP-API Catalog v2022-04-01 + Supplier GST Invoice',
    confidenceScore: 98,
    missingFieldsCount: 0,
    conflictSummary: 'Resolved: Supplier invoice listed 515g net weight vs 540g packaged weight.',
  });

  const prod2Id = await saveProductRecord(ownerId, {
    sku: 'AFZ-TWS-ANC-PRO',
    asin: 'B0B4N8ELEC',
    gtin: '8904567890123',
    title: 'Kreo Halo True Wireless Earbuds with 32dB Active Noise Cancellation & 40H Playtime',
    brand: 'Kreo',
    manufacturer: 'Kreo Tech Pvt Ltd, Bengaluru',
    category: 'CONSUMER_ELECTRONICS',
    productType: 'HEADPHONES',
    bullets: [
      '32dB Hybrid Active Noise Cancellation filters ambient metro, traffic, and office noise.',
      'Up to 40 hours combined battery backup with Type-C fast charging case.',
      'Quad-mic Environmental Noise Cancellation (ENC) for crisp voice calls.',
      'Bluetooth 5.3 low-latency connection with 13mm dynamic titanium drivers.',
      'Includes Charging Case, Type-C Cable, and 3 pairs of silicone ear tips (S/M/L).',
    ],
    description:
      'Kreo Halo ANC wireless earbuds deliver 32dB noise cancellation, 13mm drivers, and 40 hours total battery life.',
    searchKeywords: 'tws earbuds anc noise cancelling bluetooth earphones gaming low latency type c',
    modelNumber: 'KR-HALO-TWS-01',
    partNumber: 'Needs Review',
    color: 'Obsidian Black',
    size: 'One Size',
    material: 'ABS Polycarbonate',
    dimensions: '6.2 x 4.8 x 2.7 cm',
    weight: '46 g',
    packageQuantity: 1,
    includedAccessories: 'Charging Case, USB-C Cable, 3 Pairs Silicone Ear Tips',
    technicalSpecs: 'Bluetooth 5.3, 32dB ANC, 13mm Drivers, 40H Playtime',
    compatibility: 'Android, iOS, Windows, macOS',
    countryOfOrigin: 'Needs Review',
    hsnCode: '85183000',
    mrpInr: 3499,
    sellingPriceInr: 1899,
    inventoryCount: 64,
    fulfilmentChannel: 'FBA',
    status: 'Needs Review',
    spApiSubmissionId: 'Not Submitted',
    spApiVerifiedAt: 'Unverified',
    sourceSummary: 'Supplier Spec Sheet (Missing Country of Origin & Part Number)',
    confidenceScore: 82,
    missingFieldsCount: 2,
    conflictSummary: '2 required fields (countryOfOrigin, partNumber) missing from supplier sheet.',
  });

  await saveProductRecord(ownerId, {
    sku: 'AFZ-KURTA-IND-L',
    asin: 'Pending ASIN',
    gtin: '8907788990011',
    title: 'VastraVeda Men Pure Handblock Printed Indigo Cotton Straight Kurta (Large)',
    brand: 'VastraVeda',
    manufacturer: 'Sanganer Textile Artisans Pvt. Ltd., Jaipur',
    category: 'APPAREL',
    productType: 'KURTA',
    bullets: [
      'Crafted from 100% breathable Sanganeri cambric cotton with authentic natural indigo handblock print.',
      'Regular straight fit with mandarin collar, full sleeves, and two functional side pockets.',
      'Pre-shrunk fabric tailored for Indian festive and daily ethnic wear (Large — 42 inch chest).',
      'Gentle hand wash or cold machine wash separately.',
      'Made in Jaipur, Rajasthan, India under HSN 62052000.',
    ],
    description:
      'Authentic Jaipur handblock printed indigo cotton straight kurta for men with mandarin collar and breathable comfort.',
    searchKeywords: 'mens cotton kurta indigo handblock jaipuri ethnic wear festive kurta large',
    modelNumber: 'VV-IND-KURTA-42',
    partNumber: 'VV-KR-42L',
    color: 'Indigo Blue',
    size: 'Large (42)',
    material: '100% Cambric Cotton',
    dimensions: '32 x 24 x 2 cm',
    weight: '280 g',
    packageQuantity: 1,
    includedAccessories: '1 Kurta',
    technicalSpecs: 'Mandarin Collar, Full Sleeves, Side Slits, Natural Indigo Dye',
    compatibility: 'Men Ethnic & Festive Wear',
    countryOfOrigin: 'India',
    hsnCode: '62052000',
    mrpInr: 1999,
    sellingPriceInr: 849,
    inventoryCount: 90,
    fulfilmentChannel: 'Easy Ship',
    status: 'Draft',
    spApiSubmissionId: 'Not Submitted',
    spApiVerifiedAt: 'Unverified',
    sourceSummary: 'AI Extracted from Jaipur Artisan Invoice',
    confidenceScore: 95,
    missingFieldsCount: 0,
    conflictSummary: 'None',
  });

  await createListingErrorRecord(ownerId, {
    productId: prod2Id,
    sku: 'AFZ-TWS-ANC-PRO',
    asin: 'B0B4N8ELEC',
    errorCode: '90215',
    severity: 'ERROR',
    issueType: 'Missing Required Attribute (Legal Metrology)',
    amazonMessage:
      '[Error 90215] The country_of_origin field is required for all products sold on Amazon.in under Legal Metrology (Packaged Commodities) Rules.',
    plainExplanation:
      'Amazon India requires a verified Country of Origin before activating any offer. The supplier sheet omitted this field, so AI left it marked "Needs Review".',
    fieldAffected: 'countryOfOrigin',
    oldValue: 'Needs Review',
    proposedValue: 'India',
    status: 'Fix Proposed',
    spApiVerificationId: 'Pending Seller Approval',
  });

  await createListingErrorRecord(ownerId, {
    productId: prod1Id,
    sku: 'AFZ-KITCH-FLASK-1000',
    asin: 'B09X7K2IN1',
    errorCode: '8541',
    severity: 'WARNING',
    issueType: 'Catalog Attribute Conflict (Item Weight)',
    amazonMessage:
      '[Error 8541] The value "515 g" specified for item_weight conflicts with the existing Amazon catalog value "540 g" for ASIN B09X7K2IN1.',
    plainExplanation:
      'Your supplier document states 515g (net flask weight), whereas Amazon.in catalog lists 540g including the nylon pouch. Aligning with 540g prevents listing suppression.',
    fieldAffected: 'weight',
    oldValue: '515 g',
    proposedValue: '540 g',
    status: 'Fix Proposed',
    spApiVerificationId: 'Pending Seller Approval',
  });

  await createListingErrorRecord(ownerId, {
    productId: prod2Id,
    sku: 'AFZ-TWS-ANC-PRO',
    asin: 'B0B4N8ELEC',
    errorCode: 'SUPPRESSED_MAIN_IMG',
    severity: 'SUPPRESSED',
    issueType: 'Suppressed Listing — Compliance / BIS CRS Requirement',
    amazonMessage:
      '[Suppression 18024] Wireless audio devices under HSN 85183000 require valid part_number and BIS CRS registration metadata on Amazon.in.',
    plainExplanation:
      'Electronic wireless earbuds require a manufacturer part number (KR-HALO-BLK) and BIS CRS compliance entry.',
    fieldAffected: 'partNumber',
    oldValue: 'Needs Review',
    proposedValue: 'KR-HALO-BLK',
    status: 'Open',
    spApiVerificationId: 'Pending Seller Approval',
  });

  const claim1Id = await createClaimRecord(ownerId, {
    claimRef: 'CLM-IN-2026-104',
    claimType: 'FBA Inventory Lost in Fulfillment Center (BOM5)',
    fulfilmentMethod: 'FBA',
    orderId: 'N/A (FC Warehouse Loss)',
    asin: 'B09X7K2IN1',
    sku: 'AFZ-KITCH-FLASK-1000',
    fnsku: 'X001AFZFLK',
    shipmentId: 'FBA15K8810IN',
    transactionId: 'INV-LEDGER-992014',
    eventDate: '2026-10-02',
    deadlineDate: '2026-12-01',
    policyRuleId: 'POL-IN-FBA-LOST-01',
    policyName: 'Amazon.in FBA Lost & Damaged Fulfillment Center Inventory Policy',
    eligibilityStatus: 'Potentially eligible',
    potentialAmountInr: 11988,
    requestedAmountInr: 0,
    approvedAmountInr: 0,
    receivedAmountInr: 0,
    workflowStatus: 'Under Review',
    factualExplanation:
      'Per Amazon.in Inventory Ledger Report (Event ID INV-LEDGER-992014 dated 2026-10-02 at FC BOM5 Bhiwandi), 12 units of SKU AFZ-KITCH-FLASK-1000 (ASIN B09X7K2IN1, FNSKU X001AFZFLK) were recorded under Reason Code M (Misplaced in Fulfillment Center) with no subsequent found event or automatic reimbursement after 14 calendar days.',
    requestedResolution:
      'Requesting FBA inventory reimbursement for 12 lost units of FNSKU X001AFZFLK in accordance with Amazon.in FBA Lost and Damaged Inventory Policy.',
    sellerAccuracyConfirmed: true,
    amazonCaseId: 'Not Submitted',
  });

  const claim2Id = await createClaimRecord(ownerId, {
    claimRef: 'CLM-IN-2026-098',
    claimType: 'FBA Inbound Shipment Receiving Shortage (DEL4)',
    fulfilmentMethod: 'FBA',
    orderId: 'N/A (Inbound Shipment)',
    asin: 'B0B4N8ELEC',
    sku: 'AFZ-TWS-ANC-PRO',
    fnsku: 'X002KREOANC',
    shipmentId: 'FBA15J7402IN',
    transactionId: 'RECV-DEL4-44109',
    eventDate: '2026-09-25',
    deadlineDate: '2026-10-25',
    policyRuleId: 'POL-IN-FBA-RECV-02',
    policyName: 'Amazon.in FBA Inbound Shipment Receiving Discrepancy Policy',
    eligibilityStatus: 'Potentially eligible',
    potentialAmountInr: 15192,
    requestedAmountInr: 15192,
    approvedAmountInr: 13850,
    receivedAmountInr: 13850,
    workflowStatus: 'Reimbursement Confirmed',
    factualExplanation:
      'Inbound Shipment FBA15J7402IN shipped 60 units of SKU AFZ-TWS-ANC-PRO (FNSKU X002KREOANC) to DEL4 Gurugram FC. Carrier POD stamped by Amazon FC security confirms 3 sealed master cartons (60 units) delivered on 2026-09-24, whereas Shipment Reconciliation recorded 52 units received (8-unit shortage).',
    requestedResolution:
      'Reimbursement of 8 missing units verified against GST Tax Invoice #KREO-GST-2026-884 and stamped BlueDart POD.',
    sellerAccuracyConfirmed: true,
    amazonCaseId: 'CASE-IN-1149820341',
  });

  await createClaimRecord(ownerId, {
    claimRef: 'CLM-IN-2026-109',
    claimType: 'Easy Ship SAFE-T Damaged Return Switch Discrepancy',
    fulfilmentMethod: 'Easy Ship',
    orderId: '404-8829104-3910755',
    asin: 'B0B4N8ELEC',
    sku: 'AFZ-TWS-ANC-PRO',
    fnsku: 'N/A (Easy Ship)',
    shipmentId: 'AWB-8991024412',
    transactionId: 'RET-404-8829104',
    eventDate: '2026-10-16',
    deadlineDate: '2026-10-31',
    policyRuleId: 'POL-IN-EASYSHIP-SAFE-T-03',
    policyName: 'Amazon.in Easy Ship & Seller Flex SAFE-T Return Discrepancy Policy',
    eligibilityStatus: 'Needs Review',
    potentialAmountInr: 1899,
    requestedAmountInr: 1899,
    approvedAmountInr: 0,
    receivedAmountInr: 0,
    workflowStatus: 'Submitted to Seller Central',
    factualExplanation:
      'Order 404-8829104-3910755 returned via Amazon Easy Ship AWB-8991024412 on 2026-10-16 contained a non-functional generic wired earphone instead of Kreo Halo ANC Earbuds (Serial #KR2609118). Tamper-evident bag barcode photo and unboxing images attached.',
    requestedResolution:
      'Requesting SAFE-T claim settlement for materially different return under Amazon.in Easy Ship SAFE-T Policy.',
    sellerAccuracyConfirmed: true,
    amazonCaseId: 'SAFE-T-77812-09441',
  });

  await createClaimEvidenceRecord(ownerId, {
    claimId: claim1Id,
    claimRef: 'CLM-IN-2026-104',
    documentType: 'GST Tax Invoice',
    fileName: 'Hamilton_GST_Invoice_INV_2026_412.pdf',
    referenceNumber: 'GSTIN-24AAACH1122B1Z5 / INV-412',
    issueDate: '2026-09-12',
    extractedSummary: '150 units of Milton Thermosteel 1000ml Flask (HSN 96170011) billed to Seller.',
    verifiedStatus: 'Verified',
  });

  await createClaimEvidenceRecord(ownerId, {
    claimId: claim2Id,
    claimRef: 'CLM-IN-2026-098',
    documentType: 'Stamped FC Proof of Delivery (POD)',
    fileName: 'DEL4_FC_Stamped_POD_FBA15J7402IN.pdf',
    referenceNumber: 'AWB-BD-77419022',
    issueDate: '2026-09-24',
    extractedSummary:
      'Amazon DEL4 Inbound Dock Security Stamp confirming 3 cartons (22.4 kg gross weight) received intact.',
    verifiedStatus: 'Verified',
  });

  await saveSpApiConnection(ownerId, {
    marketplaceId: 'A21TJRUUN4KGV',
    marketplaceName: 'Amazon.in (India)',
    sellerId: 'A39AFZALSLLERIN',
    mode: 'SANDBOX',
    connectionStatus: 'Connected (Sandbox)',
    lastSyncAt: new Date().toISOString(),
    activeRoles:
      'Product Listing, Pricing, Amazon Fulfillment (FBA), Inventory & Order Tracking, Finance & Accounting',
  });

  await createAuditLog(
    ownerId,
    actorEmail,
    actorRole,
    'Workspace Initialized with Amazon.in Catalog & Claims Ledger',
    'System',
    'A21TJRUUN4KGV',
    'Seeded verified SP-API listing, pending review items, listing error diagnostics, and policy-linked reimbursement claims.',
    'SP-API Verified'
  );
}
