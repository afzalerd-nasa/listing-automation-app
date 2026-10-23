/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { collection, doc, onSnapshot, query, where } from 'firebase/firestore';
import {
  auth,
  db,
  googleAuthProvider,
  handleFirestoreError,
  OperationType,
} from './lib/firebase';
import {
  ensureUserProfile,
  seedInitialWorkspaceData,
} from './services/firestoreService';
import {
  UserProfile,
  NavigationTab,
  ProductRecord,
  ListingErrorRecord,
  ClaimRecord,
  ClaimEvidenceRecord,
  BulkImportJobRecord,
  SpApiConnectionRecord,
  AuditLogRecord,
} from './types';
import { OverviewPanel } from './components/OverviewPanel';
import { ProductsModule } from './components/ProductsModule';
import { ListingGeneratorModule } from './components/ListingGeneratorModule';
import { BulkUploadModule } from './components/BulkUploadModule';
import { ClaimsAndEvidenceModule } from './components/ClaimsAndEvidenceModule';
import { SystemAndDocsModule } from './components/SystemAndDocsModule';
import {
  LayoutDashboard,
  Package,
  Sparkles,
  FileSpreadsheet,
  AlertOctagon,
  Scale,
  FolderCheck,
  PlugZap,
  BarChart3,
  ShieldAlert,
  Settings,
  LogOut,
  LogIn,
} from 'lucide-react';

