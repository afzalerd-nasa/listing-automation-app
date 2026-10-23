import { PolicyRule } from '../types';

export const AMAZON_INDIA_POLICY_RULES: PolicyRule[] = [
  {
    id: 'POL-IN-FBA-LOST-01',
    policyName: 'Amazon.in FBA Lost & Damaged Fulfillment Center Inventory Policy',
    officialSourceUrl: 'https://sellercentral.amazon.in/gp/help/external/G200213130',
    effectiveDate: '2025-04-01',
    reviewDate: '2026-10-01',
    eligibleFulfilmentMethods: ['FBA'],
    eventConditions:
      'Units lost or damaged inside an Amazon India Fulfillment Center (BOM5, DEL4, BLR7, HYD8) or by an Amazon-partnered carrier without automatic reimbursement within 14 days.',
    requiredEvidence: [
      'Inventory Ledger Detail Report showing Lost/Damaged event ID',
      'GST Tax Invoice proving purchase cost / HSN code',
      'FNSKU and ASIN mapping verification',
    ],
    deadlineDays: 60,
    exclusionConditions:
      'Defective units, customer-damaged returns, expired/unsellable inventory, or accounts with unresolved inventory investigation holds.',
    reviewStatus: 'Verified Active Policy',
  },
  {
    id: 'POL-IN-FBA-RECV-02',
    policyName: 'Amazon.in FBA Inbound Shipment Receiving Discrepancy Policy',
    officialSourceUrl: 'https://sellercentral.amazon.in/gp/help/external/G201214140',
    effectiveDate: '2025-06-15',
    reviewDate: '2026-10-01',
    eligibleFulfilmentMethods: ['FBA'],
    eventConditions:
      'Fewer units received at Amazon FC than declared on closed FBA Inbound Shipment ID after reconciliation tab opens.',
    requiredEvidence: [
      'GST Tax Invoice or Manufacturing Packing List with unit quantities',
      'Carrier Proof of Delivery (POD) with Amazon FC security stamp and carton count',
      'FBA Shipment ID & Box Content Label summary',
    ],
    deadlineDays: 30,
    exclusionConditions:
      'Shipments not yet in Closed status, missing box content information, or unsigned delivery challans.',
    reviewStatus: 'Verified Active Policy',
  },
  {
    id: 'POL-IN-EASYSHIP-SAFE-T-03',
    policyName: 'Amazon.in Easy Ship & Seller Flex SAFE-T Return Discrepancy Policy',
    officialSourceUrl: 'https://sellercentral.amazon.in/gp/help/external/G202175000',
    effectiveDate: '2025-08-01',
    reviewDate: '2026-10-01',
    eligibleFulfilmentMethods: ['Easy Ship'],
    eventConditions:
      'Returned item received in materially different, switched, or damaged condition via Amazon Easy Ship associate.',
    requiredEvidence: [
      'Uninterrupted unboxing video / timestamped photos showing outer Amazon tamper-evident bag & AWB barcode',
      'Photo of serial number / IMEI or wrong product received alongside original Order ID',
      'Original outward dispatch manifest or invoice',
    ],
    deadlineDays: 15,
    exclusionConditions:
      'Self-Ship orders (not fulfilled by Amazon Easy Ship), claims filed more than 15 calendar days after return delivery date, or blurred AWB labels.',
    reviewStatus: 'Verified Active Policy',
  },
  {
    id: 'POL-IN-FEE-WEIGHT-04',
    policyName: 'Amazon.in FBA / Easy Ship Weight & Dimension Fee Overcharge Audit',
    officialSourceUrl: 'https://sellercentral.amazon.in/gp/help/external/G201112670',
    effectiveDate: '2025-01-10',
    reviewDate: '2026-09-15',
    eligibleFulfilmentMethods: ['FBA', 'Easy Ship'],
    eventConditions:
      'Cubiscan / volumetric weight recorded in Seller Central exceeds actual physical dimensions by more than tolerance threshold, causing excess weight handling fees.',
    requiredEvidence: [
      'Photos of packaged product next to calibrated measuring tape (L x W x H in cm)',
      'Photo of product on digital weighing scale showing weight in grams',
      'Fee Preview / Transaction ID log showing higher weight slab billed',
    ],
    deadlineDays: 90,
    exclusionConditions:
      'More than 2 cubiscan re-measurement requests for the same FNSKU within 60 days.',
    reviewStatus: 'Verified Active Policy',
  },
];

