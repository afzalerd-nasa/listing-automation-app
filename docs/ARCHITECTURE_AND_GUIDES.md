# afzal Listing Automation — Architecture, Migrations & Operations Guide

## 1. Database Migrations (All 20 Required Tables)

```sql
-- 001_initial_schema.sql
CREATE TABLE roles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(32) UNIQUE NOT NULL
);

CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR(256) UNIQUE NOT NULL,
  display_name VARCHAR(120) NOT NULL,
  role_id INT REFERENCES roles(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE seller_accounts (
  id UUID PRIMARY KEY,
  owner_user_id UUID REFERENCES users(id) NOT NULL,
  amazon_seller_id VARCHAR(64) NOT NULL,
  company_name VARCHAR(160) NOT NULL,
  gstin VARCHAR(20),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE marketplace_connections (
  id UUID PRIMARY KEY,
  seller_account_id UUID REFERENCES seller_accounts(id) ON DELETE CASCADE,
  marketplace_id VARCHAR(32) DEFAULT 'A21TJRUUN4KGV',
  mode VARCHAR(24) DEFAULT 'SANDBOX',
  encrypted_lwa_refresh_token BYTEA NOT NULL,
  connection_status VARCHAR(40) NOT NULL,
  last_sync_at TIMESTAMPTZ
);

CREATE TABLE products (
  id UUID PRIMARY KEY,
  seller_account_id UUID REFERENCES seller_accounts(id) ON DELETE CASCADE,
  sku VARCHAR(64) NOT NULL,
  title VARCHAR(250) NOT NULL,
  brand VARCHAR(100) NOT NULL,
  manufacturer VARCHAR(120) NOT NULL,
  category VARCHAR(80) NOT NULL,
  product_type VARCHAR(80) NOT NULL,
  status VARCHAR(40) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(seller_account_id, sku)
);

CREATE TABLE product_identifiers (
  id UUID PRIMARY KEY,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  identifier_type VARCHAR(16) NOT NULL, -- ASIN, UPC, EAN, GTIN, HSN
  identifier_value VARCHAR(64) NOT NULL
);

CREATE TABLE product_attributes (
  id UUID PRIMARY KEY,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  attribute_name VARCHAR(80) NOT NULL,
  attribute_value TEXT NOT NULL,
  source_document VARCHAR(160) NOT NULL,
  confidence_score INT NOT NULL,
  needs_review BOOLEAN DEFAULT FALSE
);

CREATE TABLE listing_drafts (
  id UUID PRIMARY KEY,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  optimized_title VARCHAR(250) NOT NULL,
  bullets JSONB NOT NULL,
  description TEXT NOT NULL,
  backend_keywords VARCHAR(500) NOT NULL,
  approved_by_user_id UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ
);

CREATE TABLE listing_versions (
  id UUID PRIMARY KEY,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  version_number INT NOT NULL,
  snapshot_payload JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE listing_submissions (
  id UUID PRIMARY KEY,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  sp_api_submission_id VARCHAR(128) NOT NULL,
  sp_api_request_id VARCHAR(128) NOT NULL,
  mode VARCHAR(24) NOT NULL,
  processing_status VARCHAR(40) NOT NULL,
  verified_at TIMESTAMPTZ
);

CREATE TABLE listing_issues (
  id UUID PRIMARY KEY,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  error_code VARCHAR(64) NOT NULL,
  severity VARCHAR(24) NOT NULL,
  amazon_message TEXT NOT NULL,
  plain_explanation TEXT NOT NULL,
  field_affected VARCHAR(80) NOT NULL,
  old_value TEXT,
  proposed_value TEXT,
  status VARCHAR(40) NOT NULL
);

CREATE TABLE bulk_import_jobs (
  id UUID PRIMARY KEY,
  seller_account_id UUID REFERENCES seller_accounts(id) ON DELETE CASCADE,
  file_name VARCHAR(160) NOT NULL,
  total_rows INT NOT NULL,
  valid_rows INT NOT NULL,
  error_rows INT NOT NULL,
  duplicate_skus INT NOT NULL,
  sp_api_feed_id VARCHAR(128),
  status VARCHAR(40) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE policy_rules (
  id VARCHAR(64) PRIMARY KEY,
  policy_name VARCHAR(160) NOT NULL,
  official_source_url TEXT NOT NULL,
  effective_date DATE NOT NULL,
  review_date DATE NOT NULL,
  eligible_fulfilment_methods JSONB NOT NULL,
  deadline_days INT NOT NULL,
  exclusion_conditions TEXT NOT NULL
);

CREATE TABLE claim_candidates (
  id UUID PRIMARY KEY,
  seller_account_id UUID REFERENCES seller_accounts(id) ON DELETE CASCADE,
  sku VARCHAR(64) NOT NULL,
  asin VARCHAR(32),
  fnsku VARCHAR(64),
  shipment_id VARCHAR(64),
  transaction_id VARCHAR(64),
  event_date DATE NOT NULL,
  potential_amount_inr NUMERIC(12,2) NOT NULL,
  eligibility_status VARCHAR(64) NOT NULL
);

CREATE TABLE claims (
  id UUID PRIMARY KEY,
  seller_account_id UUID REFERENCES seller_accounts(id) ON DELETE CASCADE,
  claim_ref VARCHAR(64) UNIQUE NOT NULL,
  policy_rule_id VARCHAR(64) REFERENCES policy_rules(id),
  potential_amount_inr NUMERIC(12,2) NOT NULL,
  requested_amount_inr NUMERIC(12,2) DEFAULT 0,
  approved_amount_inr NUMERIC(12,2) DEFAULT 0,
  received_amount_inr NUMERIC(12,2) DEFAULT 0,
  workflow_status VARCHAR(48) NOT NULL,
  factual_explanation TEXT NOT NULL,
  requested_resolution TEXT NOT NULL,
  seller_accuracy_confirmed BOOLEAN DEFAULT FALSE
);

CREATE TABLE claim_evidence (
  id UUID PRIMARY KEY,
  claim_id UUID REFERENCES claims(id) ON DELETE CASCADE,
  document_type VARCHAR(80) NOT NULL,
  file_name VARCHAR(160) NOT NULL,
  reference_number VARCHAR(80) NOT NULL,
  verified_status VARCHAR(40) NOT NULL
);

CREATE TABLE amazon_cases (
  id UUID PRIMARY KEY,
  claim_id UUID REFERENCES claims(id) ON DELETE CASCADE,
  seller_central_case_id VARCHAR(64) NOT NULL,
  case_status VARCHAR(40) NOT NULL,
  reconciled_settlement_id VARCHAR(64),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE api_job_logs (
  id UUID PRIMARY KEY,
  seller_account_id UUID REFERENCES seller_accounts(id) ON DELETE CASCADE,
  endpoint VARCHAR(160) NOT NULL,
  request_id VARCHAR(128) NOT NULL,
  http_status INT NOT NULL,
  rate_limit_remaining VARCHAR(32),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY,
  seller_account_id UUID REFERENCES seller_accounts(id) ON DELETE CASCADE,
  actor_email VARCHAR(256) NOT NULL,
  actor_role VARCHAR(32) NOT NULL,
  action VARCHAR(120) NOT NULL,
  module VARCHAR(64) NOT NULL,
  verification_state VARCHAR(40) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE notifications (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(160) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 2. API Documentation
- `GET /api/sp-api/category-rules` — Returns Amazon.in (`A21TJRUUN4KGV`) category title limits, Legal Metrology mandatory fields, and restricted claims rules.
- `GET /api/sp-api/catalog/:identifier` — Retrieves existing Amazon.in catalog attributes by ASIN, SKU, or GTIN.
- `POST /api/ai/extract-product` — Multimodal Gemini 3.8 Flash product fact extractor with prompt-injection sanitization, field provenance confidence, and catalog conflict detection.
- `POST /api/ai/generate-listing` — Generates category-compliant Amazon.in title, 5 bullets, description, backend keywords, and validation report.
- `POST /api/ai/draft-claim` — Generates factual, non-exaggerated Seller Central reimbursement claim explanation and missing evidence checklist.
- `POST /api/sp-api/listings/submit` — Validates seller approval and Legal Metrology fields (`countryOfOrigin`, `mrpInr`) before submitting `putListingsItem` to SP-API Sandbox or Live mode.
- `POST /api/sp-api/errors/resolve` — Applies approved attribute patch via `patchListingsItem`.
- `POST /api/sp-api/feeds/bulk-submit` — Submits approved bulk rows via `createFeed (JSON_LISTINGS_FEED)`.
