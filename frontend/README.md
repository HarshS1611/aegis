# Aegis Frontend

> Source: [github.com/HarshS1611/aegis](https://github.com/HarshS1611/aegis)

Next.js + shadcn/ui frontend for **Aegis**, a social-recovery vault program on Solana (devnet).
The vault owner can register guardians, set an approval threshold and an
inactivity window. If the owner goes inactive, guardians can collectively
approve a recovery and rotate ownership to a new key. The vault PDA also
holds SOL in custody — the owner can deposit and withdraw at any time, and
whoever the rotation makes the new owner can withdraw the same funds, so
recovery actually restores access to something.

## Stack

- [Next.js 16](https://nextjs.org/) (App Router, Turbopack) + React 19
- [shadcn/ui](https://ui.shadcn.com/) + Tailwind v4
- [`@solana/kit`](https://github.com/anza-xyz/kit) — RPC clients, transaction pipeline, signers (no `@coral-xyz/anchor` / `@solana/web3.js` v1)
- [Codama](https://github.com/codama-idl/codama) — generates the typed program client (`lib/generated`) from the Anchor IDL
- [Wallet Standard](https://github.com/wallet-standard/wallet-standard) (`@wallet-standard/react`, `@solana/react`) — wallet connection, no `@solana/wallet-adapter-react`
- [Sonner](https://sonner.emilkowal.ski/) for toast notifications

## Prerequisites

- Node.js 20+
- [pnpm](https://pnpm.io/) (this repo is a pnpm workspace)
- A Wallet Standard-compatible browser extension (e.g. Phantom, Solflare, Backpack) set to **Devnet**

## Setup

```bash
# from the repo root or frontend/
pnpm install
```

### Environment variables (optional)

By default the app talks to the public devnet RPC. To use a custom RPC
(e.g. Helius), create `frontend/.env.local`:

```bash
NEXT_PUBLIC_SOLANA_RPC_URL=https://your-rpc-endpoint.example.com
NEXT_PUBLIC_SOLANA_RPC_WS_URL=wss://your-rpc-endpoint.example.com
```

See [`lib/solana/config.ts`](lib/solana/config.ts) for defaults and the
explorer link helpers.

## Development

```bash
pnpm dev       # start the dev server at http://localhost:3000
pnpm typecheck # tsc --noEmit
pnpm lint      # eslint
pnpm format    # prettier --write
pnpm build     # production build
pnpm start     # run the production build
```

## Regenerating the program client

The typed client in [`lib/generated`](lib/generated) is generated from the
Anchor IDL via Codama. If the on-chain program's IDL changes:

1. Copy the updated IDL into `frontend/idl/aegis_program.json`
   (source: `programs/aegis_program/target/idl/aegis_program.json`).
2. Regenerate the client:

   ```bash
   pnpm codegen
   ```

This runs [`codama.mjs`](codama.mjs) and overwrites everything under
`lib/generated`. The generated code is excluded from linting
(see `eslint.config.mjs`) — do not hand-edit it.

## Project structure

```
app/
  page.tsx                   # landing page (/)
  app/page.tsx               # vault dashboard (/app)
components/
  ui/                       # shadcn primitives (button, card, dialog, ...)
  providers/                # WalletProvider (Wallet Standard context)
  vault/                     # vault dashboard, owner & guardian panels
  site-header.tsx            # shared header (logo, launch app, GitHub link, wallet button)
  wallet-connect-button.tsx  # connect/disconnect UI
hooks/
  use-vault.ts               # fetches/refetches the vault PDA account
  use-send-instruction.ts     # builds, signs and sends a transaction
lib/
  constants.ts                # shared constants (e.g. GitHub repo URL)
  generated/                 # Codama-generated typed client (do not edit)
  solana/
    config.ts                # RPC clients, cluster, explorer URLs
    vault.ts                 # vault PDA + account fetch/send helpers
    jito.ts                  # Jito tip instruction + bundle submission
idl/aegis_program.json       # Anchor IDL used as codegen input
codama.mjs                   # codegen entrypoint (`pnpm codegen`)
```

## How it works

- **Wallet connection**: `WalletProvider` wraps the app in a
  `SelectedWalletAccountContextProvider`, filtering for wallets that support
  `solana:devnet`/`solana:mainnet`, `standard:connect`, `standard:disconnect`
  and `solana:signAndSendTransaction`. The selected account is persisted to
  `localStorage`.
- **Vault PDA**: derived from the program ID + the connected wallet's address
  using the seeds `["vault", owner]` (see `lib/generated/pdas/vault.ts` and
  `lib/solana/vault.ts`).
- **Reading state**: `useVault(owner)` fetches the `Vault` account for the
  connected wallet and exposes `{ vaultAddress, account, isLoading, error, refetch }`.
- **Sending transactions**: `useSendInstruction` builds a transaction message
  from one or more instructions, signs it with the connected
  `TransactionSendingSigner`, sends it, and shows a toast with a link to the
  Solana Explorer (devnet).
- **UI**:
  - `InitializeVaultCard` — shown if the connected wallet has no vault yet.
  - `VaultOverview` — owner, vault SOL balance, threshold, guardians,
    inactivity window, last activity, and recovery status.
  - `OwnerPanel` — ping (reset inactivity), cancel recovery, deposit/withdraw
    SOL, add/remove guardian, set threshold, set inactivity window.
  - `GuardianPanel` — initiate recovery, approve recovery, execute rotation,
    optionally as an atomic Jito bundle.
- **SOL custody**: the vault PDA is also a System-owned-lamports holder.
  `deposit_sol` accepts a transfer from anyone into the vault (plain System
  Program CPI). `withdraw_sol` is owner-gated and moves lamports out via
  direct lamport manipulation (a PDA can't be debited through a System
  Program `transfer` CPI since it isn't System-owned — only the owning
  program can move its lamports directly), capped so the vault never drops
  below rent-exemption. After a rotation, the new `owner` can withdraw the
  same balance — see `withdraw_sol_succeeds_for_new_owner_after_rotation` in
  the program's test suite.
- **Jito bundles (optional)**: when a guardian's approval reaches the
  threshold (or once threshold is met), `GuardianPanel` offers a
  "Submit as atomic Jito bundle" toggle. When enabled,
  `sendInstructionsAsJitoBundle` (`lib/solana/jito.ts`) packages
  `approve_recovery` + `execute_rotation` + a tip transfer into a single
  signed transaction and submits it to the Jito Block Engine. The Block
  Engine only accepts bundles on mainnet — on devnet this fails and the
  app falls back to a normal `sendTransaction` call. The on-chain
  `execute_rotation` instruction is fully independent of Jito either way.

## Pages

- `/` — landing page explaining the protocol, roles, recovery lifecycle,
  and Jito bundle composition, with a "Launch app" CTA and a footer
  linking to the GitHub repo.
- `/app` — the vault dashboard (connect wallet, initialize/manage vault,
  owner & guardian actions).

Both pages share `SiteHeader`, which includes a GitHub link (top-right,
next to the wallet button) pointing at the repo configured in
`lib/constants.ts` (`GITHUB_URL`).

## Testing the MVP

With a Devnet wallet extension installed and funded:

1. `pnpm dev` and open `http://localhost:3000` (landing page), then click
   **Launch app** to go to `/app`.
2. Click **Connect Wallet** and approve the connection (set the wallet to Devnet).
3. If no vault exists yet for your wallet, click **Initialize Vault**.
4. As the owner, add guardian addresses, set a threshold and inactivity window.
5. Deposit some devnet SOL into the vault from the **Deposit SOL** field in
   `OwnerPanel`, and confirm the balance updates in `VaultOverview`.
6. From a guardian's wallet, initiate/approve recovery and execute rotation
   once the threshold is met. Toggle "Submit as atomic Jito bundle" to try
   the bundled approve + execute + tip path (expect a fallback toast on devnet).
7. Reconnect as the new owner (the guardian who was rotated in) and withdraw
   the deposited SOL from the **Withdraw SOL** field — confirming that
   recovery actually restores control of the vault's funds.

> Note: the on-chain account layout changed when SOL custody was added
> (a new `creator` field). Any vault initialized before that upgrade is no
> longer readable by the current program — call **Initialize Vault** again
> to create a fresh one.