export const SAMPLE_SUPPLIER_DOCUMENTS = [
  {
    id: 'DOC-MILTON-FLASK',
    label: 'Supplier Spec + GST Invoice: Stainless Vacuum Flask (Conflict w/ Catalog ASIN B09X7K2IN1)',
    identifier: 'B09X7K2IN1',
    category: 'HOME_KITCHEN',
    productType: 'STORAGE_CONTAINER',
    rawText: `SUPPLIER SPECIFICATION & TAX INVOICE — HAMILTON HOUSEWARES INDIA
Product Name: Milton Thermosteel Flip Lid Vacuum Insulated Flask 1000ml
SKU: AFZ-KITCH-FLASK-1000
Existing Amazon ASIN: B09X7K2IN1
EAN / GTIN: 8901234567890
Brand: Milton
Manufacturer: Hamilton Housewares Pvt. Ltd., Vapi, Gujarat
Material: 304 Food Grade Stainless Steel (Inner Copper Coating)
Capacity / Size: 1000 ml (1 Litre)
Color: Brushed Steel Silver
Product Dimensions: 10.5 x 10.5 x 30.2 cm
Item Weight: 515 g
Package Quantity: 1
Included Accessories: 1 Insulated Flask, 1 Nylon Carrying Pouch, User Care Leaflet
Technical Specifications: 24 Hours Hot & Cold retention, Leak-proof flip lid, Rust-free body
Country of Origin: India
HSN Code: 96170011
Maximum Retail Price (MRP): INR 1350.00
Proposed Selling Price: INR 999.00
Note: Do not claim ISI certified unless BIS license number is attached.`,
  },
  {
    id: 'DOC-KREO-EARBUDS',
    label: 'Supplier Sheet: Kreo Halo ANC Earbuds (Missing Country of Origin & Part Number)',
    identifier: 'B0B4N8ELEC',
    category: 'CONSUMER_ELECTRONICS',
    productType: 'HEADPHONES',
    rawText: `PRODUCT SPECIFICATION SHEET — KREO TECH PVT LTD
Product Name: Kreo Halo True Wireless Earbuds with 32dB Active Noise Cancellation
SKU: AFZ-TWS-ANC-PRO
ASIN: B0B4N8ELEC
Brand: Kreo
Manufacturer: Kreo Tech Pvt Ltd, Bengaluru, Karnataka
Model Number: KR-HALO-TWS-01
Color: Obsidian Black
Material: Matte ABS Polycarbonate
Dimensions: 6.2 x 4.8 x 2.7 cm
Weight: 46 g
Package Quantity: 1
Included Accessories: Charging Case, USB-C Cable, 3 Pairs Silicone Ear Tips (S/M/L)
Technical Specifications: Bluetooth 5.3, 13mm Titanium Drivers, 32dB ANC, 40 Hours Total Playtime, Quad Mic ENC
Compatibility: Android, iOS, Windows, macOS Bluetooth devices
HSN Code: 85183000
Maximum Retail Price (MRP): INR 3499
Selling Price: INR 1899
(Note: Part Number and Country of Origin omitted in supplier sheet — must be flagged as Needs Review).`,
  },
  {
    id: 'DOC-JAIPUR-KURTA',
    label: 'Artisan Invoice: Men Cotton Indigo Straight Kurta (New Listing)',
    identifier: 'AFZ-KURTA-IND-L',
    category: 'APPAREL',
    productType: 'KURTA',
    rawText: `SANGANER TEXTILE EXPORTERS — PRODUCT DATA SHEET
Product Title: VastraVeda Men's Pure Handblock Printed Indigo Cotton Straight Kurta
SKU: AFZ-KURTA-IND-L
GTIN: 8907788990011
Brand: VastraVeda
Manufacturer: Sanganer Textile Artisans Pvt. Ltd., Jaipur, Rajasthan
Color: Indigo Blue
Size: Large (Chest 42 Inches)
Material: 100% Breathable Cambric Cotton
Dimensions: 32 x 24 x 2 cm (Folded Pack)
Weight: 280 g
Package Quantity: 1
Included Accessories: 1 Kurta
Technical Specifications: Mandarin Collar, Full Sleeves, Side Slits, Pre-shrunk natural dye
Country of Origin: India
HSN Code: 62052000
MRP: INR 1999
Selling Price: INR 849`,
  },
];

export const SAMPLE_BULK_CSV_CONTENT = `sku,asin,gtin,title,brand,category,productType,mrpInr,sellingPriceInr,inventoryCount,countryOfOrigin,hsnCode,fulfilmentChannel
AFZ-KITCH-CASS-2500,B09CASS2500,8901112223331,Signoraware Executive Stainless Steel Insulated Casserole 2500ml,Signoraware,HOME_KITCHEN,COOKWARE,1490,1049,120,India,73239390,FBA
AFZ-ELEC-GAN-65W,B09GAN65WIN,8901112223332,VoltEdge 65W GaN Fast Wall Charger 3-Port Type-C PD Adapter for MacBook & iPhone,VoltEdge,CONSUMER_ELECTRONICS,CHARGER_ADAPTER,2999,1599,85,India,85044030,FBA
AFZ-KITCH-CASS-2500,B09CASS2500,8901112223331,Duplicate SKU Row — Signoraware Casserole 2500ml,Signoraware,HOME_KITCHEN,COOKWARE,1490,1049,40,India,73239390,FBA
AFZ-GROC-KASH-SAFFRON,,8901112223334,Pampore Gold 100% Pure Kashmiri Mongra Saffron Threads 2g Pack,Pampore Gold,GROCERY_GOURMET,SPICES_MASALA,950,699,200,Needs Review,09102090,Easy Ship
AFZ-APP-LINEN-SHIRT-M,,8901112223335,VastraVeda Men's Classic Olive Linen Casual Shirt Medium,VastraVeda,APPAREL,SHIRT,2499,1199,65,India,62052000,Easy Ship`;
