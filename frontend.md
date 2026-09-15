================================================================================
FRONTEND DESIGN SYSTEM & IMPLEMENTATION SPECIFICATION
PROJECT: Quittance (Agent Settlement & Delivery Verification Protocol)
TARGET AUDIENCE: Autonomous Agents, AI Engineers, Judges, Hackathon Verifiers
DOCUMENT: frontend.txt
================================================================================

1. DESIGN SYSTEM & TOKENS
--------------------------------------------------------------------------------
Framework: Next.js 14/15 (App Router), Tailwind CSS v3.4+, Lucide Icons, Framer Motion.
Theme Concept: Ultra-modern Dark Web3/Fintech Dashboard (Obsidian + Neon Accents + Glassmorphism).

1.1 COLOR PALETTE
- Backgrounds:
  * bg-base:          #070709 (Deep Obsidian Void)
  * bg-surface:       #0d0e12 (Elevated Card Base)
  * bg-surface-elev:  #14161d (Elevated Dropdowns & Modals)
  * bg-glass:         rgba(13, 14, 18, 0.70) with backdrop-blur-md
- Borders & Dividers:
  * border-subtle:    rgba(255, 255, 255, 0.07)
  * border-medium:    rgba(255, 255, 255, 0.14)
  * border-highlight: rgba(255, 255, 255, 0.28)
  * border-glow:      rgba(99, 102, 241, 0.40)
- Accents & Highlights:
  * accent-primary:   #6366f1 (Electric Indigo)
  * accent-glow:      rgba(99, 102, 241, 0.15)
  * accent-secondary: #06b6d4 (Cyan Telemetry)
  * accent-amber:     #f59e0b (Warning / Requirements Mismatch)
  * accent-rose:      #f43f5e (Non-discharge / Settlement Failed / Gate Error)
  * accent-violet:    #8b5cf6 (KeeperHub Execution Signature)
- Text Ramp:
  * text-primary:     #f8fafc (Slate 50)
  * text-secondary:   #94a3b8 (Slate 400)
  * text-muted:       #475569 (Slate 600)
  * text-mono:        #cbd5e1 (Slate 300)

1.2 TYPOGRAPHY
- Headings & Interface: Plus Jakarta Sans / Inter / Geist Sans
  * Display:          text-4xl md:text-5xl font-extrabold tracking-tight
  * H2 / Section:     text-2xl md:text-3xl font-bold tracking-tight
  * H3 / Card Title:  text-lg font-semibold tracking-normal
  * Body:             text-sm (14px) leading-relaxed font-normal
  * Small / Caption:  text-xs (11px-12px) font-medium tracking-wide
- Data, Hashes & Code: JetBrains Mono / SF Mono
  * tabular-nums, tnum enabled on all metrics, monetary amounts, latencies, and hashes.

1.3 SURFACE EFFECTS & ELEVATION
- Glass Card:
  bg-surface/80 backdrop-blur-xl border border-white/[0.08] shadow-2xl shadow-black/60 rounded-2xl
- Ambient Glow:
  radial-gradient(ellipse 80% 50% at 50% -20%, rgba(99, 102, 241, 0.15), transparent)
- Active Nav Pill:
  bg-white/[0.08] border border-white/[0.12] text-white shadow-inner shadow-white/5
- Chip Badge:
  rounded-full px-2.5 py-0.5 text-xs font-mono font-medium border

--------------------------------------------------------------------------------
2. COMPONENT ARCHITECTURE & FILE TREE
--------------------------------------------------------------------------------
apps/web/
├── app/
│   ├── layout.tsx                # Root layout, theme injection, ambient backdrop
│   ├── page.tsx                  # Landing: Hero, Metrics Bento, Mechanism Flow, Live Evidence Feed
│   ├── receipts/
│   │   ├── page.tsx              # Full Receipts Stream with advanced filtering & pagination
│   │   └── [hash]/page.tsx       # Receipt Deep Dive: Breakdown, Raw JSON, CLI Copy
│   ├── endpoints/
│   │   ├── page.tsx              # Endpoint Directory & Reliability Leaderboard
│   │   └── [host]/page.tsx       # Endpoint Health Record, Reason Codes, Historic Latency
│   └── verify/
│       └── page.tsx              # Client-Side Zero-Dependency Verifier Playground
├── components/
│   ├── layout/
│   │   ├── Navbar.tsx            # Floating glass nav with tab pill selector & status ping
│   │   ├── Footer.tsx            # Multi-column telemetry footer with KeeperHub heartbeat
│   │   └── CommandPalette.tsx    # Cmd+K global lookup for hashes & endpoints
│   ├── dashboard/
│   │   ├── BentoStats.tsx        # 4-card metric grid with sparklines
│   │   ├── MechanismStepper.tsx  # Interactive visual flow of the verification/discharge pipeline
│   │   ├── EvidenceTable.tsx     # Filterable streaming ledger of gated calls
│   │   └── VerdictBadge.tsx      # Multi-state enumerated verdict indicators
│   ├── receipt/
│   │   ├── ReceiptViewer.tsx     # Syntax-highlighted canonical JSON inspector
│   │   ├── DiffTermsView.tsx     # Advertised vs Observed envelope comparator
│   │   └── CliReDerive.tsx       # Copy-paste terminal block for local reproduction
│   └── ui/
│       ├── Button.tsx
│       ├── Card.tsx
│       ├── Tabs.tsx
│       └── Drawer.tsx
└── lib/
    ├── types.ts                  # Zod receipt & verdict schemas
    └── verifier.ts               # Client-side pure verdict re-derivation

