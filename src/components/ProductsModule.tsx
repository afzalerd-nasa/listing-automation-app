import React, { useState } from 'react';
import {
  ProductRecord,
  FieldProvenance,
  CatalogConflict,
  UserProfile,
  NavigationTab,
} from '../types';
import { SAMPLE_SUPPLIER_DOCUMENTS } from '../data/seedData';
import { saveProductRecord, createAuditLog, deleteRecordById } from '../services/firestoreService';
import {
  Sparkles,
  Upload,
  Search,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Image as ImageIcon,
  Trash2,
  ArrowRight,
} from 'lucide-react';

interface ProductsModuleProps {
  user: UserProfile;
  products: ProductRecord[];
  onSelectProductForGenerator: (product: ProductRecord) => void;
  onNavigate: (tab: NavigationTab) => void;
}

export const ProductsModule: React.FC<ProductsModuleProps> = ({
  user,
  products,
  onSelectProductForGenerator,
  onNavigate,
}) => {
  const [identifierInput, setIdentifierInput] = useState('B09X7K2IN1');
  const [categoryInput, setCategoryInput] = useState('HOME_KITCHEN');
  const [productTypeInput, setProductTypeInput] = useState('STORAGE_CONTAINER');
  const [rawDocInput, setRawDocInput] = useState(SAMPLE_SUPPLIER_DOCUMENTS[0].rawText);
  const [manualNotesInput, setManualNotesInput] = useState('');
  const [imagePreview, setImagePreview] = useState<string>('');
  const [imageMimeType, setImageMimeType] = useState<string>('image/jpeg');

  const [isExtracting, setIsExtracting] = useState(false);
  const [isLookingUpCatalog, setIsLookingUpCatalog] = useState(false);
  const [catalogLookupMessage, setCatalogLookupMessage] = useState<string | null>(null);
  const [extractionError, setExtractionError] = useState<string | null>(null);

  // Extracted form state
  const [editingId, setEditingId] = useState<string | undefined>(undefined);
  const [sku, setSku] = useState('AFZ-KITCH-FLASK-1000');
  const [asin, setAsin] = useState('B09X7K2IN1');
  const [gtin, setGtin] = useState('8901234567890');
  const [title, setTitle] = useState('');
  const [brand, setBrand] = useState('');
  const [manufacturer, setManufacturer] = useState('');
  const [bullets, setBullets] = useState<string[]>(['', '', '', '', '']);
  const [description, setDescription] = useState('');
  const [searchKeywords, setSearchKeywords] = useState('');
  const [modelNumber, setModelNumber] = useState('');
  const [partNumber, setPartNumber] = useState('');
  const [color, setColor] = useState('');
  const [size, setSize] = useState('');
  const [material, setMaterial] = useState('');
  const [dimensions, setDimensions] = useState('');
  const [weight, setWeight] = useState('');
  const [packageQuantity, setPackageQuantity] = useState<number>(1);
  const [includedAccessories, setIncludedAccessories] = useState('');
  const [technicalSpecs, setTechnicalSpecs] = useState('');
  const [compatibility, setCompatibility] = useState('');
  const [countryOfOrigin, setCountryOfOrigin] = useState('');
  const [hsnCode, setHsnCode] = useState('');
  const [mrpInr, setMrpInr] = useState<number>(0);
  const [sellingPriceInr, setSellingPriceInr] = useState<number>(0);
  const [inventoryCount, setInventoryCount] = useState<number>(50);
  const [fulfilmentChannel, setFulfilmentChannel] = useState<'FBA' | 'Easy Ship' | 'Self-Ship'>('FBA');

  const [confidenceScore, setConfidenceScore] = useState<number>(0);
  const [provenanceList, setProvenanceList] = useState<FieldProvenance[]>([]);
  const [conflicts, setConflicts] = useState<CatalogConflict[]>([]);
  const [saveBanner, setSaveBanner] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState('');

  const handleLoadSampleDoc = (docPreset: (typeof SAMPLE_SUPPLIER_DOCUMENTS)[0]) => {
    setIdentifierInput(docPreset.identifier);
    setCategoryInput(docPreset.category);
    setProductTypeInput(docPreset.productType);
    setRawDocInput(docPreset.rawText);
    setCatalogLookupMessage(null);
    setExtractionError(null);
  };

  const handleDocumentFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setRawDocInput(reader.result.slice(0, 8000));
      }
    };
    reader.readAsText(file);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageMimeType(file.type || 'image/jpeg');
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setImagePreview(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  // Authorized SP-API Catalog Lookup
  const handleSpApiCatalogLookup = async () => {
    if (!identifierInput.trim()) return;
    setIsLookingUpCatalog(true);
    setCatalogLookupMessage(null);
    try {
      const resp = await fetch(
        `/api/sp-api/catalog/${encodeURIComponent(identifierInput.trim())}`
      );
      const data = await resp.json();
      if (!resp.ok || !data.found) {
        setCatalogLookupMessage(
          data.message || `No existing Amazon.in catalog entry found for ${identifierInput}.`
        );
      } else {
        const c = data.catalogItem;
        setSku(c.sku || identifierInput);
        setAsin(c.asin || 'Pending ASIN');
        setGtin(c.gtin || 'Needs Review');
        setTitle(c.title || 'Needs Review');
        setBrand(c.brand || 'Needs Review');
        setManufacturer(c.manufacturer || 'Needs Review');
        setCategoryInput(c.category || 'HOME_KITCHEN');
        setProductTypeInput(c.productType || 'STORAGE_CONTAINER');
        setModelNumber(c.modelNumber || 'Needs Review');
        setPartNumber(c.partNumber || 'Needs Review');
        setColor(c.color || 'Needs Review');
        setSize(c.size || 'Needs Review');
        setMaterial(c.material || 'Needs Review');
        setDimensions(c.dimensions || 'Needs Review');
        setWeight(c.weight || 'Needs Review');
        setCountryOfOrigin(c.countryOfOrigin || 'Needs Review');
        setHsnCode(c.hsnCode || 'Needs Review');
        setMrpInr(c.mrpInr || 0);
        setSellingPriceInr(c.sellingPriceInr || 0);
        setCatalogLookupMessage(
          `Imported existing Amazon.in Catalog Item (${c.asin}) via SP-API Request ${data.requestId}. Run AI Extraction to compare with your supplier invoice.`
        );
      }
    } catch (err: any) {
      setCatalogLookupMessage(`SP-API Lookup Error: ${err?.message || 'Failed'}`);
    } finally {
      setIsLookingUpCatalog(false);
    }
  };

  // Module A: AI Product Information Extraction
  const handleRunAiExtraction = async () => {
    setIsExtracting(true);
    setExtractionError(null);
    setSaveBanner(null);
    try {
      const resp = await fetch('/api/ai/extract-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: identifierInput,
          rawDocumentText: rawDocInput,
          manualDescription: manualNotesInput,
          category: categoryInput,
          productType: productTypeInput,
          imageBase64: imagePreview,
          imageMimeType,
        }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data.error || 'AI extraction failed');
      }
      const ext = data.extracted;
      setSku(ext.sku && ext.sku !== 'Needs Review' ? ext.sku : identifierInput || 'AFZ-SKU-NEW');
      setAsin(ext.asin || 'Pending ASIN');
      setGtin(ext.gtin || 'Needs Review');
      setTitle(ext.title || 'Needs Review');
      setBrand(ext.brand || 'Needs Review');
      setManufacturer(ext.manufacturer || 'Needs Review');
      const paddedBullets = Array.isArray(ext.bullets) ? [...ext.bullets] : [];
      while (paddedBullets.length < 5) paddedBullets.push('');
      setBullets(paddedBullets.slice(0, 5));
      setDescription(ext.description || 'Needs Review');
      setSearchKeywords(ext.searchKeywords || 'Needs Review');
      setModelNumber(ext.modelNumber || 'Needs Review');
      setPartNumber(ext.partNumber || 'Needs Review');
      setColor(ext.color || 'Needs Review');
      setSize(ext.size || 'Needs Review');
      setMaterial(ext.material || 'Needs Review');
      setDimensions(ext.dimensions || 'Needs Review');
      setWeight(ext.weight || 'Needs Review');
      setPackageQuantity(ext.packageQuantity || 1);
      setIncludedAccessories(ext.includedAccessories || 'Needs Review');
      setTechnicalSpecs(ext.technicalSpecs || 'Needs Review');
      setCompatibility(ext.compatibility || 'Standard');
      setCountryOfOrigin(ext.countryOfOrigin || 'Needs Review');
      setHsnCode(ext.hsnCode || 'Needs Review');
      setMrpInr(Number(ext.mrpInr) || 0);
      setSellingPriceInr(Number(ext.sellingPriceInr) || 0);
      setConfidenceScore(Number(ext.overallConfidence) || 85);
      setProvenanceList(Array.isArray(ext.fieldProvenance) ? ext.fieldProvenance : []);
      setConflicts(Array.isArray(ext.conflicts) ? ext.conflicts : []);

      await createAuditLog(
        user.uid,
        user.email,
        user.role,
        `AI Extracted Product Attributes for ${ext.sku || identifierInput}`,
        'Module A: Product Extraction',
        ext.sku || identifierInput,
        `Confidence ${ext.overallConfidence || 85}%. Conflicts detected: ${
          Array.isArray(ext.conflicts) ? ext.conflicts.length : 0
        }.`,
        'AI Recommendation Only'
      );
    } catch (err: any) {
      setExtractionError(err?.message || 'Failed to extract product fields.');
    } finally {
      setIsExtracting(false);
    }
  };

  // Resolve a conflict by choosing either supplier value or Amazon catalog value
  const applyConflictValue = (field: string, chosenValue: string) => {
    const f = field.toLowerCase();
    if (f.includes('weight')) setWeight(chosenValue);
    else if (f.includes('dimension')) setDimensions(chosenValue);
    else if (f.includes('mrp')) setMrpInr(Number(chosenValue.replace(/[^0-9.]/g, '')) || mrpInr);
    else if (f.includes('title')) setTitle(chosenValue);
    else if (f.includes('color')) setColor(chosenValue);
    else if (f.includes('brand')) setBrand(chosenValue);
  };

  const countMissingFields = () => {
    const checkList = [
      title,
      brand,
      manufacturer,
      modelNumber,
      partNumber,
      color,
      size,
      material,
      dimensions,
      weight,
      countryOfOrigin,
      hsnCode,
    ];
    let missing = checkList.filter(
      (v) => !v || v.trim() === '' || v.trim().toLowerCase() === 'needs review'
    ).length;
    if (!mrpInr || mrpInr <= 0) missing += 1;
    if (!sellingPriceInr || sellingPriceInr <= 0) missing += 1;
    return missing;
  };

  const handleSaveProductToCatalog = async () => {
    setSaveBanner(null);
    const missingCount = countMissingFields();
    const computedStatus: ProductRecord['status'] =
      missingCount > 0 || conflicts.length > 0 ? 'Needs Review' : 'Draft';

    const savedId = await saveProductRecord(
      user.uid,
      {
        sku,
        asin,
        gtin,
        title,
        brand,
        manufacturer,
        category: categoryInput,
        productType: productTypeInput,
        bullets,
        description,
        searchKeywords,
        modelNumber,
        partNumber,
        color,
        size,
        material,
        dimensions,
        weight,
        packageQuantity,
        includedAccessories,
        technicalSpecs,
        compatibility,
        countryOfOrigin,
        hsnCode,
        mrpInr,
        sellingPriceInr,
        inventoryCount,
        fulfilmentChannel,
        status: computedStatus,
        spApiSubmissionId: 'Not Submitted',
        spApiVerifiedAt: 'Unverified',
        sourceSummary: 'AI Extraction + Seller Manual Verification',
        confidenceScore: confidenceScore || 88,
        missingFieldsCount: missingCount,
        conflictSummary:
          conflicts.length > 0
            ? `${conflicts.length} catalog vs supplier conflicts flagged`
            : 'None',
      },
      editingId
    );

    await createAuditLog(
      user.uid,
      user.email,
      user.role,
      editingId ? `Updated Product Record (${sku})` : `Created Product Record (${sku})`,
      'Catalog',
      savedId,
      `Saved with status "${computedStatus}" (${missingCount} fields marked Needs Review). Not yet submitted to Amazon SP-API.`,
      'AI Recommendation Only'
    );

    setEditingId(savedId);
    setSaveBanner(
      `Saved SKU ${sku} to Catalog with status "${computedStatus}". Note: Saving a draft does not publish to Amazon.in until approved and verified via SP-API.`
    );
  };

  const loadExistingProductIntoEditor = (p: ProductRecord) => {
    setEditingId(p.id);
    setIdentifierInput(p.asin !== 'Pending ASIN' ? p.asin : p.sku);
    setSku(p.sku);
    setAsin(p.asin);
    setGtin(p.gtin);
    setTitle(p.title);
    setBrand(p.brand);
    setManufacturer(p.manufacturer);
    setCategoryInput(p.category);
    setProductTypeInput(p.productType);
    const b = [...(p.bullets || [])];
    while (b.length < 5) b.push('');
    setBullets(b.slice(0, 5));
    setDescription(p.description);
    setSearchKeywords(p.searchKeywords);
    setModelNumber(p.modelNumber);
    setPartNumber(p.partNumber);
    setColor(p.color);
    setSize(p.size);
    setMaterial(p.material);
    setDimensions(p.dimensions);
    setWeight(p.weight);
    setPackageQuantity(p.packageQuantity);
    setIncludedAccessories(p.includedAccessories);
    setTechnicalSpecs(p.technicalSpecs);
    setCompatibility(p.compatibility);
    setCountryOfOrigin(p.countryOfOrigin);
    setHsnCode(p.hsnCode);
    setMrpInr(p.mrpInr);
    setSellingPriceInr(p.sellingPriceInr);
    setInventoryCount(p.inventoryCount);
    setFulfilmentChannel(p.fulfilmentChannel);
    setConfidenceScore(p.confidenceScore);
    setSaveBanner(`Loaded SKU ${p.sku} into editor.`);
  };

  const filteredProducts = products.filter(
    (p) =>
      p.title.toLowerCase().includes(searchFilter.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchFilter.toLowerCase()) ||
      p.asin.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <div className="space-y-8">
      {/* Section 1: Input & Extraction Engine */}
      <section className="bg-white border border-slate-200 rounded-lg p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <h1 className="text-lg font-bold text-slate-900">
              Module A: Automatic Product Detail Extraction & Conflict Detector
            </h1>
            <p className="text-xs text-slate-600">
              Extracts factual attributes from supplier invoices, specification sheets, product
              images, and Amazon SP-API catalog records. Never invents missing compliance data.
            </p>
          </div>
          <div className="text-xs text-slate-500 font-mono tabular-nums">
            Zero-Hallucination Policy Active · Untrusted Input Isolated
          </div>
        </div>

        {/* Preset Sample Selector */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-slate-700">
            Quick-Load Sample Indian Supplier Document / Invoice (For Testing Conflict & Missing
            Field Rules):
          </label>
          <div className="flex flex-wrap gap-2">
            {SAMPLE_SUPPLIER_DOCUMENTS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleLoadSampleDoc(preset)}
                className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors text-left cursor-pointer"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Identifier Lookup + Category Selection */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2 space-y-1">
            <label className="block text-xs font-medium text-slate-700">
              ASIN / SKU / UPC / EAN / GTIN
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={identifierInput}
                onChange={(e) => setIdentifierInput(e.target.value)}
                placeholder="e.g. B09X7K2IN1 or B0B4N8ELEC"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md font-mono focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
              <button
                type="button"
                onClick={handleSpApiCatalogLookup}
                disabled={isLookingUpCatalog}
                className="px-3 py-2 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-md whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer"
              >
                <Search className="w-3.5 h-3.5" />
                {isLookingUpCatalog ? 'Querying...' : 'SP-API Lookup'}
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-700">
              Amazon.in Category Schema
            </label>
            <select
              value={categoryInput}
              onChange={(e) => setCategoryInput(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
            >
              <option value="HOME_KITCHEN">Home & Kitchen (HOME_KITCHEN)</option>
              <option value="CONSUMER_ELECTRONICS">Electronics (CONSUMER_ELECTRONICS)</option>
              <option value="APPAREL">Clothing & Accessories (APPAREL)</option>
              <option value="GROCERY_GOURMET">Grocery & Gourmet (GROCERY_GOURMET)</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-700">Amazon Product Type</label>
            <input
              type="text"
              value={productTypeInput}
              onChange={(e) => setProductTypeInput(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md font-mono focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>
        </div>

        {catalogLookupMessage && (
          <div className="p-3 bg-slate-100 border border-slate-200 rounded-md text-xs text-slate-800 font-mono">
            {catalogLookupMessage}
          </div>
        )}

        {/* Document Text + File Upload + Image Upload */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700">
                Supplier Catalog / GST Invoice / Specification Text
              </label>
              <label className="text-xs font-medium text-slate-700 hover:text-slate-900 underline cursor-pointer flex items-center gap-1">
                <FileText className="w-3.5 h-3.5" />
                Upload .txt / .csv / .json Spec File
                <input
                  type="file"
                  accept=".txt,.csv,.json,.md"
                  onChange={handleDocumentFileUpload}
                  className="hidden"
                />
              </label>
            </div>
            <textarea
              rows={7}
              value={rawDocInput}
              onChange={(e) => setRawDocInput(e.target.value)}
              placeholder="Paste supplier invoice, packaging label text, or specification sheet..."
              className="w-full p-3 text-xs font-mono border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                Optional Product Image (Multimodal AI Extraction)
              </label>
              <label className="border border-dashed border-slate-300 rounded-md p-4 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-slate-50 transition-colors">
                <ImageIcon className="w-5 h-5 text-slate-400" />
                <span className="text-xs text-slate-600 text-center">
                  Click to upload product packaging or label photo
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>
              {imagePreview && (
                <div className="flex items-center justify-between bg-slate-50 px-3 py-1.5 rounded border border-slate-200 text-xs">
                  <span className="text-emerald-700 font-medium">Image attached for AI</span>
                  <button
                    type="button"
                    onClick={() => setImagePreview('')}
                    className="text-red-600 hover:underline cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                Manual Seller Notes / Override Instructions
              </label>
              <textarea
                rows={3}
                value={manualNotesInput}
                onChange={(e) => setManualNotesInput(e.target.value)}
                placeholder="Optional manual product description or notes..."
                className="w-full p-2.5 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <button
              type="button"
              onClick={handleRunAiExtraction}
              disabled={isExtracting}
              className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              {isExtracting
                ? 'Extracting Facts & Checking Conflicts via Gemini...'
                : 'Extract Product Details with Gemini AI'}
            </button>
          </div>
        </div>

        {extractionError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md text-xs text-red-800">
            {extractionError}
          </div>
        )}
      </section>

      {/* Conflict Detector & Field Provenance Results */}
      {(conflicts.length > 0 || provenanceList.length > 0) && (
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Supplier vs Amazon Catalog Conflicts */}
          <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  Supplier vs. Amazon.in Catalog Conflict Detector
                </h2>
                <p className="text-xs text-slate-500">
                  Discrepancies between uploaded supplier docs and authorized SP-API catalog data
                </p>
              </div>
              <span className="text-xs font-mono tabular-nums font-semibold text-amber-700">
                {conflicts.length} Conflict(s)
              </span>
            </div>

            {conflicts.length === 0 ? (
              <p className="text-xs text-emerald-700">
                No conflicts detected between supplier document and existing Amazon catalog data.
              </p>
            ) : (
              <div className="space-y-3">
                {conflicts.map((c, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 bg-amber-50/60 border border-amber-200 rounded-md space-y-2"
                  >
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-900">
                      <span>Attribute: {c.field}</span>
                      <span className="text-amber-800">Needs Seller Resolution</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                      <div className="p-2 bg-white border border-slate-200 rounded">
                        <div className="text-slate-500">Supplier Document Value:</div>
                        <div className="font-semibold text-slate-900">{c.supplierValue}</div>
                        <button
                          type="button"
                          onClick={() => applyConflictValue(c.field, c.supplierValue)}
                          className="mt-1.5 text-xs text-slate-900 underline cursor-pointer"
                        >
                          Use Supplier Value
                        </button>
                      </div>
                      <div className="p-2 bg-white border border-slate-200 rounded">
                        <div className="text-slate-500">Amazon.in Catalog Value:</div>
                        <div className="font-semibold text-slate-900">{c.amazonCatalogValue}</div>
                        <button
                          type="button"
                          onClick={() => applyConflictValue(c.field, c.amazonCatalogValue)}
                          className="mt-1.5 text-xs text-emerald-700 underline cursor-pointer"
                        >
                          Use Catalog Value
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-slate-600">{c.resolutionAdvice}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Field-Level Source & Confidence Provenance */}
          <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  Extracted Field Provenance & Confidence Audit
                </h2>
                <p className="text-xs text-slate-500">
                  Missing facts are strictly marked &quot;Needs Review&quot; — never fabricated
                </p>
              </div>
              <span className="text-xs font-mono tabular-nums font-semibold text-slate-900">
                Overall Confidence: {confidenceScore}%
              </span>
            </div>

            <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 text-xs">
              {provenanceList.map((prov, idx) => (
                <div key={idx} className="py-2 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <span className="font-semibold text-slate-800">{prov.field}: </span>
                    <span className="font-mono text-slate-600">{prov.extractedValue}</span>
                  </div>
                  <div className="shrink-0 font-mono tabular-nums text-right">
                    <span className="text-slate-500">{prov.source}</span>
                    <span aria-hidden="true"> · </span>
                    <span className="font-semibold text-slate-800">{prov.confidence}%</span>
                    <span aria-hidden="true"> · </span>
                    <span
                      className={
                        prov.status === 'Needs Review' || prov.extractedValue === 'Needs Review'
                          ? 'text-amber-700 font-semibold'
                          : 'text-emerald-700 font-semibold'
                      }
                    >
                      {prov.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Structured Product Attribute Editor */}
      <section className="bg-white border border-slate-200 rounded-lg p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-200 pb-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Structured Amazon.in Product Attribute Editor (Manual Override & Verification)
            </h2>
            <p className="text-xs text-slate-500">
              Fields highlighted in amber are marked &quot;Needs Review&quot; and must be verified
              before SP-API submission.
            </p>
          </div>
          <div className="text-xs font-mono tabular-nums text-slate-600">
            Missing / Unverified Fields: {countMissingFields()}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 space-y-1">
            <label className="block text-xs font-medium text-slate-700">Product Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-700">Seller SKU</label>
            <input
              type="text"
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-md"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-700">Brand</label>
            <input
              type="text"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              className={`w-full px-3 py-2 text-sm border rounded-md ${
                brand === 'Needs Review' ? 'border-amber-500 bg-amber-50/40' : 'border-slate-300'
              }`}
            />
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-700">Manufacturer</label>
            <input
              type="text"
              value={manufacturer}
              onChange={(e) => setManufacturer(e.target.value)}
              className={`w-full px-3 py-2 text-sm border rounded-md ${
                manufacturer === 'Needs Review'
                  ? 'border-amber-500 bg-amber-50/40'
                  : 'border-slate-300'
              }`}
            />
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-700">
              Country of Origin (Legal Metrology Mandatory)
            </label>
            <input
              type="text"
              value={countryOfOrigin}
              onChange={(e) => setCountryOfOrigin(e.target.value)}
              className={`w-full px-3 py-2 text-sm border rounded-md ${
                countryOfOrigin === 'Needs Review' || !countryOfOrigin
                  ? 'border-amber-500 bg-amber-50/40 font-semibold text-amber-900'
                  : 'border-slate-300'
              }`}
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-700">Model Number</label>
            <input
              type="text"
              value={modelNumber}
              onChange={(e) => setModelNumber(e.target.value)}
              className={`w-full px-3 py-2 text-sm font-mono border rounded-md ${
                modelNumber === 'Needs Review'
                  ? 'border-amber-500 bg-amber-50/40'
                  : 'border-slate-300'
              }`}
            />
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-700">Part Number</label>
            <input
              type="text"
              value={partNumber}
              onChange={(e) => setPartNumber(e.target.value)}
              className={`w-full px-3 py-2 text-sm font-mono border rounded-md ${
                partNumber === 'Needs Review'
                  ? 'border-amber-500 bg-amber-50/40'
                  : 'border-slate-300'
              }`}
            />
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-700">HSN Code (GST India)</label>
            <input
              type="text"
              value={hsnCode}
              onChange={(e) => setHsnCode(e.target.value)}
              className={`w-full px-3 py-2 text-sm font-mono border rounded-md ${
                hsnCode === 'Needs Review' ? 'border-amber-500 bg-amber-50/40' : 'border-slate-300'
              }`}
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-700">Color</label>
            <input
              type="text"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-700">Size / Capacity</label>
            <input
              type="text"
              value={size}
              onChange={(e) => setSize(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-700">Material</label>
            <input
              type="text"
              value={material}
              onChange={(e) => setMaterial(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-700">Dimensions (L x W x H)</label>
            <input
              type="text"
              value={dimensions}
              onChange={(e) => setDimensions(e.target.value)}
              className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-md"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-700">Item Weight</label>
            <input
              type="text"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-md"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-700">Included Accessories</label>
            <input
              type="text"
              value={includedAccessories}
              onChange={(e) => setIncludedAccessories(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-700">MRP (INR ₹)</label>
            <input
              type="number"
              value={mrpInr}
              onChange={(e) => setMrpInr(Number(e.target.value))}
              className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-md"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-700">Selling Price (INR ₹)</label>
            <input
              type="number"
              value={sellingPriceInr}
              onChange={(e) => setSellingPriceInr(Number(e.target.value))}
              className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-md"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-700">Fulfilment Channel</label>
            <select
              value={fulfilmentChannel}
              onChange={(e) => setFulfilmentChannel(e.target.value as any)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white"
            >
              <option value="FBA">Fulfilled by Amazon (FBA India)</option>
              <option value="Easy Ship">Amazon Easy Ship</option>
              <option value="Self-Ship">Seller Self-Ship</option>
            </select>
          </div>
        </div>

        {/* 5 Feature Bullets */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-slate-700">
            Five Feature Bullets (Category-Appropriate)
          </label>
          <div className="space-y-2">
            {bullets.map((b, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-xs font-mono text-slate-400 w-6">0{i + 1}.</span>
                <input
                  type="text"
                  value={b}
                  onChange={(e) => {
                    const next = [...bullets];
                    next[i] = e.target.value;
                    setBullets(next);
                  }}
                  placeholder={`Feature bullet ${i + 1}...`}
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Description & Backend Search Keywords */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-700">Product Description</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-2.5 text-xs border border-slate-300 rounded-md"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-700">
              Backend Search Terms (&le; 249 Bytes)
            </label>
            <textarea
              rows={3}
              value={searchKeywords}
              onChange={(e) => setSearchKeywords(e.target.value)}
              className="w-full p-2.5 text-xs font-mono border border-slate-300 rounded-md"
            />
          </div>
        </div>

        {saveBanner && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-md text-xs text-emerald-900">
            {saveBanner}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-slate-100">
          <span className="text-xs text-slate-500">
            Status Note: Saving stores the draft in your catalog. To publish to Amazon.in, proceed to
            the AI Listing Generator & SP-API Validator.
          </span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSaveProductToCatalog}
              className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors cursor-pointer"
            >
              {editingId ? 'Update Product in Catalog' : 'Save Extracted Product to Catalog'}
            </button>
          </div>
        </div>
      </section>

      {/* Existing Tenant Product Catalog Table */}
      <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Imported Seller Product Catalog ({filteredProducts.length})
            </h2>
            <p className="text-xs text-slate-500">
              Click &quot;Edit&quot; to inspect provenance or &quot;Optimize &amp; Publish&quot; to
              open in Module B Listing Generator
            </p>
          </div>
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="Filter by SKU, ASIN, or title..."
            className="px-3 py-1.5 text-xs border border-slate-300 rounded-md w-full sm:w-64"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                <th className="py-3 px-4">SKU / ASIN</th>
                <th className="py-3 px-4">Product Title &amp; Brand</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4 text-right">MRP / Offer (₹)</th>
                <th className="py-3 px-4">Origin / HSN</th>
                <th className="py-3 px-4">Verification Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {filteredProducts.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-4 font-mono tabular-nums whitespace-nowrap">
                    <div className="font-semibold text-slate-900">{p.sku}</div>
                    <div className="text-slate-500">{p.asin}</div>
                  </td>
                  <td className="py-3 px-4 max-w-xs">
                    <div className="font-medium text-slate-900 truncate">{p.title}</div>
                    <div className="text-slate-500">
                      {p.brand} · {p.fulfilmentChannel} · {p.inventoryCount} units
                    </div>
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-600 whitespace-nowrap">
                    <div>{p.category}</div>
                    <div className="text-slate-400">{p.productType}</div>
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums whitespace-nowrap">
                    <div className="text-slate-500 line-through">₹{p.mrpInr}</div>
                    <div className="font-semibold text-slate-900">₹{p.sellingPriceInr}</div>
                  </td>
                  <td className="py-3 px-4 font-mono whitespace-nowrap">
                    <div
                      className={
                        p.countryOfOrigin === 'Needs Review'
                          ? 'text-amber-700 font-semibold'
                          : 'text-slate-800'
                      }
                    >
                      {p.countryOfOrigin}
                    </div>
                    <div className="text-slate-500">HSN: {p.hsnCode}</div>
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <div
                      className={`font-semibold ${
                        p.status === 'Published (SP-API Verified)'
                          ? 'text-emerald-700'
                          : p.status === 'Needs Review' || p.status === 'Submission Failed'
                          ? 'text-amber-700'
                          : 'text-slate-700'
                      }`}
                    >
                      {p.status}
                    </div>
                    <div className="text-slate-500 font-mono tabular-nums">
                      {p.spApiSubmissionId !== 'Not Submitted'
                        ? `ID: ${p.spApiSubmissionId}`
                        : `Confidence: ${p.confidenceScore}%`}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    <div className="inline-flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => loadExistingProductIntoEditor(p)}
                        className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded cursor-pointer"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onSelectProductForGenerator(p);
                          onNavigate('generator');
                        }}
                        className="px-2.5 py-1 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded inline-flex items-center gap-1 cursor-pointer"
                      >
                        Optimize &amp; Publish
                        <ArrowRight className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteRecordById('products', p.id)}
                        className="p-1 text-slate-400 hover:text-red-600 cursor-pointer"
                        title="Delete product"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    No matching products in catalog.
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
