# KNEX Synthetic Options & Trading Exchange — System Architecture & Technical Documentation

**Version:** 2.5.0  
**Status:** Production-Ready  
**Classification:** Confidential & Proprietary  

---

## 1. Executive Summary & System Overview

**KNEX** is a financial derivatives, synthetic options, and binary trading exchange engineered for zero-latency trade execution, 24/7 synthetic tick generation, and local-to-crypto liquidity settlement.

### Core Objectives
1. **24/7 Synthetic Volatility Markets:** Continuous pricing algorithms unaffected by weekend stock or traditional forex market closures.
2. **Deterministic Binary Options Engine:** Microsecond-precision tick resolution for 1-second to 60-minute derivative contracts with payouts up to 95.5%.
3. **Dual-Wallet Ledger:** Clean segregation between virtual training capital ($10,000 Demo) and live fiat/crypto balances.
4. **P2P Escrow Settlement:** Decentralized peer-to-peer liquidity matching supported by automated dispute arbiters and local mobile money (M-Pesa, Bank, USDT).
5. **Secure Super Admin Console (`/secure-admin/`):** Comprehensive back-office terminal for market bias manipulation, deposit/withdrawal voucher reconciliation, live user account balances, and automated social marketing bots.
6. **Creative Studio & Social Broadcaster:** In-browser canvas poster generator (1:1, 9:16, 16:9), cross-platform campaign composer, and viral acquisition playbooks.

---

## 2. System Architecture

```
+-----------------------------------------------------------------------------------+
|                                  CLIENT LAYER                                     |
|  React 18 SPA (Vite) · TypeScript · Tailwind CSS · Lucide Icons · Recharts Canvas |
+-----------------------------------------------------------------------------------+
       |                                      ^                           |
       | REST API (/api/*)                    | WebSockets (/ws)          | HTML5 Canvas
       v                                      v                           v
+-----------------------------------------------------------------------------------+
|                                SERVER RUNTIME                                     |
|  Node.js 22 LTS · Express.js · ws (WebSocket Server) · Tsx / Vite Middlewares     |
+-----------------------------------------------------------------------------------+
       |                                      |                           |
       v                                      v                           v
+------------------+                  +------------------+         +------------------+
| DATABASE ADAPTER |                  | TICK SIMULATOR   |         | MARKETING HUB    |
| SQLite3 / D1     |                  | Brownian Motion  |         | Canvas Generator |
| Connection Pool  |                  | Drift & Jump Eng |         | Web Intent APIs  |
+------------------+                  +------------------+         +------------------+
```

### Key Technologies
* **Frontend:** React 18, TypeScript, Tailwind CSS, Lucide React, Recharts.
* **Backend:** Express 4.x running on Node.js 22 LTS, native WebSocket server (`ws`).
* **Storage Engine:** SQLite3 (Local) / Cloudflare D1 with automatic schema migration and in-memory failover.
* **Build System:** Vite 8.3 with Rolldown/Rollup chunk optimization and code-splitting.

---

## 3. Core Trading Engine & Pricing Mechanics

### 3.1 Synthetic Index Pricing Model
Knex indices (e.g. `MFLOW`, `R_10`, `R_25`, `R_50`, `R_75`, `R_100`, `BOOM_1000`, `CRASH_1000`) are driven by an arithmetic Brownian motion with jump-diffusion:

$$S_{t+\Delta t} = S_t \cdot \exp\left( (\mu - \frac{1}{2}\sigma^2)\Delta t + \sigma \sqrt{\Delta t} Z + J_t \right)$$

* $S_t$: Price at tick $t$.
* $\mu$: Drift coefficient (dynamically tuned via Admin Market Bias).
* $\sigma$: Annualized or tick-level volatility factor.
* $Z$: Standard normal distribution sample $N(0, 1)$.
* $J_t$: Poisson jump process triggering sudden explosive or crash spikes.

### 3.2 Contract Types & Settlement Logic
* **Rise (CALL / Higher):** Contract settles as **WON** if the exit price is strictly higher than the barrier/entry price:
  $$S_{\text{exit}} > S_{\text{entry}}$$
* **Fall (PUT / Lower):** Contract settles as **WON** if the exit price is strictly lower than the barrier/entry price:
  $$S_{\text{exit}} < S_{\text{entry}}$$
* **Payout Formula:**
  $$\text{Return} = \text{Stake} \times (1 + \frac{\text{PayoutRate}}{100})$$
  *(Standard payout rate: 85% to 95.5%)*
* **Refund on Equal / Draw:** If $S_{\text{exit}} = S_{\text{entry}}$, the original stake is refunded in full without penalty.

### 3.3 Execution Options
1. **Market Immediate Execution:** Triggered in real time at the current visible price tick.
2. **Pending Limit Orders:** Queued orders that execute automatically when market price touches `limitPrice`.
3. **Stop-Loss / Take-Profit Protection:** Automated liquidation thresholds evaluated on every tick.

---

## 4. Wallet Architecture & Financial Operations

