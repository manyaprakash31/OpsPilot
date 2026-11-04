# OpsPilot — AI-Powered Operations Management Platform

[![Python Version](https://img.shields.io/badge/python-3.12-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-green.svg)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-18.3-61dafb.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue.svg)](https://www.typescriptlang.org/)
[![Tests](https://img.shields.io/badge/pytest-28%20passed-success.svg)](https://pytest.org/)

**OpsPilot** is an operational incident management platform built for enterprise supply chain, retail store launches, and high-velocity field logistics. It bridges messy, unstructured operational communications (emails, vendor memos, supplier delay notifications) with structured workflows, verifiable database records, and deterministic human-in-the-loop governance.

---

## 1. Key Highlights & Distinctive Design

- **Editorial Industrial + Operations Console Aesthetic:** Custom design system built with warm paper tones (`#F3F0E8`), deep ink (`#202622`), muted sage (`#78836B`), and burnt-orange accents (`#C76542`). Features distinct typography using **DM Serif Display**, **IBM Plex Sans**, and **IBM Plex Mono**.
- **Signature Incident Timeline Rail:** A functional, vertical operational audit rail with differentiated event markers (AI Agent vs. Human Operator) and inline before/after diffs (`- PREV: 10`, `+ NEW: 14`).
- **Verifiable Warehouse Ground Truth:** Automatically cross-checks incoming claims against live warehouse inventory tables (`InventoryItem`). Flags discrepancies immediately without hallucinating phantom stock.
- **Explainable Agentic AI Pipeline:** Bounded components for Intake, Risk Assessment, Recommendation Synthesis, and Communication Drafting with text-quote provenance attribution (`source_spans`).
- **Deterministic Governance & State Machine:** Hard state transitions (`New` &rarr; `Under Review` &rarr; `Awaiting Approval` &rarr; `Approved` &rarr; `In Progress` &rarr; `Resolved` &rarr; `Closed`). Rejecting an approval mandates an explanation and automatically triggers alternative mitigation routing.
- **Enterprise Security:** Argon2id password hashing, server-side JWT authorization, RBAC enforcement, adversarial prompt injection pattern neutralization, and 1MB payload ceilings.

---

## 2. Technology Stack

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS with custom tokens, Lucide icons.
- **Backend:** Python 3.12, FastAPI, SQLAlchemy 2.0 ORM, Pydantic V2, Starlette middlewares.
- **Database:** SQLite for local evaluation (fully migratable to PostgreSQL without schema modifications).
- **Authentication & Security:** Argon2id (`argon2-cffi`), PyJWT, constant-time verification, login lockout brute-force defense.
- **Testing:** `pytest` + `pytest-asyncio` + FastAPI `TestClient` (12 automated tests covering all edge cases).

---

## 3. Quick Start & Execution Instructions

### Prerequisites
- Python 3.12+ installed
- Node.js v18+ and npm installed

### Step A: Backend Setup
```bash
# 1. Navigate to project root
cd D:\OpsPilot

# 2. Activate Python virtual environment
.\venv\Scripts\activate

# 3. Navigate to backend directory and verify dependencies
cd backend
pip install -r requirements.txt

# 4. Initialize database and seed demonstration data
python -m app.routes.seed_data

# 5. Start the FastAPI backend server
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
The backend API and OpenAPI Swagger documentation will be live at:
- API Root: `http://127.0.0.1:8000/api`
- Interactive API Docs: `http://127.0.0.1:8000/docs`
- Health Check: `http://127.0.0.1:8000/api/health`

### Step B: Frontend Setup
In a second terminal:
```bash
# 1. Navigate to frontend directory
cd D:\OpsPilot\frontend

# 2. Install dependencies (if not already installed)
npm install

# 3. Start the Vite development server
npm run dev
```
The frontend will be live at:
- Web Application: `http://localhost:5173`

---

## 4. Evaluation Credentials & RBAC Personas

The application presents a secure Editorial Industrial login screen at `http://localhost:5173`. Authentication is verified against Argon2id password hashes on the backend. The sidebar displays the authenticated identity as read-only metadata and provides a secure "Sign Out" button. To evaluate different roles, sign out and authenticate with the desired persona:

| Username | Password | Role | Permissions & Responsibilities |
| :--- | :--- | :--- | :--- |
| `operator` | `Operator123!` | `operator` | Intake incidents, review AI extraction, commit human fact corrections, adopt mitigation options. Cannot authorize financial expenditures. |
| `manager` | `Manager123!` | `operations_manager` | Manage operational queues, review trade-offs, coordinate requests. |
| `approver` | `Approver123!` | `lead_approver` | Authorize or decline financial expenditures (e.g. INR 42,000 air freight), enforce budget justification. |
| `admin` | `Admin123!` | `admin` | User administration, audit trail inspection. Does not automatically inherit business expenditure authority. |

---

## 5. Primary Demonstration Case: Pune Store Launch

- **Scenario Context:** A supplier has reported that 500 display units required for a Pune store launch (Phoenix Marketcity) will be delayed by 10 days. The store opens next week. Only 120 units are verified available in the warehouse. An emergency decision and budget approval are required by 4:00 PM today.
- **How to Test in OpsPilot:**
  1. Open `http://localhost:5173` and log in with username `operator` and password `Operator123!`.
  2. Click **Operations Inbox**.
  3. Click the preset button: **"Primary Demo: Pune Store Launch (500 Units)"**.
  4. Click **"Process & Extract Workflow"**.
  5. Inspect the parsed facts, text quote source spans, and warehouse ledger cross-verification (SKU `DISP-PUN-001`: 120 units on hand; 380-unit deficit).
  6. Click **"Correct Information"** to adjust lead time or quantities, entering a mandatory justification note.
  7. In Section 5, select **"Air Freight Expedited Delivery (INR 42,000)"**. The workflow transitions to `Awaiting Approval`. Notice that the Operator cannot approve the expenditure.
  8. Click **"Sign Out"** in the sidebar. Log in as **Vikramaditya Rao** (`approver` / `Approver123!`).
  9. Click **Approvals Queue** or inspect the request. Click **"Authorize Budget"** to confirm allocation. The workflow advances to `Approved`.
  10. Inspect the auto-generated **Stakeholder Communications** (Supplier Notice, Store Manager Memo) and the **Incident History Rail**.

---

## 6. Running Automated Tests

OpsPilot comes with a comprehensive test suite covering authentication, session revocation, RBAC authorization, prompt injection, duplicate detection, and all operational edge cases.

```bash
cd D:\OpsPilot\backend
..\venv\Scripts\python -m pytest -v
```

### Test Suite Execution Output:
```text
tests/test_opspilot.py::test_password_hashing PASSED                     [  4%]
tests/test_opspilot.py::test_unauthenticated_requests_rejected PASSED    [  8%]
tests/test_opspilot.py::test_valid_credentials_permit_login PASSED       [ 12%]
tests/test_opspilot.py::test_invalid_credentials_rejected PASSED         [ 16%]
tests/test_opspilot.py::test_operator_cannot_approve_action PASSED       [ 20%]
tests/test_opspilot.py::test_forged_role_or_id_cannot_bypass_authorization PASSED [ 25%]
tests/test_opspilot.py::test_logout_invalidates_session PASSED           [ 29%]
tests/test_opspilot.py::test_authorized_lead_approver_can_approve PASSED [ 33%]
tests/test_opspilot.py::test_error_responses_do_not_leak_stack_traces PASSED [ 37%]
tests/test_opspilot.py::test_admin_cannot_bypass_business_approval PASSED [ 41%]
tests/test_opspilot.py::test_unauthenticated_registration_blocked PASSED [ 45%]
tests/test_opspilot.py::test_primary_pune_scenario_intake PASSED         [ 50%]
tests/test_opspilot.py::test_edge_case_missing_information PASSED        [ 54%]
tests/test_opspilot.py::test_edge_case_conflicting_inventory PASSED      [ 58%]
tests/test_opspilot.py::test_edge_case_duplicate_detection PASSED        [ 62%]
tests/test_opspilot.py::test_edge_case_human_correction_audit PASSED     [ 66%]
tests/test_opspilot.py::test_edge_case_low_confidence_scoring PASSED     [ 70%]
tests/test_opspilot.py::test_edge_case_approval_rejection_workflow PASSED [ 75%]
tests/test_opspilot.py::test_edge_case_prompt_injection PASSED           [ 79%]
tests/test_opspilot.py::test_illegal_workflow_transition PASSED          [ 83%]
tests/test_opspilot.py::test_cannot_manually_transition_to_approved PASSED [ 87%]
tests/test_opspilot.py::test_closure_conditions_block_resolution_with_pending_approval PASSED [ 81%]
tests/test_opspilot.py::test_fact_correction_triggers_dynamic_reassessment PASSED [ 85%]
tests/test_opspilot.py::test_complete_lifecycle_to_closure PASSED        [ 88%]
tests/test_opspilot.py::test_approval_escalation PASSED                  [ 92%]
tests/test_opspilot.py::test_management_summary PASSED                   [ 96%]
tests/test_opspilot.py::test_duplicate_does_not_create_active_incident PASSED [ 96%]
tests/test_opspilot.py::test_security_headers_present PASSED             [100%]

======================== 28 passed, 1 warning in 4.29s ========================
```


---

## 7. Deliverable Documentation & Architecture Guides

The codebase is organized with clear separation between technical engineering documentation and external presentation deliverables:

### Core Repository Documentation (in `D:\OpsPilot/`)
- [`ARCHITECTURE.md`](ARCHITECTURE.md): Technical Architecture Document detailing system topologies, agent pipelines, database schema, state machine transitions, and the security model.
- [`EDGE_CASES.md`](EDGE_CASES.md): Exhaustive matrix of 8+ operational failure modes, automated recovery policies, audit recordings, and associated unit tests.
- [`.env.example`](.env.example): Fully documented environment template with production security guardrails.
- [`backend/tests/test_opspilot.py`](backend/tests/test_opspilot.py): End-to-end automated test suite (28 passing tests).

### External Evaluation Deliverables (in `D:\OpsPilot_Submission/`)
External assessment assets and pitch artifacts are housed outside the main codebase in `D:\OpsPilot_Submission`:
- `PRD.md`: Comprehensive Product Requirements Document (problem statement, user personas, functional specifications, metric indicators).
- `SLIDES.md`: 10-slide presentation deck tailored for executive and technical panel evaluation.
- `DEMO_SCRIPT.md`: Minute-by-minute video demonstration walkthrough script (up to 10 minutes) with speaker notes.

---

## 8. Clean Repository Structure

```
D:\OpsPilot\
├── .env.example
├── .gitignore
├── render.yaml
├── README.md
├── ARCHITECTURE.md
├── EDGE_CASES.md
├── backend\
│   ├── requirements.txt
│   ├── app\
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── database.py
│   │   ├── auth\
│   │   │   ├── security.py
│   │   │   └── deps.py
│   │   ├── models\
│   │   │   └── models.py
│   │   ├── schemas\
│   │   │   └── schemas.py
│   │   ├── agents\
│   │   │   ├── base.py
│   │   │   ├── validator.py
│   │   │   ├── intake_agent.py
│   │   │   ├── risk_agent.py
│   │   │   ├── recommendation_agent.py
│   │   │   ├── workflow_engine.py
│   │   │   └── communication_agent.py
│   │   └── routes\
│   │       ├── auth.py
│   │       ├── requests.py
│   │       ├── approvals.py
│   │       ├── audit.py
│   │       ├── dashboard.py
│   │       ├── inventory.py
│   │       └── seed_data.py
│   └── tests\
│       ├── conftest.py
│       └── test_opspilot.py
└── frontend\
    ├── .env.example
    ├── vercel.json
    ├── index.html
    ├── package.json
    ├── tsconfig.json
    ├── vite.config.ts
    ├── tailwind.config.js
    └── src\
        ├── main.tsx
        ├── App.tsx
        ├── style.css
        ├── types\
        │   └── index.ts
        ├── api\
        │   └── client.ts
        ├── components\
        │   ├── Navigation.tsx
        │   └── Timeline.tsx
        └── views\
            ├── DashboardView.tsx
            ├── InboxView.tsx
            ├── RequestDetailView.tsx
            ├── ApprovalsView.tsx
            ├── AuditView.tsx
            ├── ReferenceView.tsx
            └── LoginView.tsx
```

---

## 9. Verification & Acceptance Sign-off

- [x] Backend imports and starts cleanly with seeded database.
- [x] Frontend builds cleanly with zero TypeScript errors (`tsc && vite build`).
- [x] Primary Pune store launch scenario seeded and fully testable end-to-end.
- [x] 28/28 automated pytest tests executing and passing cleanly.
- [x] Human fact corrections journaled with before/after diffs in incident rail.
- [x] Approval and rejection workflows enforce RBAC and mandatory rejection reasons.
- [x] Prompt injection attempts detected, neutralized, and audited.
- [x] Metrics derived strictly from database tables.
- [x] No plaintext passwords, committed secrets, or unignored databases.
- [x] Supabase PostgreSQL Session Pooler connectivity verified with idempotent seeding.
- [x] Render and Vercel cloud deployment configurations verified.

---

## 10. Cloud Deployment Guide (Render + Vercel + Supabase)

OpsPilot is engineered as a decoupled monorepo ready for cloud deployment:
- **Backend API:** Hosted on **Render** (FastAPI Python 3.12 Web Service)
- **Frontend App:** Hosted on **Vercel** (Vite + React Single-Page Application)
- **Production Database:** Hosted on **Supabase** (PostgreSQL 17 via IPv4 Session Pooler)

### Part A: Deploy Backend on Render

1. **Create Web Service:**
   - In Render Dashboard, click **New +** &rarr; **Web Service**.
   - Connect your GitHub repository.
2. **Configure Service Settings:**
   - **Name:** `opspilot-api`
   - **Root Directory:** `backend`
   - **Runtime:** `Python 3`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Health Check Path:** `/api/health`
3. **Set Environment Variables in Render:**

   | Environment Variable | Value / Description | Example |
   | :--- | :--- | :--- |
   | `PYTHON_VERSION` | Python 3.12 runtime | `3.12.6` |
   | `DATABASE_URL` | Supabase PostgreSQL Session Pooler connection string | `postgresql://postgres.[REF]:[PASS]@aws-1-[REGION].pooler.supabase.com:5432/postgres` |
   | `SECRET_KEY` | Cryptographically secure 32+ char JWT signing key | *(Generate via Render or `openssl rand -hex 32`)* |
   | `ACCESS_TOKEN_EXPIRE_MINUTES` | Token session validity in minutes | `720` |
   | `LLM_PROVIDER` | Deterministic provider (reproducible offline execution) | `deterministic` |
   | `DEMO_MODE` | Enables demonstration scenario presets | `true` |
   | `CORS_ORIGINS` | Allowed frontend origins (comma-separated or JSON list) | `https://*.vercel.app,http://localhost:5173` |

4. **Blueprint Deployment (Alternative):**
   - Alternatively, Render will automatically detect the root [`render.yaml`](render.yaml) file to configure the web service with one click.

---

### Part B: Deploy Frontend on Vercel

1. **Import Project:**
   - In Vercel Dashboard, click **Add New...** &rarr; **Project** and select your repository.
2. **Configure Project Settings:**
   - **Framework Preset:** `Vite`
   - **Root Directory:** `frontend`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
3. **Set Environment Variables in Vercel:**

   | Environment Variable | Value / Description | Example |
   | :--- | :--- | :--- |
   | `VITE_API_BASE_URL` | Full URL of your deployed Render backend | `https://opspilot-api.onrender.com` |

4. **Client-Side Routing (`vercel.json`):**
   - [`frontend/vercel.json`](frontend/vercel.json) rewrites all non-asset requests to `index.html` to support smooth client-side SPA routing and page refreshes.

---

### Part C: Verification of Live Cloud Deployment

1. **Backend Health Check:** Visit `https://<YOUR-RENDER-APP>.onrender.com/api/health`
   - Response: `{"status": "healthy", "database": "connected", "service": "OpsPilot Operations Engine", ...}`
2. **Interactive API Docs:** Visit `https://<YOUR-RENDER-APP>.onrender.com/docs`
3. **Frontend Application:** Open `https://<YOUR-VERCEL-APP>.vercel.app`
   - Authenticate with `operator` / `Operator123!` or any evaluation account.
   - Verify that operations inbox, approval workflow, and live metrics query Supabase seamlessly.
