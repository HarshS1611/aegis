import {
  address,
  appendTransactionMessageInstructions,
  createTransactionMessage,
  getBase64EncodedWireTransaction,
  getSignatureFromTransaction,
  pipe,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  signTransactionMessageWithSigners,
  type Address,
  type Instruction,
  type TransactionSigner,
} from "@solana/kit"
import { getTransferSolInstruction } from "@solana-program/system"

import { rpc } from "./config"

/**
 * Jito Block Engine only accepts bundles on mainnet-beta (and some
 * testnet validators). It is not available on devnet, so bundle
 * submission against the default devnet RPC is expected to fail —
 * the on-chain instructions are independent of Jito and work without it.
 */
export const JITO_BLOCK_ENGINE_URL =
  process.env.NEXT_PUBLIC_JITO_BLOCK_ENGINE_URL ??
  "https://mainnet.block-engine.jito.wtf/api/v1/bundles"

/** Well-known Jito tip accounts (mainnet). Any one of these is valid. */
export const JITO_TIP_ACCOUNTS: Address[] = [
  address("96gYZGLnJYVFmbjzopPSU6QiEV5fGqZNyN9nmNhvrZU5"),
  address("HFqU5x63VTqvQss8hp11i4wVV8bD44PvwucfZ2bU7gRe"),
  address("Cw8CFyM9FkoMi7K7Crf6HNQqf4uEMzpKw6QNghXLvLkY"),
  address("ADaUMid9yfUytqMBgopwjb2DTLSokTSzL1zt6iGPaS49"),
  address("DfXygSm4jCyNCybVYYK6DwvWqjKee8pbDmJGcLWNDXjh"),
  address("ADuUkR4vqLUMWXxWPHnGtaC25E2vBYxJ9D3K8oWLF6jJ"),
  address("DttWaMuVvTiduZRnguLF7jNxTgiMBZ1hyAumKUiL2KRL"),
  address("3AVi9Tg9Uo68tJfuvoKvqKNWKkC5wPdSSdeBnizKZ6jT"),
]

export const DEFAULT_JITO_TIP_LAMPORTS = BigInt(10_000)

export function getRandomJitoTipAccount(): Address {
  return JITO_TIP_ACCOUNTS[Math.floor(Math.random() * JITO_TIP_ACCOUNTS.length)]
}

/** Tip instruction (instruction 3 of the bundle per the Aegis architecture doc). */
export function getJitoTipInstruction(
  payer: TransactionSigner,
  lamports: bigint = DEFAULT_JITO_TIP_LAMPORTS
): Instruction {
  return getTransferSolInstruction({
    source: payer,
    destination: getRandomJitoTipAccount(),
    amount: lamports,
  })
}

/**
 * Builds, signs and submits `instructions` plus a Jito tip instruction as a
 * single-transaction bundle to the Jito Block Engine. Atomic by construction
 * (one transaction), with the tip giving it priority bundle inclusion.
 *
 * Throws if the Block Engine rejects or is unreachable (e.g. on devnet) —
 * callers should fall back to a normal `sendInstructions` call.
 */
export async function sendInstructionsAsJitoBundle(
  signer: TransactionSigner,
  instructions: Instruction[],
  tipLamports: bigint = DEFAULT_JITO_TIP_LAMPORTS
): Promise<{ bundleId: string; signature: string }> {
  const { value: latestBlockhash } = await rpc.getLatestBlockhash().send()

  const message = pipe(
    createTransactionMessage({ version: 0 }),
    (m) => setTransactionMessageFeePayerSigner(signer, m),
    (m) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, m),
    (m) =>
      appendTransactionMessageInstructions(
        [...instructions, getJitoTipInstruction(signer, tipLamports)],
        m
      )
  )

  const transaction = await signTransactionMessageWithSigners(message)
  const wireTransaction = getBase64EncodedWireTransaction(transaction)

  const response = await fetch(JITO_BLOCK_ENGINE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "sendBundle",
      params: [[wireTransaction], { encoding: "base64" }],
    }),
  })

  const body = await response.json()
  if (!response.ok || body.error) {
    throw new Error(
      body.error?.message ?? `Jito bundle submission failed (${response.status})`
    )
  }

  return {
    bundleId: body.result as string,
    signature: getSignatureFromTransaction(transaction),
  }
}