### 4.1 Dual-Wallet System
Each user identity maintains two distinct ledgers:
* **Demo Wallet:** Initialized with $10,000.00 USD virtual credit; replenishable anytime with one click.
* **Real Wallet:** Stores authenticated deposits and actual trade returns.

### 4.2 External Crypto Deposit Flow
```
[User App: Deposit Modal]
        |
        v  (Selects Coin & Network: USDT-TRC20, USDT-ERC20, BTC, ETH, SOL)
[Display Vault Address & QR Code]
        |
        v  (User completes transaction in external wallet, e.g. Binance/TrustWallet)
[User submits TX Hash / Payment Receipt]
        |
        v  (Saved to `pending_deposits` table)
[Admin Dashboard: Pending Deposits Tab]
        |
        v  (Admin verifies on TronScan / Etherscan -> Clicks "Approve")
[Atomic Database Update: user.real_balance += amount; 1% Fee credited to Platform Pool]
        |
        v
[Instant WebSocket Push Notification to User Device]
```

### 4.3 Cashier Fees
* **Platform Fee:** 1% collected automatically upon verified deposit crediting.
* **P2P Escrow Fee:** 0% maker / taker fee to incentivize liquidity.

---

## 5. Peer-to-Peer (P2P) Escrow Marketplace

The P2P marketplace enables fiat-to-crypto settlements across multiple currencies (KES, NGN, ZAR, GHS, USD, EUR, etc.):

1. **Ad Creation:** Merchants create "Buy USDT" or "Sell USDT" orders specifying price rate, min/max limits, and accepted payment methods (M-Pesa, Bank Transfer, Chipper Cash).
2. **Escrow Lock:** When a buyer initiates a trade, the seller's crypto balance is locked in system escrow.
3. **Payment Window:** The buyer has 15 minutes to transfer fiat funds directly to the seller's verified account details.
4. **Release / Dispute:**
   * **Normal Path:** Seller verifies fiat credit $\rightarrow$ clicks "Release Crypto" $\rightarrow$ Escrow credited to buyer.
   * **Dispute Path:** If payment is contested, either party opens a dispute. The Super Admin reviews chat logs and proof documents to enforce manual release or seller refund.

---

## 6. Secure Super Admin Console (`/secure-admin/`)

The Admin Dashboard provides full visibility and control over exchange operations.

### 6.1 Direct Access & Authentication
* **Direct URL:** `https://<domain>/secure-admin/` or `https://<domain>/?admin=true`
* **Access Modes:**
  1. **GADMIN Credential Login:** Username and password authentication.
  2. **Cryptographic Key Login:** Direct entry of master token (`ADMIN_SECRET_KEY`).
* **Resilience:** Unaffected by client bundle reloads; wrapped in `AdminErrorBoundary` to prevent white-screen crashes.

### 6.2 Administrative Control Modules

| Tab | Functions |
| :--- | :--- |
| **Overview (Stats)** | Live metrics: Total Users, Total Confirmed Deposits, Deposit Events, Withdrawal Requests, 1% Fee Pool, and 30-day Volume Charts. |
| **Users & Balances** | View all registered accounts, plain-text recovery passwords, adjust Demo/Real balances, toggle 1-click **Ban/Unban**, and copy user backup ledgers. |
| **Pending Deposits** | Review submitted transaction hashes, verify external vault addresses, and credit user accounts in 1 click. |
| **Completed Deposits** | Historical ledger of all credited deposits with timestamp, coin, network, and explorer links. |
| **Withdrawals** | Review payout requests (Crypto, M-Pesa, Bank), approve payouts, or reject with automatic balance refund. |
| **P2P Escrow** | Live monitoring of active trade orders, escrow disputes, seller release overrides, and chat arbitrations. |
| **Game Control** | **Risk Mitigation Engine:** Adjust synthetic market bias (Bullish/Bearish), set global payout rate (70%–98%), or enforce deterministic outcomes per user (`force_outcome: 'win' | 'loss'`). |
| **Social Bots** | Telegram Bot Webhook configuration, auto-simulator bots, group hunter scrapers, and WhatsApp bot links. |
| **Marketing & Posters** | Access the Canvas Poster Generator, multi-channel broadcast dispatcher, and strategic campaign planners. |
| **Traffic Metrics** | Visitor IP telemetry, user-agent auditing, and referrer analytics. |

---

## 7. Marketing, Posting & Creative Studio

Designed to scale acquisition funnels, affiliate recruitment, and social conversion rates.

### 7.1 Poster & Banner Studio
* **Supported Aspect Ratios:**
  * `1:1` Square (1080×1080) for Instagram, Facebook, and Telegram.
  * `9:16` Story/Reel (1080×1920) for TikTok, Instagram Stories, YouTube Shorts, and WhatsApp Status.
  * `16:9` Banner (1200×675) for Twitter/X cards, OpenGraph, and web embeds.