export default function App() {
  const [authReady, setAuthReady] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<NavigationTab>('overview');

  // Firestore Real-Time State
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [listingErrors, setListingErrors] = useState<ListingErrorRecord[]>([]);
  const [claims, setClaims] = useState<ClaimRecord[]>([]);
  const [claimEvidence, setClaimEvidence] = useState<ClaimEvidenceRecord[]>([]);
  const [bulkJobs, setBulkJobs] = useState<BulkImportJobRecord[]>([]);
  const [connection, setConnection] = useState<SpApiConnectionRecord | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogRecord[]>([]);

  const [selectedProductForGenerator, setSelectedProductForGenerator] =
    useState<ProductRecord | null>(null);
  const [isSeeding, setIsSeeding] = useState(false);
  const [hasAutoSeeded, setHasAutoSeeded] = useState(false);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUserProfile(null);
        setAuthReady(true);
        return;
      }
      try {
        const profile = await ensureUserProfile(
          firebaseUser.uid,
          firebaseUser.email || 'seller@amazon.in',
          firebaseUser.displayName || 'Amazon India Seller'
        );
        setUserProfile(profile);
      } catch (err: any) {
        console.error('Profile initialization error:', err);
        setAuthError(err?.message || 'Failed to initialize seller profile.');
      } finally {
        setAuthReady(true);
      }
    });
    return () => unsubAuth();
  }, []);

  // Attach tenant-isolated Firestore listeners once authenticated
  useEffect(() => {
    if (!authReady || !userProfile) return;
    const uid = userProfile.uid;

    const unsubProducts = onSnapshot(
      query(collection(db, 'products'), where('ownerId', '==', uid)),
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as ProductRecord[];
        setProducts(list);
        if (list.length === 0 && !hasAutoSeeded) {
          setHasAutoSeeded(true);
          setIsSeeding(true);
          seedInitialWorkspaceData(uid, userProfile.email, userProfile.role)
            .catch((e) => console.error('Auto-seed error:', e))
            .finally(() => setIsSeeding(false));
        }
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'products')
    );

    const unsubErrors = onSnapshot(
      query(collection(db, 'listingErrors'), where('ownerId', '==', uid)),
      (snap) => {
        setListingErrors(
          snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as ListingErrorRecord[]
        );
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'listingErrors')
    );

    const unsubClaims = onSnapshot(
      query(collection(db, 'claims'), where('ownerId', '==', uid)),
      (snap) => {
        setClaims(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as ClaimRecord[]);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'claims')
    );

    const unsubEvidence = onSnapshot(
      query(collection(db, 'claimEvidence'), where('ownerId', '==', uid)),
      (snap) => {
        setClaimEvidence(
          snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as ClaimEvidenceRecord[]
        );
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'claimEvidence')
    );

    const unsubBulk = onSnapshot(
      query(collection(db, 'bulkJobs'), where('ownerId', '==', uid)),
      (snap) => {
        setBulkJobs(
          snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as BulkImportJobRecord[]
        );
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'bulkJobs')
    );

    const unsubConn = onSnapshot(
      doc(db, 'spApiConnections', uid),
      (snap) => {
        if (snap.exists()) {
          setConnection(snap.data() as SpApiConnectionRecord);
        }
      },
      (err) => handleFirestoreError(err, OperationType.GET, `spApiConnections/${uid}`)
    );

    const unsubLogs = onSnapshot(
      query(collection(db, 'auditLogs'), where('ownerId', '==', uid)),
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as AuditLogRecord[];
        setAuditLogs(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'auditLogs')
    );

    return () => {
      unsubProducts();
      unsubErrors();
      unsubClaims();
      unsubEvidence();
      unsubBulk();
      unsubConn();
      unsubLogs();
    };
  }, [authReady, userProfile?.uid, hasAutoSeeded]);

  const handleGoogleSignIn = async () => {
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleAuthProvider);
    } catch (err: any) {
      setAuthError(err?.message || 'Google Sign-In failed.');
    }
  };

  const handleManualSeed = async () => {
    if (!userProfile) return;
    setIsSeeding(true);
    try {
      await seedInitialWorkspaceData(userProfile.uid, userProfile.email, userProfile.role);
    } finally {
      setIsSeeding(false);
    }
  };

  const NAV_ITEMS: { id: NavigationTab; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Overview', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'products', label: 'Products', icon: <Package className="w-4 h-4" /> },
    { id: 'generator', label: 'AI Listing Generator', icon: <Sparkles className="w-4 h-4" /> },
    { id: 'bulk', label: 'Bulk Upload', icon: <FileSpreadsheet className="w-4 h-4" /> },
    { id: 'errors', label: 'Listing Errors', icon: <AlertOctagon className="w-4 h-4" /> },
    { id: 'claims', label: 'Claims & Reimbursements', icon: <Scale className="w-4 h-4" /> },
    { id: 'evidence', label: 'Claim Evidence', icon: <FolderCheck className="w-4 h-4" /> },
    { id: 'connection', label: 'Amazon Connection', icon: <PlugZap className="w-4 h-4" /> },
    { id: 'reports', label: 'Reports', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'audit', label: 'Audit Logs', icon: <ShieldAlert className="w-4 h-4" /> },
    { id: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> },
  ];

  if (!authReady) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="text-sm font-mono text-slate-600">
          Initializing afzal Listing Automation security session...
        </div>
      </div>
    );
  }

  // Unauthenticated Landing & Sign-In View
  if (!userProfile) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        {/* Strict 3-Zone Top Bar Contract */}
        <header className="flex items-center justify-between gap-8 px-6 py-4 bg-white border-b border-slate-200">
          <a
            href="#top"
            className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
          >
            afzal Listing Automation
          </a>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            <a href="#extraction" className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0">
              Product Extraction
            </a>
            <a href="#sp-api" className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0">
              SP-API Publishing
            </a>
            <a href="#claims" className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0">
              Reimbursements
            </a>
            <a href="#governance" className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0">
              Governance
            </a>
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-md hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Sign In with Google
            </button>
          </div>
        </header>

        <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-16 space-y-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-7 space-y-6">
              <div className="text-xs font-mono text-slate-500">
                Amazon.in Marketplace (A21TJRUUN4KGV) · SP-API Operations &amp; Claims
              </div>
              <h1
                className="text-4xl font-bold tracking-tight text-slate-900 leading-tight"
                style={{ textWrap: 'balance' }}
              >
                Zero-Hallucination Catalog Automation &amp; Policy-Backed Reimbursement Claims for
                Amazon India Sellers
              </h1>
              <p className="text-base text-slate-600 leading-relaxed max-w-2xl">
                Automate supplier invoice extraction, validate Legal Metrology attributes (Country
                of Origin, HSN, MRP), resolve SP-API listing suppressions, and prepare verifiable
                FBA and Easy Ship reimbursement claims with strict separation between AI drafts and
                API-verified executions.
              </p>

              {authError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md text-xs text-red-800">
                  {authError}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-4 pt-2">
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  className="px-6 py-3 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <LogIn className="w-4 h-4" />
                  Sign In to Seller Operations Console
                </button>
              </div>
            </div>

            <div className="lg:col-span-5 bg-white border border-slate-200 rounded-lg p-6 space-y-4">
              <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
                Core Platform Safeguards
              </h2>
              <div className="space-y-3 text-xs text-slate-600">
                <div>
                  <strong className="text-slate-900">01. Fact-Only Product Extraction:</strong>{' '}
                  Marks missing attributes as &quot;Needs Review&quot; and detects conflicts between
                  supplier GST invoices and Amazon.in catalog records.
                </div>
                <div>
                  <strong className="text-slate-900">02. Category-Specific SP-API Rules:</strong>{' '}
                  Enforces character limits, restricted claim evidence checks, and Legal Metrology
                  fields before publishing.
                </div>
                <div>
                  <strong className="text-slate-900">03. Four-Bucket Claim Accounting:</strong>{' '}
                  Separates Potential, Requested, Approved, and Received INR reimbursement funds.
                </div>
                <div>
                  <strong className="text-slate-900">04. Tenant-Isolated RBAC &amp; Audit:</strong>{' '}
                  Administrator, Seller, and Reviewer roles backed by immutable Firestore security
                  rules.
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="flex items-center justify-between gap-8 px-6 py-3.5 bg-white border-b border-slate-200 sticky top-0 z-20">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#overview"
          onClick={(e) => {
            e.preventDefault();
            setActiveTab('overview');
          }}
          className="text-base font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
        >
          afzal Listing Automation
        </a>

        {/* Zone 2: 4-5 concise single-line text links */}
        <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-slate-600">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'overview' ? 'text-slate-900 underline underline-offset-4' : ''
            }`}
          >
            Overview
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('products')}
            className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'products' ? 'text-slate-900 underline underline-offset-4' : ''
            }`}
          >
            Products
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('generator')}
            className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'generator' ? 'text-slate-900 underline underline-offset-4' : ''
            }`}
          >
            Listing Generator
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('claims')}
            className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'claims' ? 'text-slate-900 underline underline-offset-4' : ''
            }`}
          >
            Claims
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'settings' ? 'text-slate-900 underline underline-offset-4' : ''
            }`}
          >
            Settings
          </button>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => signOut(auth)}
            className="px-3.5 py-1.5 text-xs font-medium text-white bg-slate-900 rounded-md hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* Workspace Body: Sidebar (256px) + Main Content Viewport */}
      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Sidebar Navigation (All 11 Required Views) */}
        <aside className="w-full lg:w-64 bg-white border-b lg:border-b-0 lg:border-r border-slate-200 shrink-0 flex flex-col justify-between p-4">
          <div className="space-y-1">
            <div className="px-3 py-2 text-xs text-slate-500 font-mono">
              {userProfile.role} · {userProfile.sellerAccountId}
            </div>
            <div className="flex lg:flex-col gap-1 overflow-x-auto pb-2 lg:pb-0">
              {NAV_ITEMS.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveTab(item.id)}
                    className={`px-3 py-2 text-xs font-medium rounded-md flex items-center gap-2.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      isActive
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="hidden lg:block pt-4 border-t border-slate-200 px-3 space-y-1 text-xs text-slate-500">
            <div className="font-medium text-slate-800 truncate">{userProfile.displayName}</div>
            <div className="font-mono truncate">{userProfile.email}</div>
            <div className="font-mono text-slate-400">
              SP-API: {connection?.mode || 'SANDBOX'}
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {activeTab === 'overview' && (
            <OverviewPanel
              products={products}
              claims={claims}
              errors={listingErrors}
              connection={connection}
              isSeeding={isSeeding}
              onSeedWorkspace={handleManualSeed}
              onNavigate={setActiveTab}
            />
          )}

          {activeTab === 'products' && (
            <ProductsModule
              user={userProfile}
              products={products}
              onSelectProductForGenerator={(p) => setSelectedProductForGenerator(p)}
              onNavigate={setActiveTab}
            />
          )}

          {(activeTab === 'generator' || activeTab === 'errors') && (
            <ListingGeneratorModule
              modeView={activeTab === 'errors' ? 'errors' : 'generator'}
              user={userProfile}
              products={products}
              errors={listingErrors}
              selectedProduct={selectedProductForGenerator}
              connection={connection}
              onSelectProduct={(p) => setSelectedProductForGenerator(p)}
            />
          )}

          {activeTab === 'bulk' && (
            <BulkUploadModule
              user={userProfile}
              existingProducts={products}
              bulkJobs={bulkJobs}
              connection={connection}
            />
          )}

          {(activeTab === 'claims' || activeTab === 'evidence') && (
            <ClaimsAndEvidenceModule
              modeView={activeTab === 'evidence' ? 'evidence' : 'claims'}
              user={userProfile}
              claims={claims}
              evidenceList={claimEvidence}
              products={products}
            />
          )}

          {(activeTab === 'connection' ||
            activeTab === 'reports' ||
            activeTab === 'audit' ||
            activeTab === 'settings') && (
            <SystemAndDocsModule
              modeView={activeTab}
              user={userProfile}
              products={products}
              claims={claims}
              auditLogs={auditLogs}
              connection={connection}
              onRoleChanged={(newRole) =>
                setUserProfile((prev) => (prev ? { ...prev, role: newRole } : prev))
              }
            />
          )}
        </main>
      </div>
    </div>
  );
}