--------------------------------------------------------------------------------
3. WIREFRAMES & LAYOUT SPECIFICATIONS (NAV TO FOOTER)
--------------------------------------------------------------------------------

3.1 GLOBAL NAVIGATION BAR (components/layout/Navbar.tsx)
- Layout: Sticky top-4 z-50 flex justify-center px-4 w-full
- Inner Container:
  * Max-w-6xl w-full h-14 rounded-full bg-[#0d0e12]/80 backdrop-blur-xl border border-white/[0.08]
  * px-6 flex items-center justify-between shadow-lg shadow-black/40
- Left:
  * Brand Logo: Hexagonal geometric icon in Indigo (#6366f1) + "QUITTANCE" in bold tracked-wider text.
  * System Badge: Mini pill next to brand "Base Mainnet // KeeperHub Live" with pulsing green LED dot.
- Center (The Floating Tabs):
  * Segmented pill controller with an active backdrop slider (Framer Motion layoutId="navTab").
  * Tab items:
    1. "Overview" (`/`)
    2. "Receipts" (`/receipts`)
    3. "Endpoints" (`/endpoints`)
    4. "Verifier" (`/verify`)
- Right:
  * Quick Search: Button triggering Cmd+K with "Search hash, host..." (kbd shortcut displayed).
  * CTA: Secondary button "Run CLI" linking directly to terminal instructions or `/verify`.

3.2 HERO & LIVE STATS BENTO (app/page.tsx)
- Hero Header:
  * Top Tag: Pill with violet border: "Decentralized Settlement for Agent Micropayments".
  * Headline: "Verify Delivery Before Money Moves." (White to Slate-400 gradient text).
  * Subtitle (Thesis): "Quittance settles an agent's payment for an x402 endpoint only after
    the response conforms to advertised requirements. Zero blind trust, on-chain KeeperHub execution."
  * Action Row: "Inspect Latest Run" (solid Indigo button with arrow) + "Re-derive Receipts" (glass button).
- Bento Grid (4 Cards):
  1. Card 1 (Total Value Discharged): Large monospace stat "12,482.50 USDC", subtitle "KeeperHub executed".
  2. Card 2 (Settlement Success): "94.2%", subtitle "2,104 Delivered / 130 Withheld".
  3. Card 3 (Median Latency): "184ms", subtitle "Against declared endpoint SLA".
  4. Card 4 (Active Listed Endpoints): "48 Live Hosts", subtitle "Daydreams / XGate index".

3.3 INTERACTIVE MECHANISM STEPPER (components/dashboard/MechanismStepper.tsx)
- Visual 5-Stage Stepper visualizing Section 5.1 of the PRD:
  * Node 1: "Buyer Intent" (Pre-signed discharge authorization hold).
  * Node 2: "x402 Probe" (HTTP 402, parse `accepts[]` constraints & price).
  * Node 3: "Call & Hash" (Inspect observed response envelope against SLA).
  * Node 4: "Pure Verdict" (Deterministic math: `verdict(advertised, observed)`).
  * Node 5: "Settlement Leg" (KeeperHub contract call or recorded withheld receipt).
- Interaction: Clicking any node expands an explanation drawer with exact schema structures.

3.4 EVIDENCE FEED & LEDGER TABLE (components/dashboard/EvidenceTable.tsx)
- Controls:
  * Search Input: Filter by Endpoint Host, Receipt SHA-256, or KeeperHub Run ID.
  * Verdict Tabs:
    - ALL
    - DELIVERED_AS_ADVERTISED (Indigo/Cyan outline)
    - NOT_DELIVERED (Rose badge)
    - SHAPE_MISMATCH (Amber badge)
    - TIMEOUT_EXCEEDED (Amber badge)
- Table Layout (Glass Table):
  * Columns:
    1. Timestamp (Relative: "12s ago", Mono 12px)
    2. Verdict State (Badge with indicator dot)
    3. Target Endpoint (`api.daydreams.world/v1/agent`, bold hoverable host link)
    4. Amount (Mono: `0.0050 USDC`)
    5. Latency (`142ms` vs `SLA 500ms`)
    6. Proof Links:
       - KeeperHub Run ID (Chip linking to KeeperHub run log)
       - Chain TX (Icon link to BaseScan)
       - Action: "Inspect" button opening slide-over drawer.
  * Empty State: Never a blank screen or plain spinner; displays "No runs matching filter recorded in ledger."

3.5 RECEIPT INSPECTOR DRAWER / MODAL (components/receipt/ReceiptViewer.tsx)
- Triggered upon clicking any row or visiting `/receipt/:hash`.
- Split Layout:
  * Left Column: Structured Facts
    - Verdict: Large state badge + justification summary.
    - Advertised Requirements: Table showing expected schema, declared mimeType, max price, latency cap.
    - Observed Metrics: Actual status code, payload byte size, response SHA-256 hash.
  * Right Column: Verification & Proofs
    - Cryptographic Receipt Leaf (SHA-256 canonical hash with copy button).
    - Batch Anchor Status: "Included in Epoch #412 Anchor TX".
    - Copy-paste CLI Terminal Box:
      ```bash
      npx quittance-verify 0x8f2d7a9b...
      ```
    - Button: "Re-derive Client Side" (instantly routes to `/verify` with payload preloaded).

3.6 ENDPOINT DIRECTORY (`/endpoints` & `/endpoints/[host]`)
- Overview Card: Host domain, first seen date, total calls.
- Sample Size Rule: If calls < 20, render prominent badge: "INSUFFICIENT SAMPLE (<20 calls)"
  instead of deceptive percentages.
- Historical Reason Code Breakdown:
  Horizontal stacked bar chart showing proportions of `DELIVERED_AS_ADVERTISED`, `TIMEOUT_EXCEEDED`,
  `SHAPE_MISMATCH`, and `NOT_DELIVERED`.

3.7 ZERO-DEPENDENCY CLIENT VERIFIER (`/verify`)
- Interface:
  * Drag-and-drop zone or JSON textarea: "Paste Receipt JSON or Drop receipt.json file here".
  * Re-derive Button: Executes purely in the client browser using Web Crypto API.
  * Result Window:
    - Independent Verdict output banner.
    - Hash mismatch warning banner (loud neon amber/rose if mutated).
    - Verification proof table: Compares declared response hash with computed payload hash.

3.8 TELEMETRY FOOTER (components/layout/Footer.tsx)
- Border top `border-white/[0.08]`, background `#070709`, padding `py-12 px-6`.
- 4 Columns:
  1. Column 1 (Brand & Telemetry):
     - Quittance wordmark & thesis.
     - Live RPC ping: "Base Mainnet: Block #19829312 (12ms)".
     - KeeperHub Engine: "Executions Service: Healthy".
  2. Column 2 (Protocol & Contracts):
     - ReceiptAnchor.sol (BaseScan link)
     - x402 Specification (RFC link)
     - KeeperHub Turnkey Integration
  3. Column 3 (Developer & CLI):
     - `@quittance/sdk` (npm package)
     - `quittance verify` CLI docs
     - GitHub Repository & CI Gates
  4. Column 4 (Hackathon & Proofs):
     - DoraHacks Agent Economy Entry
     - Target Track: Best Integration into a Live Project
     - Live Counterparty: Daydreams / Lucid Router
- Bottom Bar:
  - Strict anti-marketing legal line: "Deterministic structural execution ledger. No financial guarantees or subjective quality assertions."
  - Copyright & Open Source MIT License.

--------------------------------------------------------------------------------
4. VERDICT BADGE DESIGN MATRIX
--------------------------------------------------------------------------------
Every verdict state must have a distinct, visually refined badge (No plain green):

- DELIVERED_AS_ADVERTISED:
  * Classes: `bg-indigo-500/10 text-indigo-300 border-indigo-500/30`
  * Indicator: Glowing Indigo dot
- NOT_DELIVERED:
  * Classes: `bg-rose-500/10 text-rose-300 border-rose-500/30`
  * Indicator: Solid Rose dot
- SHAPE_MISMATCH:
  * Classes: `bg-amber-500/10 text-amber-300 border-amber-500/30`
  * Indicator: Amber diamond icon
- TIMEOUT_EXCEEDED:
  * Classes: `bg-amber-500/10 text-amber-300 border-amber-500/30`
  * Indicator: Amber clock icon
- REQUIREMENTS_MISMATCH:
  * Classes: `bg-violet-500/10 text-violet-300 border-violet-500/30`
  * Indicator: Violet split icon
- GATE_ERROR / SETTLEMENT_FAILED:
  * Classes: `bg-red-500/15 text-red-400 border-red-500/40`
  * Indicator: Flashing alert circle

--------------------------------------------------------------------------------
5. SAMPLE TAILWIND CONFIGURATION SNIPPET (tailwind.config.ts)
--------------------------------------------------------------------------------
```typescript
import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        base: '#070709',
        surface: '#0d0e12',
        'surface-elev': '#14161d',
        accent: {
          primary: '#6366f1',
          secondary: '#06b6d4',
          amber: '#f59e0b',
          rose: '#f43f5e',
          violet: '#8b5cf6',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'Inter', 'sans-serif'],
        mono: ['var(--font-mono)', 'JetBrains Mono', 'monospace'],
      },
      backgroundImage: {
        'ambient-radial': 'radial-gradient(circle at 50% -20%, rgba(99, 102, 241, 0.15), transparent 70%)',
        'glow-card': 'linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.01) 100%)',
      },
      boxShadow: {
        'glow-sm': '0 0 15px rgba(99, 102, 241, 0.25)',
        'glow-lg': '0 0 35px rgba(99, 102, 241, 0.35)',
      },
    },
  },
  plugins: [],
};
export default config;