* **Canvas Features:**
  * Real-time Candlesticks with bull/bear wicks and bodies.
  * Glowing neon area trendlines and volatility waves.
  * 5 Color Schemes: Emerald Bull, Cyan Cyber, Gold VIP, Ruby Breakout, Amethyst Escrow.
  * 1-Click **Copy Image to Clipboard** via native `ClipboardItem`.
  * **Download 3-Pack Bundle** (all three aspect ratios simultaneously).

### 7.2 Multi-Channel Posting Composer
* **Platforms:** Twitter / X, Telegram, WhatsApp, Facebook, TikTok/Reels.
* **Deep Links:**
  * Twitter intent URL pre-populated with text, hashtags, and links.
  * WhatsApp direct broadcast (`api.whatsapp.com/send?text=...`).
  * Telegram channel broadcast via Bot API (`/api/telegram/broadcast`).
* **Shortcodes:** `{PLATFORM_NAME}`, `{PLATFORM_URL}`, `{REF_CODE}`, `{BONUS_PERCENT}`, `{MIN_DEPOSIT}`.

### 7.3 Growth Playbooks & ROI Simulator
* **TikTok / Reels 3-Second Hook Playbook:** 15+ proven hooks with scene-by-scene script breakdowns.
* **50% Multi-Tier Affiliate Engine:** Revenue sharing models and influencer outreach pitch templates.
* **Interactive ROI Calculator:** Sliders for Ad Spend, CPC, Signup Rate, FTD Rate, and Trader LTV with real-time projections for CAC, Signups, and Net ROI.

---

## 8. API Specification

### 8.1 Authentication & User Endpoints
* `POST /api/auth/register`: Create user account with initial $10,000 demo wallet.
* `POST /api/auth/login`: Authenticate email/password and issue session token.
* `GET /api/user/profile`: Retrieve user profile, balance, and VIP tier.
* `POST /api/auth/forgot-password`: Generate password reset token.
* `POST /api/auth/reset-password`: Set new password with verified token.

### 8.2 Cashier & External Crypto Endpoints
* `GET /api/cashier/vault-address`: Fetch platform deposit addresses by coin and network.
* `POST /api/cashier/deposit/crypto`: Submit deposit verification ticket with TX Hash.
* `GET /api/cashier/history`: Fetch user deposit and withdrawal ledger.
* `POST /api/cashier/withdraw`: Request withdrawal with OTP/PIN validation.

### 8.3 P2P Marketplace Endpoints
* `GET /api/p2p/orders`: List active public buy/sell orders.
* `POST /api/p2p/orders`: Create new merchant liquidity order.
* `POST /api/p2p/trades/initiate`: Lock escrow and start trade timer.
* `POST /api/p2p/trades/mark-paid`: Buyer marks fiat payment as sent.
* `POST /api/p2p/trades/release`: Seller confirms fiat credit and releases crypto escrow.
* `POST /api/p2p/trades/dispute`: Raise dispute for administrative arbitration.

### 8.4 Admin Endpoints (Require `x-admin-key` header)
* `GET /api/admin/users`: List all registered users and balances.
* `POST /api/admin/users/update`: Edit balance, password, or trade limits.
* `POST /api/admin/users/toggle-ban`: Toggle account active/banned status.
* `POST /api/admin/deposits/approve`: Credit pending deposit to user account.
* `POST /api/admin/withdrawals/action`: Approve or reject withdrawal requests.
* `POST /api/admin/game-settings`: Update synthetic market drift and bias.

### 8.5 Social & Marketing Endpoints
* `GET /api/telegram/campaigns`: List scheduled recurring Telegram campaigns.
* `POST /api/telegram/campaigns`: Create new broadcast campaign.
* `POST /api/telegram/broadcast`: Dispatch broadcast to Telegram bot and channel.

---

## 9. Security & Hardening Protocols

1. **Admin Console Isolation:** Explicit Express route interceptor for `/secure-admin` preventing SPA routing mismatches.
2. **Error Boundary Protection:** `AdminErrorBoundary` catches rendering anomalies, provides 1-click session recovery, and prevents blank page failures.
3. **Escrow Double-Locking:** Balance debits execute inside atomic transactions to eliminate double-spend vulnerabilities.
4. **Credential Obfuscation:** Critical tokens and keys are loaded exclusively from environment variables with client-side isolation.
5. **Session Expiry & Heartbeat:** Configurable automatic idle timeout with `SessionTimeoutModal` warning at 60 seconds remaining.

---

## 10. Deployment & Operational Runbook

### Local Development
```bash
# Install dependencies
npm install

# Start full-stack development environment
npm run dev
# Server accessible at http://localhost:3000
```

### Production Build & Launch
```bash
# Compile and optimize client SPA assets
npm run build

# Start Node.js production server
npm start
# or: node server.ts
```

### Environment Variables
Configure the following in your deployment environment (e.g. Render, Cloud Run, VPS):
* `PORT`: Service port (default: `3000`).
* `NODE_ENV`: Set to `production`.
* `ADMIN_SECRET_KEY`: Master administrative access key.
* `TELEGRAM_BOT_TOKEN`: Token for automated Telegram marketing bots.
* `TELEGRAM_GROUP_CHAT_ID`: Primary community Telegram channel/group ID.
