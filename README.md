# Texas Incident Advocates (TIA) - Codebase

This repository contains the complete production-ready technology engine and portal for **Texas Incident Advocates (TIA)**, operating publicly as the **Texas Pipeline Safety Board (TPSB)**.

TIA is an authoritative independent watchdog capturing pipeline disaster leads in Texas. The codebase comprises a high-performance web dashboard, an exclusive Partner Portal, automated CRM routing integrations, and data engineering/scraping pipelines.

---

## 🏗️ Architecture & Tech Stack

Our systems are designed to operate as a unified, high-reliability engine:

1. **Frontend**: A modern dashboard and portal built using **Vite + React**. It provides real-time state/county-level tracking and exclusive client interface components.
2. **Backend**: An **Express (Node.js)** server that delivers the static frontend assets, handles API routing, authenticates portal sessions, and pushes CRM webhook notifications.
3. **Database**: 
   - **Local Cache**: Local SQLite databases (`leads.db` and `incidents.db`) containing indexed, parcel-matched pipeline records.
   - **Shared Storage**: SQLite synced dynamically via Turso across the team for lead logs and synchronization.
4. **Data Engineering & GIS Engine**: **Python 3** scripts utilizing GIS data matching libraries to scrape/ingest Railroad Commission (RRC) of Texas and PHMSA incident filings, parse affected landowners, and output targets.

---

## 📁 Repository Structure

```text
├── README.md                   # Project documentation and deployment guide
├── website/                    # Web Application & Partner Portal backend/frontend
│   ├── dist/                   # Production built static client bundle
│   ├── src/                    # React frontend source files
│   │   ├── App.jsx             # Live Texas Incident Feed page & Lead Capture
│   │   ├── PartnerPortal.jsx   # Dedicated dashboard for our exclusive legal partner
│   │   └── main.jsx            # React app mount point
│   ├── index.html              # Vite entry page
│   ├── leads.db                # SQLite database caching live local leads
│   ├── package.json            # Node.js project manifests and dependencies
│   ├── partner_config.json     # Configuration file for exclusive partner webhook/CRM integration
│   ├── server.js               # Express application server (serves build & APIs)
│   ├── test_portal_api.js      # Endpoint integration testing utility
│   ├── test_submit.js          # Direct webhook verification utility
│   └── vite.config.js          # Vite build optimization config
└── data_engineering/           # State and Federal Incident Ingestion Engines
    ├── explore_rrc.py          # RRC raw excel data layout explorer and field mapper
    ├── ingest_federal.py       # Federal PHMSA incident log parsing and normalization
    ├── ingest_rrc.py           # State RRC incident records ingestion into local SQLite cache
    ├── parcel_matcher.py       # GIS spatial and parcel matching with county CAD registers
    └── scrape_rrc_links.py     # Automated state crawler retrieving incident list sheets
```

---

## 🚀 Setup & Installation

### 💻 1. Website & Partner Portal Setup

To run the unified portal server and live feed locally:

1. Navigate to the `website` directory:
   ```bash
   cd website
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the application in local development mode (Hot-reload enabled):
   ```bash
   npm run dev
   ```
4. Build the production-ready distribution:
   ```bash
   npm run build
   ```
5. Start the production Node server (Express serves on port 3000 by default):
   ```bash
   npm start
   ```

### 📊 2. Data Engineering & Scraper Ingest pipelines

Ensure Python 3 is installed along with the required parsing and database utilities:

```bash
# Install parsing requirements
pip install pandas openpyxl xlrd requests
```

- Run the RRC Link Scraper to fetch the latest incident sheet links:
  ```bash
  python data_engineering/scrape_rrc_links.py
  ```
- Ingest RRC state records into your sqlite pipeline database:
  ```bash
  python data_engineering/ingest_rrc.py
  ```
- Run the GIS parcel matcher to find affected land properties:
  ```bash
  python data_engineering/parcel_matcher.py
  ```

---

## 🔒 Security & Sanitization

This codebase is fully white-labeled and sanitized to safeguard strategic exclusivity contracts. 
* All database credentials and external API endpoints are managed dynamically through `.env` or external configuration files (e.g. `partner_config.json`).
* No legacy corporate entity records or restricted attorney details are committed. Placeholders `[PARTNER_FIRM_NAME]`, `[PARTNER_MANAGING_ATTORNEY]`, and `[PARTNER_CITY]` are utilized to handle dynamically-bound exclusive legal partner settings.
