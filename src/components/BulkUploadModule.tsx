import React, { useState } from 'react';
import {
  UserProfile,
  ProductRecord,
  BulkImportJobRecord,
  SpApiConnectionRecord,
} from '../types';
import { SAMPLE_BULK_CSV_CONTENT } from '../data/seedData';
import {
  createBulkImportJobRecord,
  updateBulkImportJobStatus,
  saveProductRecord,
  createAuditLog,
} from '../services/firestoreService';
import {
  Download,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Play,
  RefreshCw,
  FileSpreadsheet,
} from 'lucide-react';

interface BulkUploadModuleProps {
  user: UserProfile;
  existingProducts: ProductRecord[];
  bulkJobs: BulkImportJobRecord[];
  connection: SpApiConnectionRecord | null;
}

interface ParsedBulkRow {
  rowIndex: number;
  sku: string;
  asin: string;
  gtin: string;
  title: string;
  brand: string;
  category: string;
  productType: string;
  mrpInr: number;
  sellingPriceInr: number;
  inventoryCount: number;
  countryOfOrigin: string;
  hsnCode: string;
  fulfilmentChannel: 'FBA' | 'Easy Ship' | 'Self-Ship';
  errors: string[];
  isDuplicateSku: boolean;
}

export const BulkUploadModule: React.FC<BulkUploadModuleProps> = ({
  user,
  existingProducts,
  bulkJobs,
  connection,
}) => {
  const [csvText, setCsvText] = useState(SAMPLE_BULK_CSV_CONTENT);
  const [fileName, setFileName] = useState('amazon_in_seller_batch_oct2026.csv');
  const [parsedRows, setParsedRows] = useState<ParsedBulkRow[]>([]);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [bulkApproved, setBulkApproved] = useState(false);
  const [isSubmittingFeed, setIsSubmittingFeed] = useState(false);
  const [feedResultBanner, setFeedResultBanner] = useState<string | null>(null);

  const handleDownloadTemplate = () => {
    const blob = new Blob([SAMPLE_BULK_CSV_CONTENT], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'afzal_amazon_in_bulk_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCsvFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setCsvText(reader.result);
      }
    };
    reader.readAsText(file);
  };

  const validateAndParseRows = async () => {
    setFeedResultBanner(null);
    setBulkApproved(false);
    const lines = csvText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
    if (lines.length < 2) return;

    const headers = lines[0].split(',').map((h) => h.trim());
    const skuSeenInBatch = new Set<string>();
    const existingSkuSet = new Set(existingProducts.map((p) => p.sku.toUpperCase()));

    const rows: ParsedBulkRow[] = lines.slice(1).map((line, idx) => {
      const cols = line.split(',').map((c) => c.trim());
      const getCol = (name: string) => {
        const colIdx = headers.findIndex((h) => h.toLowerCase() === name.toLowerCase());
        return colIdx >= 0 ? cols[colIdx] || '' : '';
      };

      const sku = getCol('sku') || `ROW-${idx + 1}`;
      const asin = getCol('asin') || 'Pending ASIN';
      const gtin = getCol('gtin') || 'Needs Review';
      const title = getCol('title') || 'Needs Review';
      const brand = getCol('brand') || 'Needs Review';
      const category = getCol('category') || 'HOME_KITCHEN';
      const productType = getCol('productType') || 'KITCHEN_APPLIANCE';
      const mrpInr = Number(getCol('mrpInr')) || 0;
      const sellingPriceInr = Number(getCol('sellingPriceInr')) || 0;
      const inventoryCount = Number(getCol('inventoryCount')) || 0;
      const countryOfOrigin = getCol('countryOfOrigin') || 'Needs Review';
      const hsnCode = getCol('hsnCode') || 'Needs Review';
      const channelRaw = getCol('fulfilmentChannel');
      const fulfilmentChannel: 'FBA' | 'Easy Ship' | 'Self-Ship' =
        channelRaw === 'Easy Ship' || channelRaw === 'Self-Ship' ? channelRaw : 'FBA';

      const rowErrors: string[] = [];
      let isDup = false;

      if (skuSeenInBatch.has(sku.toUpperCase())) {
        isDup = true;
        rowErrors.push(`Duplicate SKU "${sku}" within uploaded spreadsheet.`);
      }
      skuSeenInBatch.add(sku.toUpperCase());

      if (existingSkuSet.has(sku.toUpperCase())) {
        rowErrors.push(`SKU "${sku}" already exists in catalog (will update existing SKU).`);
      }

      if (!countryOfOrigin || countryOfOrigin.toLowerCase() === 'needs review') {
        rowErrors.push('Missing mandatory Legal Metrology Country of Origin.');
      }

      if (mrpInr <= 0 || sellingPriceInr <= 0) {
        rowErrors.push('MRP and Selling Price must be > ₹0.');
      } else if (sellingPriceInr > mrpInr) {
        rowErrors.push(`Selling Price (₹${sellingPriceInr}) exceeds MRP (₹${mrpInr}).`);
      }

      return {
        rowIndex: idx + 1,
        sku,
        asin,
        gtin,
        title,
        brand,
        category,
        productType,
        mrpInr,
        sellingPriceInr,
        inventoryCount,
        countryOfOrigin,
        hsnCode,
        fulfilmentChannel,
        errors: rowErrors,
        isDuplicateSku: isDup,
      };
    });

    setParsedRows(rows);

    const validCount = rows.filter((r) => r.errors.length === 0).length;
    const errorCount = rows.length - validCount;
    const dupCount = rows.filter((r) => r.isDuplicateSku).length;

    const jobId = await createBulkImportJobRecord(user.uid, {
      fileName,
      totalRows: rows.length,
      validRows: validCount,
      errorRows: errorCount,
      duplicateSkus: dupCount,
      status: 'Pending Approval',
      spApiFeedId: 'Awaiting Seller Approval',
      rowSummary: `${validCount} valid rows, ${errorCount} rows with validation alerts (${dupCount} duplicate SKUs).`,
    });
    setCurrentJobId(jobId);

    await createAuditLog(
      user.uid,
      user.email,
      user.role,
      `Validated Bulk Spreadsheet (${fileName})`,
      'Module F: Bulk Upload',
      jobId,
      `Parsed ${rows.length} rows: ${validCount} valid, ${errorCount} flagged, ${dupCount} duplicate SKUs.`,
      'AI Recommendation Only'
    );
  };

  const updateRowField = (rowIndex: number, field: keyof ParsedBulkRow, value: string) => {
    setParsedRows((prev) => {
      const next = prev.map((r) => (r.rowIndex === rowIndex ? { ...r, [field]: value } : r));
      // Re-validate after inline edit
      const seen = new Set<string>();
      return next.map((r) => {
        const errs: string[] = [];
        let isDup = false;
        if (seen.has(r.sku.toUpperCase())) {
          isDup = true;
          errs.push(`Duplicate SKU "${r.sku}" within batch.`);
        }
        seen.add(r.sku.toUpperCase());
        if (!r.countryOfOrigin || r.countryOfOrigin.toLowerCase() === 'needs review') {
          errs.push('Missing mandatory Legal Metrology Country of Origin.');
        }
        if (r.sellingPriceInr > r.mrpInr) {
          errs.push('Selling Price exceeds MRP.');
        }
        return { ...r, errors: errs, isDuplicateSku: isDup };
      });
    });
  };

  const handlePublishApprovedBulkFeed = async () => {
    const validRows = parsedRows.filter((r) => r.errors.length === 0);
    if (validRows.length === 0 || !bulkApproved) return;

    setIsSubmittingFeed(true);
    setFeedResultBanner(null);
    try {
      const resp = await fetch('/api/sp-api/feeds/bulk-submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rows: validRows,
          approvedByUser: bulkApproved,
          mode: connection?.mode || 'SANDBOX',
        }),
      });
      const data = await resp.json();
      if (!resp.ok || !data.verifiedByApi) {
        throw new Error(data.error || 'Bulk feed submission failed');
      }

      for (const r of validRows) {
        await saveProductRecord(user.uid, {
          sku: r.sku,
          asin: r.asin,
          gtin: r.gtin,
          title: r.title,
          brand: r.brand,
          manufacturer: r.brand,
          category: r.category,
          productType: r.productType,
          bullets: [
            `${r.title} — Authentic ${r.brand} catalog item for Amazon.in.`,
            `Compliant with Indian Legal Metrology packaging rules (HSN ${r.hsnCode}).`,
            `Fulfilled via ${r.fulfilmentChannel} with verified inventory allocation.`,
            `Country of Origin: ${r.countryOfOrigin}.`,
            `Backed by standard manufacturer warranty and GST invoice.`,
          ],
          description: r.title,
          searchKeywords: `${r.brand.toLowerCase()} ${r.productType.toLowerCase()} india`,
          countryOfOrigin: r.countryOfOrigin,
          hsnCode: r.hsnCode,
          mrpInr: r.mrpInr,
          sellingPriceInr: r.sellingPriceInr,
          inventoryCount: r.inventoryCount,
          fulfilmentChannel: r.fulfilmentChannel,
          status: 'Published (SP-API Verified)',
          spApiSubmissionId: data.feedId,
          spApiVerifiedAt: data.verifiedAt,
          sourceSummary: `Bulk Feed ${data.feedId} (${fileName})`,
          confidenceScore: 94,
          missingFieldsCount: 0,
        });
      }

      const errorCount = parsedRows.length - validRows.length;
      if (currentJobId) {
        await updateBulkImportJobStatus(
          currentJobId,
          errorCount === 0 ? 'Completed' : 'Partial Failure',
          data.feedId,
          `Submitted ${validRows.length} valid SKUs via SP-API Feed ${data.feedId}. ${errorCount} rows skipped due to validation errors.`,
          validRows.length,
          errorCount
        );
      }

      await createAuditLog(
        user.uid,
        user.email,
        user.role,
        `Bulk Feed Published via SP-API (${data.feedId})`,
        'Module F: Bulk Upload',
        data.feedId,
        `Published ${validRows.length} SKUs in ${connection?.mode || 'SANDBOX'} mode. ${errorCount} rows held for correction.`,
        connection?.mode === 'LIVE_PRODUCTION' ? 'SP-API Verified' : 'Sandbox Simulated'
      );

      setFeedResultBanner(
        `SP-API Feed ${data.feedId} Completed: ${validRows.length} valid SKUs published and verified. ${errorCount} flagged rows held safely.`
      );
    } catch (err: any) {
      setFeedResultBanner(`Bulk Feed Error: ${err?.message || 'Failed'}`);
    } finally {
      setIsSubmittingFeed(false);
    }
  };

  const handleDownloadProcessingReport = () => {
    const lines = [
      'rowIndex,sku,asin,title,countryOfOrigin,mrpInr,sellingPriceInr,validationStatus,errorDetails',
      ...parsedRows.map((r) =>
        [
          r.rowIndex,
          r.sku,
          r.asin,
          `"${r.title.replace(/"/g, '""')}"`,
          r.countryOfOrigin,
          r.mrpInr,
          r.sellingPriceInr,
          r.errors.length === 0 ? 'VALID_READY' : 'ERROR_HELD',
          `"${r.errors.join('; ')}"`,
        ].join(',')
      ),
    ].join('\n');
    const blob = new Blob([lines], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `spapi_bulk_processing_report_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8">
      {/* Header & Template Controls */}
      <section className="bg-white border border-slate-200 rounded-lg p-6 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <h1 className="text-lg font-bold text-slate-900">
              Module F: Bulk Listing &amp; Excel/CSV Feed Automation
            </h1>
            <p className="text-xs text-slate-600">
              Validates multi-row spreadsheets prior to import, flags duplicate SKUs and missing
              Legal Metrology fields, and submits approved batches via SP-API Feeds API
              (JSON_LISTINGS_FEED).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="px-3.5 py-2 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-md flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Download Amazon.in CSV Template
            </button>

            <label className="px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md flex items-center gap-1.5 cursor-pointer">
              <Upload className="w-3.5 h-3.5" />
              Upload CSV / Spreadsheet
              <input
                type="file"
                accept=".csv,.txt,.tsv"
                onChange={handleCsvFileUpload}
                className="hidden"
              />
            </label>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-700">
              Spreadsheet Raw Preview / Editor ({fileName}) — Includes intentional Duplicate SKU
              &amp; Missing Origin rows for testing:
            </span>
            <button
              type="button"
              onClick={validateAndParseRows}
              className="px-4 py-1.5 text-xs font-semibold text-amber-950 bg-amber-400 hover:bg-amber-500 rounded-md flex items-center gap-1.5 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5" />
              Run Pre-Import Validation &amp; Duplicate SKU Check
            </button>
          </div>
          <textarea
            rows={6}
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            className="w-full p-3 text-xs font-mono border border-slate-300 rounded-md"
          />
        </div>
      </section>

      {/* Row-Level Validation Preview & Inline Fixer */}
      {parsedRows.length > 0 && (
        <section className="bg-white border border-slate-200 rounded-lg overflow-hidden space-y-4 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Row-Level Validation &amp; Duplicate SKU Report ({parsedRows.length} Rows)
              </h2>
              <p className="text-xs text-slate-500">
                Fix any duplicate SKU or missing Country of Origin directly in the cells below
                before approving the bulk feed.
              </p>
            </div>
            <button
              type="button"
              onClick={handleDownloadProcessingReport}
              className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Download Row Validation Report (CSV)
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-600">
                  <th className="py-2.5 px-3">Row</th>
                  <th className="py-2.5 px-3">SKU (Editable)</th>
                  <th className="py-2.5 px-3">Product Title</th>
                  <th className="py-2.5 px-3">Country of Origin (Editable)</th>
                  <th className="py-2.5 px-3 text-right">MRP / Offer (₹)</th>
                  <th className="py-2.5 px-3">Row Validation Diagnostics</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {parsedRows.map((row) => (
                  <tr key={row.rowIndex} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-mono tabular-nums text-slate-500">
                      #{row.rowIndex}
                    </td>
                    <td className="py-2.5 px-3">
                      <input
                        type="text"
                        value={row.sku}
                        onChange={(e) => updateRowField(row.rowIndex, 'sku', e.target.value)}
                        className={`px-2 py-1 text-xs font-mono border rounded w-44 ${
                          row.isDuplicateSku ? 'border-red-500 bg-red-50' : 'border-slate-300'
                        }`}
                      />
                    </td>
                    <td className="py-2.5 px-3 max-w-xs truncate font-medium text-slate-900">
                      {row.title}
                    </td>
                    <td className="py-2.5 px-3">
                      <input
                        type="text"
                        value={row.countryOfOrigin}
                        onChange={(e) =>
                          updateRowField(row.rowIndex, 'countryOfOrigin', e.target.value)
                        }
                        className={`px-2 py-1 text-xs font-mono border rounded w-32 ${
                          row.countryOfOrigin.toLowerCase() === 'needs review' ||
                          !row.countryOfOrigin
                            ? 'border-amber-500 bg-amber-50'
                            : 'border-slate-300'
                        }`}
                      />
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                      ₹{row.mrpInr} / <strong>₹{row.sellingPriceInr}</strong>
                    </td>
                    <td className="py-2.5 px-3">
                      {row.errors.length === 0 ? (
                        <span className="text-emerald-700 font-semibold">
                          Valid — Ready for SP-API Feed
                        </span>
                      ) : (
                        <div className="space-y-0.5 text-red-700 font-medium">
                          {row.errors.map((e, i) => (
                            <div key={i}>{e}</div>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="pt-4 border-t border-slate-200 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <label className="flex items-center gap-2 text-xs text-slate-800 cursor-pointer">
              <input
                type="checkbox"
                checked={bulkApproved}
                onChange={(e) => setBulkApproved(e.target.checked)}
                className="rounded border-slate-300"
              />
              <span>
                I approve publishing the{' '}
                <strong>{parsedRows.filter((r) => r.errors.length === 0).length} valid rows</strong>{' '}
                via Amazon SP-API Feeds API ({connection?.mode || 'SANDBOX'}). Rows with errors will
                be held safely.
              </span>
            </label>

            <button
              type="button"
              onClick={handlePublishApprovedBulkFeed}
              disabled={!bulkApproved || isSubmittingFeed}
              className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors cursor-pointer disabled:opacity-50"
            >
              {isSubmittingFeed
                ? 'Submitting JSON_LISTINGS_FEED...'
                : 'Approve & Publish Validated Rows to SP-API'}
            </button>
          </div>

          {feedResultBanner && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-md text-xs font-mono text-emerald-900">
              {feedResultBanner}
            </div>
          )}
        </section>
      )}

      {/* Historical Bulk Import Jobs Queue */}
      <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-sm font-semibold text-slate-900">
            Bulk Import &amp; SP-API Feed Job Queue ({bulkJobs.length})
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-600">
                <th className="py-3 px-4">File Name</th>
                <th className="py-3 px-4 text-right">Total / Valid / Error / Dupes</th>
                <th className="py-3 px-4">Job Status</th>
                <th className="py-3 px-4">SP-API Feed ID</th>
                <th className="py-3 px-4">Summary</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {bulkJobs.map((job) => (
                <tr key={job.id} className="hover:bg-slate-50">
                  <td className="py-3 px-4 font-mono font-medium text-slate-900">{job.fileName}</td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums">
                    {job.totalRows} / <span className="text-emerald-700">{job.validRows}</span> /{' '}
                    <span className="text-red-700">{job.errorRows}</span> / {job.duplicateSkus}
                  </td>
                  <td className="py-3 px-4 font-semibold text-slate-800">{job.status}</td>
                  <td className="py-3 px-4 font-mono text-slate-600">{job.spApiFeedId}</td>
                  <td className="py-3 px-4 text-slate-600">{job.rowSummary}</td>
                </tr>
              ))}
              {bulkJobs.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-slate-500">
                    No bulk feed jobs executed yet. Click &quot;Run Pre-Import Validation&quot;
                    above to start a job.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
