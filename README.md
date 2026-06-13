# Aegis

Monorepo containing the Aegis Anchor program (`programs/aegis_program`) and the Next.js frontend (`frontend`).

## Prerequisites

- [Node.js](https://nodejs.org/) 20+
- [pnpm](https://pnpm.io/) 9+ (`corepack enable` or `npm i -g pnpm`)
- [Yarn](https://yarnpkg.com/) (used by the Anchor program)
- [Rust](https://www.rust-lang.org/tools/install) (toolchain `1.89.0`, see `programs/aegis_program/rust-toolchain.toml`)
- [Solana CLI](https://docs.solana.com/cli/install-solana-cli-tools)
- [Anchor CLI](https://www.anchor-lang.com/docs/installation)

## Setup

Install frontend dependencies (run from the repo root, this is a pnpm workspace):

```bash
pnpm install
```

Install Anchor program dependencies:

```bash
cd programs/aegis_program
yarn install
```

## Running the frontend

From the repo root:

```bash
pnpm dev
```

Other useful scripts (run from the repo root):

```bash
pnpm build       # production build
pnpm lint        # lint
pnpm format      # format with prettier
pnpm typecheck   # type-check
```

## Working with the Anchor program

From the repo root:

```bash
pnpm anchor:build   # anchor build
pnpm anchor:test    # anchor build && cargo test (litesvm)
pnpm anchor:lint    # lint the program's TS files
```

Or run commands directly from `programs/aegis_program`:

```bash
cd programs/aegis_program
anchor build
yarn test
```

See [programs/aegis_program/README.md](programs/aegis_program/README.md) for details on the
program's instructions, accounts, and test suite.

## Project structure

```
.
├── frontend/                # Next.js + shadcn/ui app
└── programs/
    └── aegis_program/        # Anchor program (Rust) + tests
```
