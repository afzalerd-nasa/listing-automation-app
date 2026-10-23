import React, { useState, useEffect } from 'react';
import {
  ProductRecord,
  ListingErrorRecord,
  UserProfile,
  SpApiConnectionRecord,
} from '../types';
import {
  saveProductRecord,
  updateListingErrorStatus,
  createAuditLog,
} from '../services/firestoreService';
import {
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Send,
  ShieldCheck,
  Wrench,
  RefreshCw,
} from 'lucide-react';

interface ListingGeneratorModuleProps {
  modeView: 'generator' | 'errors';
  user: UserProfile;
  products: ProductRecord[];
  errors: ListingErrorRecord[];
  selectedProduct: ProductRecord | null;
  connection: SpApiConnectionRecord | null;
  onSelectProduct: (p: ProductRecord) => void;
}

const CATEGORY_RULE_DEFINITIONS: Record<
  string,
  {
    name: string;
    maxTitle: number;
    bulletsCount: number;
    maxBulletChars: number;
    mandatoryFields: string[];
    restrictedClaims: string[];
    imageChecklist: string[];
  }
> = {
  HOME_KITCHEN: {
    name: 'Home & Kitchen (Amazon.in)',
    maxTitle: 200,
    bulletsCount: 5,
    maxBulletChars: 250,
    mandatoryFields: ['countryOfOrigin', 'hsnCode', 'mrpInr', 'manufacturer', 'dimensions', 'weight'],
    restrictedClaims: ['ISI Certified', 'BIS Approved', '100% BPA Free', 'Antibacterial'],
    imageChecklist: [
      'Pure white background (RGB 255,255,255), product fills >= 85% of frame',
      'Minimum 1000 x 1000 px for Amazon.in hover zoom',
      'Dimension & capacity infographic in cm / ml',
      'Legal Metrology MRP & Country of Origin label visibility',
    ],
  },
  CONSUMER_ELECTRONICS: {
    name: 'Electronics & Accessories (Amazon.in)',
    maxTitle: 150,
    bulletsCount: 5,
    maxBulletChars: 220,
    mandatoryFields: ['countryOfOrigin', 'hsnCode', 'mrpInr', 'modelNumber', 'partNumber', 'weight'],
    restrictedClaims: ['BIS CRS Registered', 'Waterproof', 'IP68', 'Military Grade'],
    imageChecklist: [
      'Main product shot on pure white background without packaging box',
      'BIS CRS R-Number registration compliance mark verification',
      'In-the-box accessories flatlay matching includedAccessories attribute',
    ],
  },
  APPAREL: {
    name: 'Clothing & Ethnic Wear (Amazon.in)',
    maxTitle: 120,
    bulletsCount: 5,
    maxBulletChars: 200,
    mandatoryFields: ['countryOfOrigin', 'hsnCode', 'mrpInr', 'color', 'size', 'material'],
    restrictedClaims: ['100% Organic Cotton', 'Handloom Mark', 'Silk Mark Certified'],
    imageChecklist: [
      'Front, back, and fabric detail shot at >= 1200 x 1600 px',
      'Indian size chart (Chest, Shoulder, Length in inches & cm)',
      'No mannequins or text watermarks on main image',
    ],
  },
  GROCERY_GOURMET: {
    name: 'Grocery & Gourmet Foods (Amazon.in)',
    maxTitle: 150,
    bulletsCount: 5,
    maxBulletChars: 220,
    mandatoryFields: ['countryOfOrigin', 'hsnCode', 'mrpInr', 'weight', 'packageQuantity'],
    restrictedClaims: ['Organic', 'Jaivik Bharat', 'FSSAI Licensed', '100% Natural', 'Sugar Free'],
    imageChecklist: [
      'Front and back of pack showing 14-digit FSSAI License Number',
      'Vegetarian (green dot) / Non-Veg declaration clearly visible',
      'Nutritional table, Net Weight, and MRP legible',
    ],
  },
};

