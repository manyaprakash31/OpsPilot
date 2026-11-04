# System Architecture & Technical Specifications
## OpsPilot — AI-Powered Operations Management Platform

OpsPilot is engineered as a bounded, high-assurance operational dispatch platform. It bridges unstructured incident communications with deterministic enterprise workflow engines and verifiable database records.

---

### 1. High-Level System Architecture

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ FRONTEND LAYER (React 18 + TypeScript + Vite + Tailwind CSS)                           │
│ • Custom Typography: DM Serif Display, IBM Plex Sans, IBM Plex Mono                   │
│ • Editorial Industrial Design Tokens (#F3F0E8 Warm Paper, #202622 Deep Ink)            │
│ • Incident Command Dashboard  • Ingestion Gateway  • Request Detail Console            │
│ • Executive Approvals Queue   • Audit Timeline Component  • Reference Ledger           │
└────────────────────────────────────────┬───────────────────────────────────────────────┘
                                         │ JSON / HTTPS / Bearer JWT
                                         ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ API GATEWAY & SECURITY LAYER (FastAPI)                                                 │
│ • CORS Origin Whitelist  • 1MB Request Payload Guard  • Safe Exception Shield          │
│ • Argon2id Password Verification  • PyJWT Authorization  • Login Brute-Force Lockout   │
└────────────────────────────────────────┬───────────────────────────────────────────────┘
                                         │
                 ┌───────────────────────┴───────────────────────┐
                 ▼                                               ▼
┌──────────────────────────────────────────────┐ ┌───────────────────────────────────────┐
│ AGENTIC REASONING PIPELINE (Bounded LLM)     │ │ DETERMINISTIC WORKFLOW ENGINE (Python)│
│ • Intake Agent (Entities & Source Quotes)    │ │ • Legal State Machine Transitions     │
│ • Prompt Injection Sanitization Guardrail    │ │ • Role-Based Access Control (RBAC)    │
│ • Risk & Severity Evaluator (1-100 Score)    │ │ • Financial Threshold Routing         │
│ • Mitigation Recommendation Generator        │ │ • Mandatory Rejection Handling        │
│ • Stakeholder Communication Synthesizer      │ │ • Alternative Recovery Logic          │
└──────────────────────┬───────────────────────┘ └───────────────────┬───────────────────┘
                       │                                             │
                       └───────────────────────┬─────────────────────┘
                                               │ SQLAlchemy 2.0 ORM
                                               ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ DATA PERSISTENCE LAYER                                                                 │
│ • SQLite (Development & Evaluation) / PostgreSQL (Cloud Deployment)                    │
│ • Tables: users, operational_requests, extracted_facts, risk_assessments,              │
│   recommendations, approvals, audit_events, inventory_items, suppliers, drafts         │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

### 2. Technology Stack & Design Decisions

| Subsystem | Selected Technology | Technical Rationale & Alternatives Rejected |
| :--- | :--- | :--- |
| **Frontend Framework** | React 18 + TypeScript | Component modularity, strict type-safety across complex operational schemas, zero runtime overhead. |
| **Styling & Design System**| Tailwind CSS + Custom Tokens | Editorial Industrial design with CSS variables (`#F3F0E8` paper, `#202622` ink, `#78836B` sage, `#C76542` accent). Avoided generic blue/purple AI gradients or bubbly cards. |
| **Typography** | DM Serif Display + IBM Plex | DM Serif for authoritative editorial titles; IBM Plex Sans for tabular density; IBM Plex Mono for timestamps and SKUs. |
| **Backend Framework** | FastAPI (Python 3.12) | High-performance asynchronous routing, native Pydantic V2 validation, automated OpenAPI schema generation. |
| **ORM & Database** | SQLAlchemy 2.0 + SQLite | Clean declarative data models migratable directly to PostgreSQL without code rewrites. Thread-safe pool pre-pinging. |
| **Security & Cryptography**| Argon2id (`argon2-cffi`) | Winner of the Password Hashing Competition. Memory-hard against GPU/ASIC attacks; immune to legacy bcrypt truncation. |
| **AI Intelligence Provider**| Configurable Provider Interface | Deterministic demo provider for 100% offline reproducibility; pluggable Gemini or OpenAI providers with safe fallback. |

---

### 3. Distinctive Frontend Design Architecture

The UI is built according to the **Editorial Industrial + Modern Operations Console** aesthetic:

1. **Restrained Color Hierarchy:**
   - Background: `--color-paper` (`#F3F0E8`) & surface (`#FAF8F5`)
   - Text & Dividers: `--color-ink` (`#202622`), `--color-ink-muted` (`#4F5B54`), `--color-paper-border` (`#D8D4C8`)
   - Functional Accents: `--color-accent` (`#C76542` for pending actions and primary CTA), `--color-sage` (`#78836B` for system provenance), `--color-critical` (`#A32D1C` for critical risks)
2. **Signature Visual Element — Operational Incident Timeline:**
   - A narrow 2px vertical rail with dedicated event nodes.
   - Distinct badges differentiating AI Agent extractions from human overrides.
   - Inline before-and-after visual diffs (`- PREV: 10`, `+ NEW: 14`) displaying exactly how human operators adjusted machine suggestions.
3. **Information Density & Asymmetry:**
   - Avoids symmetrical identical rounded card grids.
   - Prioritizes operational queues over decorative charts.
   - Tabular figures (`font-variant-numeric: tabular-nums`) align financial numbers and inventory stock counts cleanly.

---

### 4. Agentic AI Pipeline & Bounded Responsibilities

OpsPilot uses bounded, single-responsibility AI agents coordinated through a shared context envelope. AI agents are **strictly prohibited** from directly writing to the database, executing shell commands, approving money, or altering state transitions without backend validation.

```
                    ┌───────────────────────────────┐
                    │ Raw Operational Communication │
                    └───────────────┬───────────────┘
                                    │
                                    ▼
                    ┌───────────────────────────────┐
                    │ Prompt Injection Guardrail    │
                    │ (Pattern match & sanitization)│
                    └───────────────┬───────────────┘
                                    │
                                    ▼
                    ┌───────────────────────────────┐
                    │ Intake Agent                  │
                    │ • Entity & Date Extraction    │
                    │ • Text Source Quote Attribution│
                    │ • Missing Information Check   │
                    └───────────────┬───────────────┘
                                    │
                                    ▼
                    ┌───────────────────────────────┐
                    │ Inventory Verification Agent  │
                    │ (Cross-check against WMS DB)  │
                    └───────────────┬───────────────┘
                                    │
                                    ▼
                    ┌───────────────────────────────┐
                    │ Risk Assessment Agent         │
                    │ (Schedule deficit & impact)   │
                    └───────────────┬───────────────┘
                                    │
                                    ▼
                    ┌───────────────────────────────┐
                    │ Recommendation Agent          │
                    │ (Synthesizes options & costs) │
                    └───────────────┬───────────────┘
                                    │
                                    ▼
                    ┌───────────────────────────────┐
                    │ Communication Agent           │
                    │ (Drafts stakeholder emails)   │
                    └───────────────────────────────┘
```

#### Shared Context Envelope
Every agent operation consumes and produces typed Pydantic payloads maintaining:
- `request_id`: Persistent identifier
- `raw_content`: Untrusted incoming text
- `extracted_facts`: Verified entity structure
- `source_spans`: Verifiable quote provenance
- `validation_signals`: Conflict flags, missing fields, duplicate references
- `risk`: Numerical severity and operational impact
- `recommendations`: Action alternatives with trade-offs
- `audit_events`: Journal trail

---

### 5. Deterministic Workflow Engine & State Machine

OpsPilot enforces legal state transitions on the backend:

```
[ New ] ───────┬───────> [ Under Review ] <───────┐ (Rejection Recovery)
   │           │                 │                │
   │ (Missing  │                 ▼                │
   │  Facts)   │       [ Awaiting Approval ] ─────┘
   ▼           │                 │
[ Needs Info ] ┘                 ▼ (Authorized)
                           [ Approved ]
                                 │
                                 ▼
                          [ In Progress ] ───> [ Resolved ] ───> [ Closed ]
                                 │
                                 ▼
                            [ Blocked ]
```

#### Rejection Alternative Flow
When an authorized lead approver rejects an expenditure (e.g., rejecting an expensive air freight request):
1. Backend verifies a non-empty `rejection_reason` is supplied.
2. The approval record status transitions to `rejected`.
3. The parent request status reverts to `Under Review`.
4. Any currently selected recommendation is unselected, forcing the operational team to choose an alternative viable path (such as inter-depot road transfer or phased opening).
5. An audit event `APPROVAL_REJECTED` logs the approver, timestamp, and rejection justification.

---

### 6. Database Entity Relationship Model

```
 ┌──────────────┐          ┌───────────────────────┐          ┌───────────────────┐
 │    User      │ 1      * │  OperationalRequest   │ 1      1 │  ExtractedFacts   │
 │--------------│──────────│-----------------------│──────────│-------------------│
 │ id           │          │ id                    │          │ id                │
 │ username     │          │ request_code          │          │ request_id (FK)   │
 │ hashed_pass  │          │ title                 │          │ location          │
 │ role         │          │ status                │          │ target_entity     │
 │ is_active    │          │ priority              │          │ requested_qty     │
 └──────────────┘          │ has_conflicts         │          │ available_qty     │
        │                  │ requires_approval     │          │ delay_days        │
        │                  │ created_at            │          │ missing_fields    │
        │                  └───────────┬───────────┘          │ source_spans      │
        │                              │                      │ confidence_score  │
        │                              │ 1                    └───────────────────┘
        │                              │
        │           ┌──────────────────┼───────────────────┐
        │           │ *                │ *                 │ *
        │           ▼                  ▼                   ▼
        │    ┌──────────────┐   ┌──────────────┐   ┌───────────────────────┐
        │    │ RiskAssessm. │   │ Recommendation│  │      AuditEvent       │
        │    │--------------│   │--------------│   │-----------------------│
        │    │ id           │   │ id           │   │ id                    │
        │    │ request_id   │   │ request_id   │   │ request_id (FK)       │
        │    │ risk_level   │   │ action_key   │   │ actor_name            │
        │    │ severity_idx │   │ title        │   │ actor_role            │
        │    │ oper_impact  │   │ feasibility  │   │ is_ai (Boolean)       │
        │    │ fin_impact   │   │ est_cost     │   │ action                │
        │    └──────────────┘   │ pros / cons  │   │ previous_value        │
        │                       │ is_selected  │   │ new_value             │
        │                       └──────────────┘   │ reason                │
        │                                          └───────────────────────┘
        │ 1
        │
        ▼ *
 ┌──────────────┐
 │   Approval   │
 │--------------│
 │ id           │
 │ request_id   │
 │ cost         │
 │ status       │
 │ approver_id  │
 │ reject_reason│
 └──────────────┘
```

---

### 7. Security Architecture & Threat Modeling

1. **Authentication:** Argon2id password hashing with time cost 3, memory cost 64MB, parallelism 4. Plaintext passwords never hit disk or logs.
2. **Authorization & RBAC:** Every mutation endpoint inspects the caller's JWT role. Approvals strictly enforce `lead_approver`, `operations_manager`, or `admin`.
3. **Prompt Injection Mitigation:** All incoming emails pass through regex and semantic heuristics detecting instruction override signatures (`IGNORE PREVIOUS INSTRUCTIONS`, `SYSTEM OVERRIDE`). Flagged messages are sanitized, assigned security tags, and audited without crashing the system.
4. **DOS & Request Tampering Protection:** Fast Starlette middleware caps incoming request payloads to 1MB, rejecting oversized floods with HTTP 413.
5. **Brute-Force Protection:** Progressive login lockout prevents credential stuffing by locking accounts after 5 failed attempts for 15 minutes.
6. **Immutable Audit Protection:** The audit table does not expose `DELETE` or `PUT` endpoints. All state transitions, fact edits, and approvals automatically insert forward-only ledger records.

---

### 8. PostgreSQL Production Migration Strategy

For production deployment:
1. Update `DATABASE_URL` in `.env` to `postgresql://user:password@host:5432/opspilot`.
2. SQLAlchemy 2.0 models use standard ANSI types (`Integer`, `String`, `Text`, `Float`, `DateTime`, `Boolean`) with zero SQLite-specific quirks.
3. Replace SQLite connection args (`check_same_thread: False`) with connection pool tuning (`pool_size=20`, `max_overflow=10`).
4. Execute Alembic or `Base.metadata.create_all()` to generate tables with native PostgreSQL indexes.
