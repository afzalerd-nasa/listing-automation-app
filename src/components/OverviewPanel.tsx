import React from 'react';
import {
  ProductRecord,
  ClaimRecord,
  ListingErrorRecord,
  NavigationTab,
  SpApiConnectionRecord,
} from '../types';
import {
  ArrowUpRight,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Sparkles,
  Scale,
  Database,
  RefreshCw,
} from 'lucide-react';

interface OverviewPanelProps {
  products: ProductRecord[];
  claims: ClaimRecord[];
  errors: ListingErrorRecord[];
  connection: SpApiConnectionRecord | null;
  isSeeding: boolean;
  onSeedWorkspace: () => void;
  onNavigate: (tab: NavigationTab) => void;
}

export const OverviewPanel: React.FC<OverviewPanelProps> = ({
  products,
  claims,
  errors,
  connection,
  isSeeding,
  onSeedWorkspace,
  onNavigate,
}) => {
  // 10 Required Dashboard Statistics
  const totalImportedProducts = products.length;
  const draftListings = products.filter((p) => p.status === 'Draft').length;
  const listingsRequiringReview = products.filter(
    (p) => p.status === 'Needs Review' || p.missingFieldsCount > 0
  ).length;
  const publishedVerifiedByApi = products.filter(
    (p) =>
      p.status === 'Published (SP-API Verified)' &&
      p.spApiSubmissionId &&
      p.spApiSubmissionId !== 'Not Submitted'
  ).length;
  const failedListingSubmissions = products.filter(
    (p) => p.status === 'Submission Failed'
  ).length;

  const potentialClaimOpportunities = claims.filter(
    (c) => c.eligibilityStatus === 'Potentially eligible' || c.workflowStatus === 'Candidate'
  ).length;
  const claimsUnderReview = claims.filter((c) => c.workflowStatus === 'Under Review').length;
  const claimsSubmitted = claims.filter(
    (c) => c.workflowStatus === 'Submitted to Seller Central'
  ).length;
  const reimbursementsConfirmed = claims.filter(
    (c) => c.workflowStatus === 'Reimbursement Confirmed'
  ).length;

  // Strictly separated financial states (Potential, Requested, Approved, Received)
  const potentialInrTotal = claims.reduce((acc, c) => acc + (c.potentialAmountInr || 0), 0);
  const requestedInrTotal = claims.reduce((acc, c) => acc + (c.requestedAmountInr || 0), 0);
  const approvedInrTotal = claims.reduce((acc, c) => acc + (c.approvedAmountInr || 0), 0);
  const receivedInrTotal = claims
    .filter((c) => c.workflowStatus === 'Reimbursement Confirmed')
    .reduce((acc, c) => acc + (c.receivedAmountInr || 0), 0);

  const openErrorsCount = errors.filter((e) => e.status !== 'Resolved (SP-API Verified)').length;

  const formatInr = (amount: number) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);

  return (
    <div className="space-y-8">
      {/* Top Context Banner */}
      <div className="bg-white border border-slate-200 rounded-lg p-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div className="space-y-1.5 max-w-2xl">
          <div className="text-xs font-medium text-slate-500 flex items-center gap-2">
            <span>Amazon.in Marketplace (A21TJRUUN4KGV)</span>
            <span aria-hidden="true">·</span>
            <span>Mode: {connection?.mode || 'SANDBOX'}</span>
            <span aria-hidden="true">·</span>
            <span>Strict Verification Governance</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Seller Operations & Reimbursement Command Center
          </h1>
          <p className="text-sm text-slate-600 leading-relaxed">
            AI recommendations, draft listings, and claim calculations remain strictly separated
            from verified Amazon SP-API actions. No listing or reimbursement is marked complete
            until confirmed by an authorized system response.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          {products.length === 0 && (
            <button
              onClick={onSeedWorkspace}
              disabled={isSeeding}
              className="px-4 py-2 text-xs font-semibold text-amber-950 bg-amber-400 hover:bg-amber-500 rounded-md transition-colors flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
            >
              <Database className="w-4 h-4" />
              {isSeeding ? 'Loading Sample Catalog...' : 'Load Sample Amazon.in Workspace'}
            </button>
          )}
          <button
            onClick={() => onNavigate('products')}
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            Extract Product Details
          </button>
          <button
            onClick={() => onNavigate('claims')}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Scale className="w-4 h-4" />
            Audit Claims
          </button>
        </div>
      </div>

      {/* 10 Mandatory Dashboard Statistics Grid */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">
            01. Catalog & Reimbursement Operational Telemetry
          </h2>
          <span className="text-xs text-slate-500">
            Updated via real-time tenant ledger · Tabular figures
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 border border-slate-200 rounded-lg bg-white divide-y md:divide-y-0 md:divide-x divide-slate-200">
          <div className="p-4 space-y-1">
            <div className="text-xs text-slate-500">Total Imported Products</div>
            <div className="text-2xl font-bold font-mono tabular-nums text-slate-900">
              {totalImportedProducts}
            </div>
            <div className="text-xs text-slate-500">Catalog & supplier records</div>
          </div>

          <div className="p-4 space-y-1">
            <div className="text-xs text-slate-500">Draft Listings</div>
            <div className="text-2xl font-bold font-mono tabular-nums text-slate-900">
              {draftListings}
            </div>
            <div className="text-xs text-slate-500">AI recommendation state</div>
          </div>

          <div className="p-4 space-y-1">
            <div className="text-xs text-slate-500">Listings Requiring Review</div>
            <div className="text-2xl font-bold font-mono tabular-nums text-amber-700">
              {listingsRequiringReview}
            </div>
            <div className="text-xs text-amber-700">Missing or conflicted fields</div>
          </div>

          <div className="p-4 space-y-1">
            <div className="text-xs text-slate-500">Published (Verified by API)</div>
            <div className="text-2xl font-bold font-mono tabular-nums text-emerald-700">
              {publishedVerifiedByApi}
            </div>
            <div className="text-xs text-emerald-700">SP-API submission confirmed</div>
          </div>

          <div className="p-4 space-y-1">
            <div className="text-xs text-slate-500">Failed Listing Submissions</div>
            <div className="text-2xl font-bold font-mono tabular-nums text-red-700">
              {failedListingSubmissions}
            </div>
            <div className="text-xs text-slate-500">{openErrorsCount} open feed/catalog errors</div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 border border-slate-200 rounded-lg bg-white divide-y md:divide-y-0 md:divide-x divide-slate-200">
          <div className="p-4 space-y-1">
            <div className="text-xs text-slate-500">Potential Claim Opportunities</div>
            <div className="text-2xl font-bold font-mono tabular-nums text-slate-900">
              {potentialClaimOpportunities}
            </div>
            <div className="text-xs text-slate-500">Policy rule matches</div>
          </div>

          <div className="p-4 space-y-1">
            <div className="text-xs text-slate-500">Claims Under Review</div>
            <div className="text-2xl font-bold font-mono tabular-nums text-amber-700">
              {claimsUnderReview}
            </div>
            <div className="text-xs text-slate-500">Awaiting evidence / sign-off</div>
          </div>

          <div className="p-4 space-y-1">
            <div className="text-xs text-slate-500">Claims Submitted</div>
            <div className="text-2xl font-bold font-mono tabular-nums text-slate-900">
              {claimsSubmitted}
            </div>
            <div className="text-xs text-slate-500">Active Seller Central cases</div>
          </div>

          <div className="p-4 space-y-1">
            <div className="text-xs text-slate-500">Reimbursements Confirmed</div>
            <div className="text-2xl font-bold font-mono tabular-nums text-emerald-700">
              {reimbursementsConfirmed}
            </div>
            <div className="text-xs text-emerald-700">Verified settlement IDs</div>
          </div>

          <div className="p-4 space-y-1">
            <div className="text-xs text-slate-500">Confirmed Reimbursement Total</div>
            <div className="text-2xl font-bold font-mono tabular-nums text-emerald-700">
              {formatInr(receivedInrTotal)}
            </div>
            <div className="text-xs text-slate-500">Actual recovered funds only</div>
          </div>
        </div>
      </section>

      {/* Strictly Separated Financial Reconciliation Bar */}
      <section className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              02. Reimbursement Financial Segregation Ledger (INR)
            </h2>
            <p className="text-xs text-slate-500">
              Potential, requested, approved, and received amounts are tracked in separate buckets.
              Requested claims are never counted as recovered revenue.
            </p>
          </div>
          <button
            onClick={() => onNavigate('claims')}
            className="text-xs font-semibold text-slate-900 hover:underline flex items-center gap-1 self-start sm:self-auto whitespace-nowrap shrink-0 cursor-pointer"
          >
            Open Claims Ledger
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="space-y-1">
            <div className="text-xs text-slate-500">1. Potential Discrepancy Value</div>
            <div className="text-xl font-bold font-mono tabular-nums text-slate-900">
              {formatInr(potentialInrTotal)}
            </div>
            <div className="text-xs text-slate-500">
              Identified via FBA / Easy Ship ledger rules (Unclaimed)
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-xs text-slate-500">2. Requested in Seller Central</div>
            <div className="text-xl font-bold font-mono tabular-nums text-amber-700">
              {formatInr(requestedInrTotal)}
            </div>
            <div className="text-xs text-slate-500">
              Submitted with seller accuracy confirmation (Pending)
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-xs text-slate-500">3. Approved by Amazon Support</div>
            <div className="text-xl font-bold font-mono tabular-nums text-slate-900">
              {formatInr(approvedInrTotal)}
            </div>
            <div className="text-xs text-slate-500">
              Approved case resolution amount awaiting settlement
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-xs text-slate-500">4. Confirmed & Received Payouts</div>
            <div className="text-xl font-bold font-mono tabular-nums text-emerald-700">
              {formatInr(receivedInrTotal)}
            </div>
            <div className="text-xs text-emerald-700">
              Reconciled against SP-API Financial Events API
            </div>
          </div>
        </div>
      </section>

      {/* Two-Column Actionable Queues: Products Requiring Review & Open Listing Errors */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Catalog Items Queue */}
        <section className="bg-white border border-slate-200 rounded-lg overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                03. Product Catalog & SP-API Verification Status
              </h3>
              <p className="text-xs text-slate-500">
                Distinguishes AI-extracted drafts from SP-API verified listings
              </p>
            </div>
            <button
              onClick={() => onNavigate('generator')}
              className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Open Listing Generator
            </button>
          </div>

          {products.length === 0 ? (
            <div className="p-8 text-center space-y-3">
              <p className="text-sm text-slate-600">
                No products in your tenant catalog yet. Load the sample Amazon.in seller catalog or
                extract a product from a supplier invoice.
              </p>
              <div className="flex justify-center gap-3">
                <button
                  onClick={onSeedWorkspace}
                  disabled={isSeeding}
                  className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors cursor-pointer"
                >
                  {isSeeding ? 'Seeding...' : 'Seed Sample Amazon.in Catalog'}
                </button>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {products.slice(0, 5).map((item) => (
                <div
                  key={item.id}
                  className="px-5 py-3.5 hover:bg-slate-50 transition-colors flex items-center justify-between gap-4"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="text-sm font-medium text-slate-900 truncate">{item.title}</div>
                    <div className="text-xs text-slate-500 font-mono tabular-nums flex flex-wrap items-center gap-2">
                      <span>SKU: {item.sku}</span>
                      <span aria-hidden="true">·</span>
                      <span>ASIN: {item.asin}</span>
                      <span aria-hidden="true">·</span>
                      <span>MRP: {formatInr(item.mrpInr)}</span>
                      <span aria-hidden="true">·</span>
                      <span>Offer: {formatInr(item.sellingPriceInr)}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0 space-y-1">
                    <div
                      className={`text-xs font-semibold ${
                        item.status === 'Published (SP-API Verified)'
                          ? 'text-emerald-700'
                          : item.status === 'Needs Review' || item.status === 'Submission Failed'
                          ? 'text-amber-700'
                          : 'text-slate-700'
                      }`}
                    >
                      {item.status}
                    </div>
                    <div className="text-xs text-slate-500 font-mono tabular-nums">
                      Confidence: {item.confidenceScore}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Active Listing Error Queue */}
        <section className="bg-white border border-slate-200 rounded-lg overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                04. Active Amazon.in Listing Error Diagnostics
              </h3>
              <p className="text-xs text-slate-500">
                Requires explicit Seller/Reviewer approval before SP-API patch
              </p>
            </div>
            <button
              onClick={() => onNavigate('errors')}
              className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Resolve Errors ({openErrorsCount})
            </button>
          </div>

          {errors.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">
              No active SP-API listing errors recorded.
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {errors.slice(0, 5).map((err) => (
                <div
                  key={err.id}
                  className="px-5 py-3.5 hover:bg-slate-50 transition-colors space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-xs font-mono tabular-nums text-slate-600">
                      <span>Code {err.errorCode}</span>
                      <span aria-hidden="true"> · </span>
                      <span>SKU: {err.sku}</span>
                      <span aria-hidden="true"> · </span>
                      <span
                        className={
                          err.severity === 'ERROR' || err.severity === 'SUPPRESSED'
                            ? 'text-red-700 font-semibold'
                            : 'text-amber-700 font-semibold'
                        }
                      >
                        {err.severity}
                      </span>
                    </div>
                    <span
                      className={`text-xs font-medium ${
                        err.status === 'Resolved (SP-API Verified)'
                          ? 'text-emerald-700'
                          : 'text-amber-700'
                      }`}
                    >
                      {err.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-800 line-clamp-1">{err.plainExplanation}</p>
                  <div className="text-xs font-mono tabular-nums text-slate-500">
                    Field: {err.fieldAffected} | Old: &quot;{err.oldValue}&quot; → Proposed: &quot;
                    {err.proposedValue}&quot;
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