export const ListingGeneratorModule: React.FC<ListingGeneratorModuleProps> = ({
  modeView,
  user,
  products,
  errors,
  selectedProduct,
  connection,
  onSelectProduct,
}) => {
  const activeProduct = selectedProduct || products[0] || null;

  const [titleDraft, setTitleDraft] = useState('');
  const [bulletsDraft, setBulletsDraft] = useState<string[]>(['', '', '', '', '']);
  const [descriptionDraft, setDescriptionDraft] = useState('');
  const [keywordsDraft, setKeywordsDraft] = useState('');
  const [countryDraft, setCountryDraft] = useState('');
  const [partNumberDraft, setPartNumberDraft] = useState('');
  const [mrpDraft, setMrpDraft] = useState<number>(0);
  const [sellingPriceDraft, setSellingPriceDraft] = useState<number>(0);
  const [evidenceBackedClaims, setEvidenceBackedClaims] = useState<string>('');
  const [imageChecks, setImageChecks] = useState<boolean[]>([true, true, true, true]);

  const [isGenerating, setIsGenerating] = useState(false);
  const [isSubmittingSpApi, setIsSubmittingSpApi] = useState(false);
  const [sellerApprovedDraft, setSellerApprovedDraft] = useState(false);
  const [spApiResponseBanner, setSpApiResponseBanner] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Module E Error Fixer state
  const [editedProposedValues, setEditedProposedValues] = useState<Record<string, string>>({});
  const [resolvingErrorId, setResolvingErrorId] = useState<string | null>(null);
  const [errorResolutionMessage, setErrorResolutionMessage] = useState<string | null>(null);

  useEffect(() => {
    if (activeProduct) {
      setTitleDraft(activeProduct.title);
      const b = [...(activeProduct.bullets || [])];
      while (b.length < 5) b.push('');
      setBulletsDraft(b.slice(0, 5));
      setDescriptionDraft(activeProduct.description);
      setKeywordsDraft(activeProduct.searchKeywords);
      setCountryDraft(activeProduct.countryOfOrigin);
      setPartNumberDraft(activeProduct.partNumber);
      setMrpDraft(activeProduct.mrpInr);
      setSellingPriceDraft(activeProduct.sellingPriceInr);
      setSellerApprovedDraft(false);
      setSpApiResponseBanner(null);
    }
  }, [activeProduct?.id]);

  const currentRules =
    CATEGORY_RULE_DEFINITIONS[activeProduct?.category || 'HOME_KITCHEN'] ||
    CATEGORY_RULE_DEFINITIONS.HOME_KITCHEN;

  // Real-time Deterministic Category & Compliance Quality Checks
  const computeQualityChecks = () => {
    const issues: string[] = [];
    const warnings: string[] = [];

    if (titleDraft.length > currentRules.maxTitle) {
      issues.push(
        `Title length (${titleDraft.length} chars) exceeds ${currentRules.name} limit of ${currentRules.maxTitle} chars.`
      );
    }
    if (!countryDraft || countryDraft === 'Needs Review') {
      issues.push(
        'Mandatory Amazon.in Legal Metrology attribute "countryOfOrigin" is marked Needs Review.'
      );
    }
    if (!mrpDraft || mrpDraft <= 0) {
      issues.push('Maximum Retail Price (MRP in INR) is mandatory on Amazon.in.');
    }
    if (sellingPriceDraft > mrpDraft && mrpDraft > 0) {
      issues.push(
        `Selling Price (₹${sellingPriceDraft}) cannot exceed Maximum Retail Price (MRP ₹${mrpDraft}) under Indian Legal Metrology rules.`
      );
    }

    const keywordBytes = new TextEncoder().encode(keywordsDraft).length;
    if (keywordBytes > 249) {
      issues.push(`Backend search terms (${keywordBytes} bytes) exceed the 249-byte SP-API limit.`);
    }

    // Check restricted claims in title/bullets/description
    const combinedText = `${titleDraft} ${bulletsDraft.join(' ')} ${descriptionDraft}`.toLowerCase();
    const restrictedTerms = ['organic', 'waterproof', 'isi certified', 'bis approved', '100% cure', 'guaranteed'];
    restrictedTerms.forEach((term) => {
      if (
        combinedText.includes(term) &&
        !evidenceBackedClaims.toLowerCase().includes(term)
      ) {
        warnings.push(
          `Restricted claim "${term}" detected without matching certificate in Evidence Field.`
        );
      }
    });

    // Check duplicate keyword stuffing
    const words = keywordsDraft
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 3);
    const seen = new Set<string>();
    const dupes = new Set<string>();
    words.forEach((w) => {
      if (seen.has(w)) dupes.add(w);
      seen.add(w);
    });
    if (dupes.size > 0) {
      warnings.push(`Duplicate backend keywords detected: ${Array.from(dupes).join(', ')}`);
    }

    return {
      issues,
      warnings,
      keywordBytes,
      isValidForPublish: issues.length === 0,
    };
  };

  const quality = computeQualityChecks();

  const handleGenerateListingWithAi = async () => {
    if (!activeProduct) return;
    setIsGenerating(true);
    setSpApiResponseBanner(null);
    try {
      const resp = await fetch('/api/ai/generate-listing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productFacts: {
            ...activeProduct,
            title: titleDraft,
            countryOfOrigin: countryDraft,
            partNumber: partNumberDraft,
            mrpInr: mrpDraft,
            sellingPriceInr: sellingPriceDraft,
          },
          category: activeProduct.category,
          productType: activeProduct.productType,
          evidenceProvided: evidenceBackedClaims
            ? evidenceBackedClaims.split(',').map((s) => s.trim())
            : [],
        }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data.error || 'Failed to generate listing');
      }
      const l = data.listing;
      if (l.optimizedTitle) setTitleDraft(l.optimizedTitle);
      if (Array.isArray(l.bullets) && l.bullets.length > 0) {
        const padded = [...l.bullets];
        while (padded.length < 5) padded.push('');
        setBulletsDraft(padded.slice(0, 5));
      }
      if (l.description) setDescriptionDraft(l.description);
      if (l.searchKeywords) setKeywordsDraft(l.searchKeywords);

      await createAuditLog(
        user.uid,
        user.email,
        user.role,
        `Generated Amazon.in Listing Draft for SKU ${activeProduct.sku}`,
        'Module B: AI Listing Generator',
        activeProduct.id,
        `Applied ${activeProduct.category} rules (Max title ${currentRules.maxTitle} chars). Draft requires approval before SP-API publish.`,
        'AI Recommendation Only'
      );
    } catch (err: any) {
      setSpApiResponseBanner({
        type: 'error',
        text: err?.message || 'AI generation failed',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePublishToSpApi = async () => {
    if (!activeProduct) return;
    setIsSubmittingSpApi(true);
    setSpApiResponseBanner(null);
    try {
      const resp = await fetch('/api/sp-api/listings/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approvedByUser: sellerApprovedDraft,
          mode: connection?.mode || 'SANDBOX',
          product: {
            ...activeProduct,
            title: titleDraft,
            bullets: bulletsDraft,
            description: descriptionDraft,
            searchKeywords: keywordsDraft,
            countryOfOrigin: countryDraft,
            partNumber: partNumberDraft,
            mrpInr: mrpDraft,
            sellingPriceInr: sellingPriceDraft,
          },
        }),
      });
      const data = await resp.json();

      if (!resp.ok || !data.verifiedByApi) {
        await saveProductRecord(
          user.uid,
          {
            ...activeProduct,
            title: titleDraft,
            bullets: bulletsDraft,
            description: descriptionDraft,
            searchKeywords: keywordsDraft,
            countryOfOrigin: countryDraft,
            partNumber: partNumberDraft,
            mrpInr: mrpDraft,
            sellingPriceInr: sellingPriceDraft,
            status: 'Submission Failed',
          },
          activeProduct.id
        );

        await createAuditLog(
          user.uid,
          user.email,
          user.role,
          `SP-API Listing Submission Rejected (${activeProduct.sku})`,
          'Module C: SP-API Listings',
          activeProduct.sku,
          data.errors?.[0]?.message || data.error || 'Validation failed.',
          'Failed'
        );

        setSpApiResponseBanner({
          type: 'error',
          text:
            data.errors?.[0]?.message ||
            data.error ||
            'SP-API rejected submission due to incomplete attributes.',
        });
        return;
      }

      await saveProductRecord(
        user.uid,
        {
          ...activeProduct,
          title: titleDraft,
          bullets: bulletsDraft,
          description: descriptionDraft,
          searchKeywords: keywordsDraft,
          countryOfOrigin: countryDraft,
          partNumber: partNumberDraft,
          mrpInr: mrpDraft,
          sellingPriceInr: sellingPriceDraft,
          status: 'Published (SP-API Verified)',
          spApiSubmissionId: data.submissionId,
          spApiVerifiedAt: data.verifiedAt,
          missingFieldsCount: 0,
        },
        activeProduct.id
      );

      await createAuditLog(
        user.uid,
        user.email,
        user.role,
        `Published & Verified Listing via SP-API (${activeProduct.sku})`,
        'Module C: SP-API Listings',
        data.submissionId,
        `${data.message} Request ID: ${data.requestId}. Approved by ${user.role} (${user.email}).`,
        data.mode === 'LIVE_PRODUCTION' ? 'SP-API Verified' : 'Sandbox Simulated'
      );

      setSpApiResponseBanner({
        type: 'success',
        text: `${data.message} · Request ID: ${data.requestId} · Processing Status: ${data.processingStatus}`,
      });
    } catch (err: any) {
      setSpApiResponseBanner({
        type: 'error',
        text: err?.message || 'SP-API network error',
      });
    } finally {
      setIsSubmittingSpApi(false);
    }
  };

  // Module E: Approve & Publish Listing Error Fix via SP-API
  const handleApproveAndResolveError = async (errRecord: ListingErrorRecord) => {
    setResolvingErrorId(errRecord.id);
    setErrorResolutionMessage(null);
    const finalProposed =
      editedProposedValues[errRecord.id] !== undefined
        ? editedProposedValues[errRecord.id]
        : errRecord.proposedValue;

    try {
      const resp = await fetch('/api/sp-api/errors/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sku: errRecord.sku,
          errorCode: errRecord.errorCode,
          fieldAffected: errRecord.fieldAffected,
          proposedValue: finalProposed,
          approvedByUser: true,
          mode: connection?.mode || 'SANDBOX',
        }),
      });
      const data = await resp.json();
      if (!resp.ok || !data.verifiedByApi) {
        throw new Error(data.error || 'SP-API patch rejected');
      }

      await updateListingErrorStatus(
        errRecord.id,
        finalProposed,
        'Resolved (SP-API Verified)',
        data.verificationId,
        `${errRecord.plainExplanation} [Verified via SP-API Patch ${data.verificationId}]`
      );

      // Also patch the matching product in Firestore if present
      const matchingProduct = products.find(
        (p) => p.id === errRecord.productId || p.sku === errRecord.sku
      );
      if (matchingProduct) {
        const updatedProduct: Partial<ProductRecord> = { ...matchingProduct };
        if (errRecord.fieldAffected === 'countryOfOrigin') {
          updatedProduct.countryOfOrigin = finalProposed;
        } else if (errRecord.fieldAffected === 'weight') {
          updatedProduct.weight = finalProposed;
        } else if (errRecord.fieldAffected === 'partNumber') {
          updatedProduct.partNumber = finalProposed;
        }
        updatedProduct.missingFieldsCount = Math.max(
          0,
          (matchingProduct.missingFieldsCount || 1) - 1
        );
        await saveProductRecord(user.uid, updatedProduct, matchingProduct.id);
      }

      await createAuditLog(
        user.uid,
        user.email,
        user.role,
        `Resolved SP-API Error ${errRecord.errorCode} on SKU ${errRecord.sku}`,
        'Module E: Error Fixer',
        data.verificationId,
        `Patched ${errRecord.fieldAffected} from "${errRecord.oldValue}" to "${finalProposed}". Verification ID: ${data.verificationId}.`,
        'SP-API Verified'
      );

      setErrorResolutionMessage(
        `Verified SP-API Patch (${data.verificationId}): ${errRecord.sku}.${errRecord.fieldAffected} updated to "${finalProposed}".`
      );
    } catch (err: any) {
      setErrorResolutionMessage(`Error Resolution Failed: ${err?.message || 'Unknown error'}`);
    } finally {
      setResolvingErrorId(null);
    }
  };

  if (modeView === 'errors') {
    return (
      <div className="space-y-6">
        <div className="bg-white border border-slate-200 rounded-lg p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-lg font-bold text-slate-900">
              Module E: Automated Listing Error Fixer &amp; Suppression Diagnostics
            </h1>
            <p className="text-xs text-slate-600">
              Inspects actual Amazon SP-API error payloads, translates the cause into plain language,
              compares Old vs. Proposed values, and patches only after explicit Seller/Reviewer
              approval.
            </p>
          </div>
          <div className="text-xs font-mono tabular-nums text-slate-500">
            Active Role: {user.role} · Protected Catalog Attributes Guarded
          </div>
        </div>

        {errorResolutionMessage && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-xs font-mono text-emerald-900">
            {errorResolutionMessage}
          </div>
        )}

        <div className="space-y-4">
          {errors.map((err) => {
            const currentVal =
              editedProposedValues[err.id] !== undefined
                ? editedProposedValues[err.id]
                : err.proposedValue;
            const isResolved = err.status === 'Resolved (SP-API Verified)';

            return (
              <div
                key={err.id}
                className="bg-white border border-slate-200 rounded-lg p-6 space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-3">
                  <div className="flex flex-wrap items-center gap-2 text-xs font-mono tabular-nums">
                    <span
                      className={
                        err.severity === 'ERROR' || err.severity === 'SUPPRESSED'
                          ? 'text-red-700 font-bold'
                          : 'text-amber-700 font-bold'
                      }
                    >
                      [{err.severity} · Code {err.errorCode}]
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="font-semibold text-slate-900">SKU: {err.sku}</span>
                    <span aria-hidden="true">·</span>
                    <span className="text-slate-500">ASIN: {err.asin}</span>
                    <span aria-hidden="true">·</span>
                    <span className="text-slate-700">{err.issueType}</span>
                  </div>

                  <div className="text-xs font-mono tabular-nums">
                    <span
                      className={
                        isResolved ? 'text-emerald-700 font-semibold' : 'text-amber-700 font-semibold'
                      }
                    >
                      Status: {err.status}
                    </span>
                    {err.spApiVerificationId !== 'Pending Seller Approval' && (
                      <span className="text-slate-500"> · ID: {err.spApiVerificationId}</span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-xs">
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-md space-y-1">
                    <div className="font-semibold text-slate-700">
                      1. Actual Amazon SP-API Response Message:
                    </div>
                    <p className="font-mono text-slate-800">{err.amazonMessage}</p>
                  </div>

                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-md space-y-1">
                    <div className="font-semibold text-slate-700">
                      2. Plain-Language Root Cause &amp; Compliance Rule:
                    </div>
                    <p className="text-slate-700 leading-relaxed">{err.plainExplanation}</p>
                  </div>
                </div>

                {/* Old vs Proposed Diff + Approval Control */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end pt-2">
                  <div className="p-3 border border-slate-200 rounded-md bg-slate-50/50 space-y-1">
                    <div className="text-xs text-slate-500">
                      Current / Rejected Value ({err.fieldAffected})
                    </div>
                    <div className="text-sm font-mono font-semibold text-red-700">
                      {err.oldValue}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-700">
                      Proposed Correction ({err.fieldAffected})
                    </label>
                    <input
                      type="text"
                      disabled={isResolved}
                      value={currentVal}
                      onChange={(e) =>
                        setEditedProposedValues((prev) => ({
                          ...prev,
                          [err.id]: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-md disabled:bg-slate-100"
                    />
                  </div>

                  <div className="flex justify-end">
                    {isResolved ? (
                      <div className="px-4 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4" />
                        Verified by SP-API ({err.spApiVerificationId})
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleApproveAndResolveError(err)}
                        disabled={resolvingErrorId === err.id}
                        className="w-full md:w-auto px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        <Wrench className="w-3.5 h-3.5" />
                        {resolvingErrorId === err.id
                          ? 'Submitting SP-API Patch...'
                          : 'Approve & Patch via SP-API'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header & Product Selector */}
      <section className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <h1 className="text-lg font-bold text-slate-900">
              Module B: Amazon India (Amazon.in) Listing Generator &amp; Category Validator
            </h1>
            <p className="text-xs text-slate-600">
              Applies category-specific Amazon.in title limits, Legal Metrology checks, restricted
              claim filters, and submits approved drafts through SP-API Listings Items API.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <label className="text-xs font-semibold text-slate-700 whitespace-nowrap">
              Select Catalog Product:
            </label>
            <select
              value={activeProduct?.id || ''}
              onChange={(e) => {
                const found = products.find((p) => p.id === e.target.value);
                if (found) onSelectProduct(found);
              }}
              className="px-3 py-2 text-xs font-mono border border-slate-300 rounded-md bg-white"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.sku} — {p.title.slice(0, 48)} ({p.status})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Category-Specific Rules Matrix */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs bg-slate-50 p-4 rounded-md border border-slate-200">
          <div>
            <div className="text-slate-500">Active Marketplace Schema</div>
            <div className="font-semibold text-slate-900 mt-0.5">{currentRules.name}</div>
            <div className="font-mono text-slate-500 mt-0.5">
              Type: {activeProduct?.productType || 'STORAGE_CONTAINER'}
            </div>
          </div>
          <div>
            <div className="text-slate-500">Category Title &amp; Bullet Limits</div>
            <div className="font-mono tabular-nums font-semibold text-slate-900 mt-0.5">
              Max Title: {currentRules.maxTitle} chars · {currentRules.bulletsCount} Bullets
            </div>
            <div className="font-mono tabular-nums text-slate-500 mt-0.5">
              Current Title: {titleDraft.length} / {currentRules.maxTitle} chars
            </div>
          </div>
          <div>
            <div className="text-slate-500">Mandatory Legal Metrology Fields</div>
            <div className="font-mono text-slate-800 mt-0.5">
              {currentRules.mandatoryFields.join(', ')}
            </div>
          </div>
          <div>
            <div className="text-slate-500">Claims Requiring Evidence</div>
            <div className="text-amber-800 font-medium mt-0.5">
              {currentRules.restrictedClaims.join(' · ')}
            </div>
          </div>
        </div>
      </section>

      {/* Main Two-Column Generator & Live Validation Engine */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Listing Content & Compliance Attributes */}
        <section className="lg:col-span-2 bg-white border border-slate-200 rounded-lg p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-sm font-semibold text-slate-900">
              Listing Content &amp; Structured Compliance Fields
            </h2>
            <button
              type="button"
              onClick={handleGenerateListingWithAi}
              disabled={isGenerating || !activeProduct}
              className="px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {isGenerating
                ? 'Optimizing via Gemini AI...'
                : 'Generate Optimized Amazon.in Draft with AI'}
            </button>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <label className="font-semibold text-slate-700">Amazon.in Product Title</label>
              <span
                className={`font-mono tabular-nums ${
                  titleDraft.length > currentRules.maxTitle
                    ? 'text-red-700 font-bold'
                    : 'text-slate-500'
                }`}
              >
                {titleDraft.length} / {currentRules.maxTitle} chars
              </span>
            </div>
            <input
              type="text"
              value={titleDraft}
              onChange={(e) => {
                setTitleDraft(e.target.value);
                setSellerApprovedDraft(false);
              }}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-700">
              5 Category-Optimized Feature Bullets (&le; {currentRules.maxBulletChars} chars each)
            </label>
            {bulletsDraft.map((b, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-slate-400 w-6">0{idx + 1}.</span>
                  <input
                    type="text"
                    value={b}
                    onChange={(e) => {
                      const next = [...bulletsDraft];
                      next[idx] = e.target.value;
                      setBulletsDraft(next);
                      setSellerApprovedDraft(false);
                    }}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700">
                Product Description
              </label>
              <textarea
                rows={4}
                value={descriptionDraft}
                onChange={(e) => {
                  setDescriptionDraft(e.target.value);
                  setSellerApprovedDraft(false);
                }}
                className="w-full p-2.5 text-xs border border-slate-300 rounded-md"
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <label className="font-semibold text-slate-700">Backend Search Terms</label>
                <span
                  className={`font-mono tabular-nums ${
                    quality.keywordBytes > 249 ? 'text-red-700 font-bold' : 'text-slate-500'
                  }`}
                >
                  {quality.keywordBytes} / 249 bytes
                </span>
              </div>
              <textarea
                rows={4}
                value={keywordsDraft}
                onChange={(e) => {
                  setKeywordsDraft(e.target.value);
                  setSellerApprovedDraft(false);
                }}
                className="w-full p-2.5 text-xs font-mono border border-slate-300 rounded-md"
              />
            </div>
          </div>

          {/* Compliance & Pricing Overrides */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-2 border-t border-slate-100">
            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-700">Country of Origin</label>
              <input
                type="text"
                value={countryDraft}
                onChange={(e) => {
                  setCountryDraft(e.target.value);
                  setSellerApprovedDraft(false);
                }}
                className={`w-full px-3 py-1.5 text-xs font-mono border rounded-md ${
                  countryDraft === 'Needs Review' || !countryDraft
                    ? 'border-amber-500 bg-amber-50'
                    : 'border-slate-300'
                }`}
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-700">Part Number</label>
              <input
                type="text"
                value={partNumberDraft}
                onChange={(e) => setPartNumberDraft(e.target.value)}
                className="w-full px-3 py-1.5 text-xs font-mono border border-slate-300 rounded-md"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-700">MRP (INR ₹)</label>
              <input
                type="number"
                value={mrpDraft}
                onChange={(e) => setMrpDraft(Number(e.target.value))}
                className="w-full px-3 py-1.5 text-xs font-mono tabular-nums border border-slate-300 rounded-md"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-700">Offer Price (INR ₹)</label>
              <input
                type="number"
                value={sellingPriceDraft}
                onChange={(e) => setSellingPriceDraft(Number(e.target.value))}
                className="w-full px-3 py-1.5 text-xs font-mono tabular-nums border border-slate-300 rounded-md"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-700">
              Verified Compliance Evidence for Restricted Claims (comma-separated, e.g. BIS CRS
              R-810023, Jaivik Bharat Organic Cert, IP68 Lab Report)
            </label>
            <input
              type="text"
              value={evidenceBackedClaims}
              onChange={(e) => setEvidenceBackedClaims(e.target.value)}
              placeholder="Leave blank if no restricted claims are used, or enter certificate reference..."
              className="w-full px-3 py-1.5 text-xs font-mono border border-slate-300 rounded-md"
            />
          </div>
        </section>

        {/* Right Column: Validation Engine, Image Checklist & SP-API Submission Gate */}
        <section className="bg-white border border-slate-200 rounded-lg p-6 space-y-6 flex flex-col justify-between">
          <div className="space-y-5">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-sm font-semibold text-slate-900">
                Real-Time Listing Quality &amp; Restriction Audit
              </h2>
              <p className="text-xs text-slate-500">
                Pre-flight verification against {currentRules.name} rules
              </p>
            </div>

            {/* Blocking Issues */}
            <div className="space-y-2">
              <div className="text-xs font-semibold text-slate-800">
                Blocking Attribute &amp; Compliance Checks ({quality.issues.length})
              </div>
              {quality.issues.length === 0 ? (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-md text-xs text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  All mandatory category and Legal Metrology checks passed.
                </div>
              ) : (
                <div className="space-y-1.5">
                  {quality.issues.map((iss, i) => (
                    <div
                      key={i}
                      className="p-2.5 bg-red-50 border border-red-200 rounded text-xs text-red-800"
                    >
                      {iss}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Restricted Claim & Keyword Stuffing Warnings */}
            <div className="space-y-2">
              <div className="text-xs font-semibold text-slate-800">
                Restricted Claims &amp; Keyword Stuffing Audit ({quality.warnings.length})
              </div>
              {quality.warnings.length === 0 ? (
                <div className="text-xs text-slate-500">
                  No unsupported restricted claims or duplicate keywords detected.
                </div>
              ) : (
                <div className="space-y-1.5">
                  {quality.warnings.map((w, i) => (
                    <div
                      key={i}
                      className="p-2.5 bg-amber-50 border border-amber-200 rounded text-xs text-amber-900"
                    >
                      {w}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Category Image Checklist */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <div className="text-xs font-semibold text-slate-800">
                Category Image Compliance Checklist
              </div>
              <div className="space-y-1.5">
                {currentRules.imageChecklist.map((reqText, idx) => (
                  <label key={idx} className="flex items-start gap-2 text-xs text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={imageChecks[idx] ?? true}
                      onChange={(e) => {
                        const next = [...imageChecks];
                        next[idx] = e.target.checked;
                        setImageChecks(next);
                      }}
                      className="mt-0.5 rounded border-slate-300"
                    />
                    <span>{reqText}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Seller / Reviewer Approval & SP-API Publish Action */}
          <div className="space-y-4 pt-4 border-t border-slate-200">
            <label className="flex items-start gap-2.5 text-xs text-slate-800 cursor-pointer bg-slate-50 p-3 rounded-md border border-slate-200">
              <input
                type="checkbox"
                checked={sellerApprovedDraft}
                onChange={(e) => setSellerApprovedDraft(e.target.checked)}
                className="mt-0.5 rounded border-slate-300"
              />
              <span>
                <strong>Seller / Reviewer Approval Gate:</strong> I have reviewed all AI-generated
                attributes, confirmed Country of Origin and MRP accuracy, and authorize submission
                to Amazon SP-API ({connection?.mode || 'SANDBOX'}).
              </span>
            </label>

            {spApiResponseBanner && (
              <div
                className={`p-3 rounded-md text-xs font-mono ${
                  spApiResponseBanner.type === 'success'
                    ? 'bg-emerald-50 border border-emerald-200 text-emerald-900'
                    : 'bg-red-50 border border-red-200 text-red-900'
                }`}
              >
                {spApiResponseBanner.text}
              </div>
            )}

            <button
              type="button"
              onClick={handlePublishToSpApi}
              disabled={isSubmittingSpApi || !activeProduct}
              className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              {isSubmittingSpApi
                ? 'Submitting to Amazon SP-API...'
                : `Submit Approved Listing via SP-API (${connection?.mode || 'SANDBOX'})`}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};
