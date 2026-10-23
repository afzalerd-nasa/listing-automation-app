import React, { useState } from 'react';
import {
  UserProfile,
  ClaimRecord,
  ClaimEvidenceRecord,
  ProductRecord,
} from '../types';
import { AMAZON_INDIA_POLICY_RULES } from '../data/seedData';
import {
  createClaimRecord,
  updateClaimRecord,
  createClaimEvidenceRecord,
  createAuditLog,
  deleteRecordById,
} from '../services/firestoreService';
import {
  Scale,
  Sparkles,
  FileCheck2,
  ExternalLink,
  Plus,
  Send,
  CheckCircle2,
  AlertTriangle,
  Trash2,
} from 'lucide-react';

interface ClaimsAndEvidenceModuleProps {
  modeView: 'claims' | 'evidence';
  user: UserProfile;
  claims: ClaimRecord[];
  evidenceList: ClaimEvidenceRecord[];
  products: ProductRecord[];
}

export const ClaimsAndEvidenceModule: React.FC<ClaimsAndEvidenceModuleProps> = ({
  modeView,
  user,
  claims,
  evidenceList,
  products,
}) => {
  const [selectedClaimId, setSelectedClaimId] = useState<string>(claims[0]?.id || '');
  const activeClaim = claims.find((c) => c.id === selectedClaimId) || claims[0] || null;

  // New Claim Candidate Form
  const [newClaimRuleId, setNewClaimRuleId] = useState(AMAZON_INDIA_POLICY_RULES[0].id);
  const [newFulfilmentMethod, setNewFulfilmentMethod] = useState<'FBA' | 'Easy Ship' | 'Self-Ship'>('FBA');
  const [newSku, setNewSku] = useState(products[0]?.sku || 'AFZ-KITCH-FLASK-1000');
  const [newAsin, setNewAsin] = useState(products[0]?.asin || 'B09X7K2IN1');
  const [newFnsku, setNewFnsku] = useState('X001AFZFLK');
  const [newOrderId, setNewOrderId] = useState('404-9102831-7712019');
  const [newShipmentId, setNewShipmentId] = useState('FBA15K9981IN');
  const [newTransactionId, setNewTransactionId] = useState('INV-LEDGER-881092');
  const [newEventDate, setNewEventDate] = useState('2026-10-10');
  const [newPotentialInr, setNewPotentialInr] = useState<number>(5994);
  const [discrepancyNotes, setDiscrepancyNotes] = useState(
    '6 units of SKU AFZ-KITCH-FLASK-1000 misplaced in FC BOM5 per Inventory Event Report without auto-reimbursement.'
  );
  const [claimBanner, setClaimBanner] = useState<string | null>(null);
  const [isDraftingWithAi, setIsDraftingWithAi] = useState(false);

  // Active claim editing state
  const [explanationDraft, setExplanationDraft] = useState(activeClaim?.factualExplanation || '');
  const [resolutionDraft, setResolutionDraft] = useState(activeClaim?.requestedResolution || '');
  const [accuracyConfirmed, setAccuracyConfirmed] = useState(
    activeClaim?.sellerAccuracyConfirmed || false
  );
  const [caseIdInput, setCaseIdInput] = useState(activeClaim?.amazonCaseId || 'Not Submitted');
  const [missingEvidenceAlert, setMissingEvidenceAlert] = useState<string[]>([]);

  // Evidence Upload Form State
  const [evClaimId, setEvClaimId] = useState<string>(claims[0]?.id || '');
  const [evDocType, setEvDocType] = useState('GST Tax Invoice');
  const [evFileName, setEvFileName] = useState('Supplier_GST_Tax_Invoice_Oct2026.pdf');
  const [evRefNumber, setEvRefNumber] = useState('GSTIN-27AAACA8891K1Z2 / INV-908');
  const [evIssueDate, setEvIssueDate] = useState('2026-10-01');
  const [evSummary, setEvSummary] = useState(
    'Verified tax invoice showing HSN code, unit quantity, and purchase valuation.'
  );
  const [evVerifiedStatus, setEvVerifiedStatus] = useState<
    'Verified' | 'Needs Review' | 'Missing Required Signature'
  >('Verified');

  const selectClaimToInspect = (clm: ClaimRecord) => {
    setSelectedClaimId(clm.id);
    setExplanationDraft(clm.factualExplanation);
    setResolutionDraft(clm.requestedResolution);
    setAccuracyConfirmed(clm.sellerAccuracyConfirmed);
    setCaseIdInput(clm.amazonCaseId);
    setMissingEvidenceAlert([]);
  };

  // Deterministic Claim Eligibility & Deadline Calculator
  const evaluatePolicyEligibility = (
    ruleId: string,
    fulfilmentMethod: 'FBA' | 'Easy Ship' | 'Self-Ship',
    eventDateStr: string,
    shipmentId: string,
    transactionId: string
  ) => {
    const rule =
      AMAZON_INDIA_POLICY_RULES.find((r) => r.id === ruleId) || AMAZON_INDIA_POLICY_RULES[0];

    // Check duplicate claim by transactionId or shipmentId
    const duplicate = claims.find(
      (c) =>
        (transactionId &&
          transactionId !== 'N/A' &&
          c.transactionId.toLowerCase() === transactionId.toLowerCase()) ||
        (shipmentId &&
          shipmentId !== 'N/A' &&
          c.shipmentId.toLowerCase() === shipmentId.toLowerCase() &&
          c.sku.toLowerCase() === newSku.toLowerCase())
    );

    const eventTime = new Date(eventDateStr).getTime();
    const deadlineTime = eventTime + rule.deadlineDays * 24 * 60 * 60 * 1000;
    const deadlineDate = Number.isNaN(deadlineTime)
      ? '2026-12-01'
      : new Date(deadlineTime).toISOString().slice(0, 10);
    const nowTime = new Date('2026-10-23').getTime();

    let eligibilityStatus: ClaimRecord['eligibilityStatus'] = 'Potentially eligible';
    if (!rule.eligibleFulfilmentMethods.includes(fulfilmentMethod)) {
      eligibilityStatus = 'Not Eligible under current rules';
    } else if (nowTime > deadlineTime) {
      eligibilityStatus = 'Not Eligible under current rules';
    } else if (rule.reviewStatus === 'Policy Verification Required') {
      eligibilityStatus = 'Policy Verification Required';
    } else if (duplicate) {
      eligibilityStatus = 'Needs Review';
    }

    return {
      rule,
      deadlineDate,
      eligibilityStatus,
      duplicateFound: duplicate,
    };
  };

  const handleCreateClaimCandidate = async () => {
    setClaimBanner(null);
    const evalResult = evaluatePolicyEligibility(
      newClaimRuleId,
      newFulfilmentMethod,
      newEventDate,
      newShipmentId,
      newTransactionId
    );

    if (evalResult.duplicateFound) {
      setClaimBanner(
        `Duplicate Prevention Triggered: Claim ${evalResult.duplicateFound.claimRef} already references Transaction/Shipment ID (${newTransactionId || newShipmentId}). Do not submit duplicate requests.`
      );
      return;
    }

    const claimRef = `CLM-IN-2026-${Math.floor(100 + Math.random() * 900)}`;
    const createdId = await createClaimRecord(user.uid, {
      claimRef,
      claimType: evalResult.rule.policyName,
      fulfilmentMethod: newFulfilmentMethod,
      orderId: newOrderId,
      asin: newAsin,
      sku: newSku,
      fnsku: newFnsku,
      shipmentId: newShipmentId,
      transactionId: newTransactionId,
      eventDate: newEventDate,
      deadlineDate: evalResult.deadlineDate,
      policyRuleId: evalResult.rule.id,
      policyName: evalResult.rule.policyName,
      eligibilityStatus: evalResult.eligibilityStatus,
      potentialAmountInr: newPotentialInr,
      requestedAmountInr: 0,
      approvedAmountInr: 0,
      receivedAmountInr: 0,
      workflowStatus: 'Candidate',
      factualExplanation: discrepancyNotes,
      requestedResolution: `Requesting investigation and reimbursement review for SKU ${newSku} under ${evalResult.rule.policyName}.`,
      sellerAccuracyConfirmed: false,
      amazonCaseId: 'Not Submitted',
    });

    await createAuditLog(
      user.uid,
      user.email,
      user.role,
      `Created Claim Candidate ${claimRef} (${evalResult.eligibilityStatus})`,
      'Module D: Claims Assistant',
      createdId,
      `Evaluated against ${evalResult.rule.id}. Deadline: ${evalResult.deadlineDate}. Potential Value: ₹${newPotentialInr}.`,
      'AI Recommendation Only'
    );

    setSelectedClaimId(createdId);
    setClaimBanner(
      `Created Claim Candidate ${claimRef} with eligibility "${evalResult.eligibilityStatus}" and submission deadline ${evalResult.deadlineDate}.`
    );
  };

  const handleGenerateFactualClaimDraft = async () => {
    if (!activeClaim) return;
    setIsDraftingWithAi(true);
    setClaimBanner(null);
    try {
      const attachedEv = evidenceList.filter(
        (e) => e.claimId === activeClaim.id || e.claimRef === activeClaim.claimRef
      );
      const resp = await fetch('/api/ai/draft-claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          claimType: activeClaim.claimType,
          fulfilmentMethod: activeClaim.fulfilmentMethod,
          sku: activeClaim.sku,
          asin: activeClaim.asin,
          fnsku: activeClaim.fnsku,
          orderId: activeClaim.orderId,
          shipmentId: activeClaim.shipmentId,
          transactionId: activeClaim.transactionId,
          eventDate: activeClaim.eventDate,
          potentialAmountInr: activeClaim.potentialAmountInr,
          policyName: activeClaim.policyName,
          evidenceFiles: attachedEv.map((e) => `${e.documentType}: ${e.fileName} (${e.referenceNumber})`),
          discrepancyNotes: explanationDraft || activeClaim.factualExplanation,
        }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data.error || 'Failed to draft claim');
      }
      setExplanationDraft(data.draft.factualExplanation || explanationDraft);
      setResolutionDraft(data.draft.requestedResolution || resolutionDraft);
      setMissingEvidenceAlert(
        Array.isArray(data.draft.missingEvidenceChecklist)
          ? data.draft.missingEvidenceChecklist
          : []
      );

      await createAuditLog(
        user.uid,
        user.email,
        user.role,
        `AI Drafted Factual Claim Case (${activeClaim.claimRef})`,
        'Module D: Claims Assistant',
        activeClaim.id,
        'Generated factual case explanation and missing evidence checklist. Not yet submitted to Seller Central.',
        'AI Recommendation Only'
      );
    } catch (err: any) {
      setClaimBanner(`AI Draft Error: ${err?.message || 'Failed'}`);
    } finally {
      setIsDraftingWithAi(false);
    }
  };

  const handleTransitionClaimStatus = async (
    targetStatus: ClaimRecord['workflowStatus']
  ) => {
    if (!activeClaim) return;

    if (
      (targetStatus === 'Submitted to Seller Central' ||
        targetStatus === 'Reimbursement Confirmed') &&
      !accuracyConfirmed
    ) {
      setClaimBanner(
        'Blocking Requirement: Seller must confirm factual accuracy and attached evidence before marking a claim as submitted to Seller Central.'
      );
      return;
    }

    const assignedCaseId =
      targetStatus === 'Submitted to Seller Central' &&
      (!caseIdInput || caseIdInput === 'Not Submitted')
        ? `CASE-IN-${Date.now().toString().slice(-8)}`
        : caseIdInput;

    const nextRequested =
      targetStatus === 'Submitted to Seller Central' ||
      targetStatus === 'Reimbursement Confirmed'
        ? activeClaim.potentialAmountInr
        : activeClaim.requestedAmountInr;

    const nextApproved =
      targetStatus === 'Reimbursement Confirmed'
        ? activeClaim.potentialAmountInr
        : activeClaim.approvedAmountInr;

    const nextReceived =
      targetStatus === 'Reimbursement Confirmed'
        ? activeClaim.potentialAmountInr
        : activeClaim.receivedAmountInr;

    await updateClaimRecord(activeClaim.id, {
      eligibilityStatus: activeClaim.eligibilityStatus,
      potentialAmountInr: activeClaim.potentialAmountInr,
      requestedAmountInr: nextRequested,
      approvedAmountInr: nextApproved,
      receivedAmountInr: nextReceived,
      workflowStatus: targetStatus,
      factualExplanation: explanationDraft || activeClaim.factualExplanation,
      requestedResolution: resolutionDraft || activeClaim.requestedResolution,
      sellerAccuracyConfirmed: accuracyConfirmed,
      amazonCaseId: assignedCaseId,
    });

    await createAuditLog(
      user.uid,
      user.email,
      user.role,
      `Updated Claim ${activeClaim.claimRef} to "${targetStatus}"`,
      'Module D: Claims Assistant',
      activeClaim.id,
      `Case Reference: ${assignedCaseId}. Seller Factual Accuracy Confirmed: ${accuracyConfirmed}.`,
      targetStatus === 'Reimbursement Confirmed' ? 'SP-API Verified' : 'User Approved'
    );

    setCaseIdInput(assignedCaseId);
    setClaimBanner(
      `Updated Claim ${activeClaim.claimRef} to status "${targetStatus}" (Case ID: ${assignedCaseId}).`
    );
  };

  const handleAddEvidenceFile = async () => {
    const targetClaim = claims.find((c) => c.id === evClaimId) || claims[0];
    const id = await createClaimEvidenceRecord(user.uid, {
      claimId: targetClaim?.id || 'clm-default',
      claimRef: targetClaim?.claimRef || 'CLM-IN-2026-104',
      documentType: evDocType,
      fileName: evFileName,
      referenceNumber: evRefNumber,
      issueDate: evIssueDate,
      extractedSummary: evSummary,
      verifiedStatus: evVerifiedStatus,
    });

    await createAuditLog(
      user.uid,
      user.email,
      user.role,
      `Uploaded Claim Evidence (${evFileName})`,
      'Claim Evidence Vault',
      id,
      `Linked ${evDocType} (${evRefNumber}) to Claim ${targetClaim?.claimRef || 'N/A'}.`,
      'User Approved'
    );
  };

  if (modeView === 'evidence') {
    return (
      <div className="space-y-8">
        <section className="bg-white border border-slate-200 rounded-lg p-6 space-y-5">
          <div className="border-b border-slate-200 pb-4">
            <h1 className="text-lg font-bold text-slate-900">
              Claim Evidence Vault &amp; Supporting Document Checklist
            </h1>
            <p className="text-xs text-slate-600">
              Attach and verify GST Tax Invoices, signed FC Proof of Delivery (POD) challans,
              Inventory Ledger snapshots, and Easy Ship unboxing evidence before submitting a claim.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-700">Link to Claim Case</label>
              <select
                value={evClaimId}
                onChange={(e) => setEvClaimId(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-md bg-white"
              >
                {claims.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.claimRef} — {c.sku} ({c.claimType.slice(0, 36)})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-700">Document Type</label>
              <select
                value={evDocType}
                onChange={(e) => setEvDocType(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md bg-white"
              >
                <option value="GST Tax Invoice">GST Tax Invoice (HSN &amp; Purchase Proof)</option>
                <option value="Stamped FC Proof of Delivery (POD)">
                  Stamped FC Proof of Delivery (POD)
                </option>
                <option value="FBA Inventory Ledger Report">FBA Inventory Ledger Report</option>
                <option value="Easy Ship Tamper-Bag & AWB Photo">
                  Easy Ship Tamper-Bag &amp; AWB Photo
                </option>
                <option value="Digital Scale & Measuring Tape Photo">
                  Digital Scale &amp; Measuring Tape Photo
                </option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-700">
                Document File Name
              </label>
              <input
                type="text"
                value={evFileName}
                onChange={(e) => setEvFileName(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-md"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-700">
                Invoice / AWB / Event Reference Number
              </label>
              <input
                type="text"
                value={evRefNumber}
                onChange={(e) => setEvRefNumber(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-md"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-700">Document Issue Date</label>
              <input
                type="date"
                value={evIssueDate}
                onChange={(e) => setEvIssueDate(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-md"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-700">
                Verification Status
              </label>
              <select
                value={evVerifiedStatus}
                onChange={(e) => setEvVerifiedStatus(e.target.value as any)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md bg-white"
              >
                <option value="Verified">Verified (Matches Claim SKU &amp; Qty)</option>
                <option value="Needs Review">Needs Review</option>
                <option value="Missing Required Signature">
                  Missing Required FC Stamp / Signature
                </option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-700">
              Extracted Factual Evidence Summary
            </label>
            <input
              type="text"
              value={evSummary}
              onChange={(e) => setEvSummary(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleAddEvidenceFile}
              className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Register Verified Evidence Document
            </button>
          </div>
        </section>

        <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200">
            <h2 className="text-sm font-semibold text-slate-900">
              Stored Claim Evidence Documents ({evidenceList.length})
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-600">
                  <th className="py-3 px-4">Claim Ref</th>
                  <th className="py-3 px-4">Document Type &amp; File</th>
                  <th className="py-3 px-4">Reference Number / Date</th>
                  <th className="py-3 px-4">Factual Summary</th>
                  <th className="py-3 px-4">Verification Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {evidenceList.map((ev) => (
                  <tr key={ev.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-mono font-semibold text-slate-900">
                      {ev.claimRef}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-900">{ev.documentType}</div>
                      <div className="font-mono text-slate-500">{ev.fileName}</div>
                    </td>
                    <td className="py-3 px-4 font-mono tabular-nums">
                      <div>{ev.referenceNumber}</div>
                      <div className="text-slate-500">{ev.issueDate}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-600 max-w-xs">{ev.extractedSummary}</td>
                    <td className="py-3 px-4 font-semibold">
                      <span
                        className={
                          ev.verifiedStatus === 'Verified' ? 'text-emerald-700' : 'text-amber-700'
                        }
                      >
                        {ev.verifiedStatus}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => deleteRecordById('claimEvidence', ev.id)}
                        className="p-1 text-slate-400 hover:text-red-600 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Configurable Amazon.in Policy Rules Engine */}
      <section className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 border-b border-slate-200 pb-4">
          <div>
            <h1 className="text-lg font-bold text-slate-900">
              Module D: Amazon India Claims &amp; Reimbursement Eligibility Engine
            </h1>
            <p className="text-xs text-slate-600">
              Evaluates discrepancies against official Amazon.in policy rules, fulfilment channel
              eligibility, submission deadlines, and duplicate case controls. Never guarantees
              reimbursement or fabricates loss values.
            </p>
          </div>
          <span className="text-xs font-mono tabular-nums text-slate-500">
            Reference Date: 2026-10-23 · 4 Active Policy Rules
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {AMAZON_INDIA_POLICY_RULES.map((rule) => (
            <div
              key={rule.id}
              className="p-4 border border-slate-200 rounded-md bg-slate-50/50 space-y-2 text-xs"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="font-semibold text-slate-900">{rule.policyName}</div>
                <span className="font-mono text-emerald-700 font-semibold shrink-0">
                  {rule.reviewStatus}
                </span>
              </div>
              <div className="text-slate-600">{rule.eventConditions}</div>
              <div className="font-mono tabular-nums text-slate-500 flex flex-wrap items-center gap-2">
                <span>Eligible: {rule.eligibleFulfilmentMethods.join(', ')}</span>
                <span aria-hidden="true">·</span>
                <span>Deadline: {rule.deadlineDays} days</span>
                <span aria-hidden="true">·</span>
                <span>Reviewed: {rule.reviewDate}</span>
                <span aria-hidden="true">·</span>
                <a
                  href={rule.officialSourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-slate-900 underline inline-flex items-center gap-0.5"
                >
                  Seller Central Policy
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <div className="text-slate-500">
                <strong>Exclusions:</strong> {rule.exclusionConditions}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Discrepancy Matcher & New Claim Candidate Form */}
      <section className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
        <h2 className="text-sm font-semibold text-slate-900 border-b border-slate-100 pb-3">
          Evaluate New Discrepancy Against Policy Rules &amp; Duplicate Guard
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
          <div className="md:col-span-2 space-y-1">
            <label className="block font-medium text-slate-700">Applicable Amazon.in Policy</label>
            <select
              value={newClaimRuleId}
              onChange={(e) => setNewClaimRuleId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white"
            >
              {AMAZON_INDIA_POLICY_RULES.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.id} — {r.policyName} ({r.deadlineDays}d window)
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="block font-medium text-slate-700">Seller Fulfilment Method</label>
            <select
              value={newFulfilmentMethod}
              onChange={(e) => setNewFulfilmentMethod(e.target.value as any)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white"
            >
              <option value="FBA">FBA (Fulfilled by Amazon)</option>
              <option value="Easy Ship">Amazon Easy Ship</option>
              <option value="Self-Ship">Self-Ship (Merchant Fulfilled)</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="block font-medium text-slate-700">Discrepancy Event Date</label>
            <input
              type="date"
              value={newEventDate}
              onChange={(e) => setNewEventDate(e.target.value)}
              className="w-full px-3 py-2 font-mono border border-slate-300 rounded-md"
            />
          </div>

          <div className="space-y-1">
            <label className="block font-medium text-slate-700">SKU</label>
            <input
              type="text"
              value={newSku}
              onChange={(e) => setNewSku(e.target.value)}
              className="w-full px-3 py-2 font-mono border border-slate-300 rounded-md"
            />
          </div>

          <div className="space-y-1">
            <label className="block font-medium text-slate-700">ASIN / FNSKU</label>
            <input
              type="text"
              value={newAsin}
              onChange={(e) => setNewAsin(e.target.value)}
              className="w-full px-3 py-2 font-mono border border-slate-300 rounded-md"
            />
          </div>

          <div className="space-y-1">
            <label className="block font-medium text-slate-700">Shipment ID / AWB</label>
            <input
              type="text"
              value={newShipmentId}
              onChange={(e) => setNewShipmentId(e.target.value)}
              className="w-full px-3 py-2 font-mono border border-slate-300 rounded-md"
            />
          </div>

          <div className="space-y-1">
            <label className="block font-medium text-slate-700">
              Inventory Ledger / Transaction ID
            </label>
            <input
              type="text"
              value={newTransactionId}
              onChange={(e) => setNewTransactionId(e.target.value)}
              className="w-full px-3 py-2 font-mono border border-slate-300 rounded-md"
            />
          </div>

          <div className="space-y-1">
            <label className="block font-medium text-slate-700">
              Estimated Potential Value (INR ₹)
            </label>
            <input
              type="number"
              value={newPotentialInr}
              onChange={(e) => setNewPotentialInr(Number(e.target.value))}
              className="w-full px-3 py-2 font-mono tabular-nums border border-slate-300 rounded-md"
            />
          </div>

          <div className="md:col-span-3 space-y-1">
            <label className="block font-medium text-slate-700">
              Discrepancy Notes from Inventory / Return Report
            </label>
            <input
              type="text"
              value={discrepancyNotes}
              onChange={(e) => setDiscrepancyNotes(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleCreateClaimCandidate}
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md flex items-center gap-1.5 cursor-pointer"
          >
            <Scale className="w-3.5 h-3.5" />
            Check Eligibility &amp; Create Claim Candidate
          </button>
        </div>

        {claimBanner && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-md text-xs font-mono text-amber-950">
            {claimBanner}
          </div>
        )}
      </section>

      {/* Active Claims Table & AI Case Drafting Workbench */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left List of Claims */}
        <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200">
            <h2 className="text-sm font-semibold text-slate-900">
              Seller Claims Queue ({claims.length})
            </h2>
            <p className="text-xs text-slate-500">Select a claim to draft or reconcile</p>
          </div>
          <div className="divide-y divide-slate-200">
            {claims.map((c) => (
              <div
                key={c.id}
                onClick={() => selectClaimToInspect(c)}
                className={`p-4 cursor-pointer transition-colors space-y-1.5 ${
                  activeClaim?.id === c.id ? 'bg-slate-100' : 'hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-mono tabular-nums">
                  <span className="font-bold text-slate-900">{c.claimRef}</span>
                  <span
                    className={
                      c.eligibilityStatus === 'Potentially eligible'
                        ? 'text-emerald-700 font-semibold'
                        : c.eligibilityStatus === 'Not Eligible under current rules'
                        ? 'text-red-700 font-semibold'
                        : 'text-amber-700 font-semibold'
                    }
                  >
                    {c.eligibilityStatus}
                  </span>
                </div>
                <div className="text-xs font-medium text-slate-800">{c.claimType}</div>
                <div className="text-xs font-mono tabular-nums text-slate-500">
                  SKU: {c.sku} · Potential: ₹{c.potentialAmountInr} · Confirmed: ₹
                  {c.receivedAmountInr}
                </div>
                <div className="text-xs text-slate-600">
                  Workflow: <strong>{c.workflowStatus}</strong>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Right 2 Columns: Selected Claim Drafting & Seller Accuracy Confirmation */}
        {activeClaim && (
          <section className="lg:col-span-2 bg-white border border-slate-200 rounded-lg p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <div className="text-xs font-mono text-slate-500">
                  {activeClaim.claimRef} · Fulfilment: {activeClaim.fulfilmentMethod} · Deadline:{' '}
                  {activeClaim.deadlineDate}
                </div>
                <h2 className="text-base font-bold text-slate-900 mt-0.5">
                  {activeClaim.claimType}
                </h2>
              </div>

              <button
                type="button"
                onClick={handleGenerateFactualClaimDraft}
                disabled={isDraftingWithAi}
                className="px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md flex items-center gap-1.5 self-start cursor-pointer disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {isDraftingWithAi ? 'Drafting Case with Gemini...' : 'AI Draft Factual Case & Audit Evidence'}
              </button>
            </div>

            {/* 4-Bucket Financial Separation for this Claim */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-md text-xs font-mono tabular-nums">
              <div>
                <div className="text-slate-500">Potential Value</div>
                <div className="text-sm font-bold text-slate-900">
                  ₹{activeClaim.potentialAmountInr}
                </div>
              </div>
              <div>
                <div className="text-slate-500">Requested Amount</div>
                <div className="text-sm font-bold text-amber-700">
                  ₹{activeClaim.requestedAmountInr}
                </div>
              </div>
              <div>
                <div className="text-slate-500">Approved Amount</div>
                <div className="text-sm font-bold text-slate-900">
                  ₹{activeClaim.approvedAmountInr}
                </div>
              </div>
              <div>
                <div className="text-slate-500">Received Payout</div>
                <div className="text-sm font-bold text-emerald-700">
                  ₹{activeClaim.receivedAmountInr}
                </div>
              </div>
            </div>

            {missingEvidenceAlert.length > 0 && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-md text-xs space-y-1">
                <div className="font-semibold text-amber-900">
                  Evidence Checklist Audit Before Submission:
                </div>
                <ul className="list-disc pl-4 text-amber-800 space-y-0.5">
                  {missingEvidenceAlert.map((m, idx) => (
                    <li key={idx}>{m}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                Factual Case Explanation (For Amazon.in Seller Support Submission)
              </label>
              <textarea
                rows={4}
                value={explanationDraft}
                onChange={(e) => setExplanationDraft(e.target.value)}
                className="w-full p-3 text-xs border border-slate-300 rounded-md"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  Requested Resolution Statement
                </label>
                <textarea
                  rows={2}
                  value={resolutionDraft}
                  onChange={(e) => setResolutionDraft(e.target.value)}
                  className="w-full p-2.5 text-xs border border-slate-300 rounded-md"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  Amazon Seller Central Case ID / SAFE-T Reference
                </label>
                <input
                  type="text"
                  value={caseIdInput}
                  onChange={(e) => setCaseIdInput(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-md"
                />
                <p className="text-xs text-slate-500">
                  Tracks the official Seller Central case reference for reconciliation.
                </p>
              </div>
            </div>

            <label className="flex items-start gap-2.5 p-3 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-800 cursor-pointer">
              <input
                type="checkbox"
                checked={accuracyConfirmed}
                onChange={(e) => setAccuracyConfirmed(e.target.checked)}
                className="mt-0.5 rounded border-slate-300"
              />
              <span>
                <strong>Seller Factual Accuracy Confirmation (Mandatory):</strong> I confirm that
                all order IDs, shipment IDs, unit counts, and attached GST invoices are authentic
                and unaltered, and that no duplicate claim has been filed for these units.
              </span>
            </label>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleTransitionClaimStatus('Under Review')}
                  className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md cursor-pointer"
                >
                  Save as Under Review
                </button>
                <button
                  type="button"
                  onClick={() => handleTransitionClaimStatus('Submitted to Seller Central')}
                  className="px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md cursor-pointer"
                >
                  Record Official Submission to Seller Central
                </button>
                <button
                  type="button"
                  onClick={() => handleTransitionClaimStatus('Reimbursement Confirmed')}
                  className="px-3.5 py-1.5 text-xs font-semibold text-emerald-900 bg-emerald-100 hover:bg-emerald-200 rounded-md cursor-pointer"
                >
                  Verify Payout Received in Financial Report
                </button>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
};
