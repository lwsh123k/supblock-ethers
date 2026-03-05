# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SupBlock-Ethers is a full-stack Web3 application for fair random number generation and verification using ECC blind signatures. It consists of three components: Solidity smart contracts, an Express/Socket.IO backend, and a Webpack frontend.

## Common Commands

### Root (Smart Contracts)

```bash
# Install dependencies (uses pnpm 8.x, Node >= 18)
pnpm install

# Compile Solidity contracts
npx hardhat compile

# Run all tests
npx hardhat test

# Run a single test file
npx hardhat test test/Lock.ts

# Run tests with gas reporting
REPORT_GAS=true npx hardhat test

# Start local Anvil chain (Foundry)
npm run anvil

# Start Anvil + deploy all contracts
npm run hardhat

# Deploy contracts to Anvil
npm run hardhatDeploy

# Start full stack (Anvil + backend + frontend)
npm run start
```

### Backend (`backend/`)

```bash
cd backend && pnpm install
npm run dev          # Run with ts-node directly
npm run serve        # Run with tsc watch + nodemon
npm run generate-types   # Generate TypeChain types from ABIs
npm run prisma:generate  # Generate Prisma client
```

### Frontend (`app/`)

```bash
cd app && pnpm install
npx webpack server   # Dev server on localhost:8001
```

## Architecture

### Smart Contracts (`contracts/`)
- **Solidity 0.8.18** with OpenZeppelin v4.8.3
- Key contracts: `FairInteger.sol` (fair RNG, multiple versions), `StoreData.sol`, `VerifySig.sol`/`SigInfo.sol` (signature verification), `EllipticCurve.sol`/`FastEcMul.sol` (ECC math)
- TypeChain generates ethers-v5 typed bindings to `./typechain`

### Deployment (`scripts/`)
- `deployAll.ts` is the main deploy orchestrator — sequentially deploys FairInteger, StoreData, then activates accounts
- `writeContractAddress.ts` / `writeContractAbi.ts` persist deploy artifacts for backend/frontend consumption
- Deploys target the `anvil` network (Foundry local chain at `127.0.0.1:8545`)

### Backend (`backend/src/`)
- Express + Socket.IO for real-time validator/plugin communication
- Prisma ORM with SQLite database
- `socket/` — WebSocket handlers including blind signature logic (`eccBlind.ts`)
- `contract/` — On-chain interaction utilities and event listeners (`recordEvent.ts`)
- `routes/` — REST API endpoints

### Frontend (`app/src/`)
- Webpack multi-entry: myToken, sig, fairIntegerSep, fairIntegerAuto, main
- Uses both ethers.js v5 and web3.js for chain interaction
- `contract-interaction/` — Contract call wrappers with addresses in `contract-address.json`

## Key Configuration

- **Hardhat network**: Uses Anvil (Foundry) as local chain with mnemonic `test test test ... junk`, 301 accounts, 1s block time
- **Ethers version**: v5 (not v6) — affects all contract interaction code
- **Prettier**: tabWidth=4, singleQuote=true; Solidity uses tabs with `explicitTypes=always`
- **Package manager**: pnpm ^8 (engine-strict enforced via `.npmrc`)
