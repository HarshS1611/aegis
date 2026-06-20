import type {
  Account,
  Address,
  Base58EncodedBytes,
  TransactionSendingSigner,
} from "@solana/kit"
import {
  appendTransactionMessageInstructions,
  createTransactionMessage,
  pipe,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  signAndSendTransactionMessageWithSigners,
  signature,
  getBase58Decoder,
  getBase64Encoder,
  type Instruction,
} from "@solana/kit"

import { rpc } from "@/lib/solana/config"
import {
  AEGIS_PROGRAM_PROGRAM_ADDRESS,
  findVaultPda,
  fetchMaybeVault,
  getVaultDecoder,
  VAULT_DISCRIMINATOR,
  type Vault,
} from "@/lib/generated"

export async function getVaultAddress(owner: Address): Promise<Address> {
  const [vault] = await findVaultPda({ owner })
  return vault
}

export async function fetchVaultAccount(owner: Address) {
  const vault = await getVaultAddress(owner)
  const account = await fetchMaybeVault(rpc, vault)
  return { vaultAddress: vault, account }
}

/** Finds vaults that list `guardian` as one of their guardians. */
export async function findVaultsByGuardian(
  guardian: Address
): Promise<Account<Vault>[]> {
  const accounts = await rpc
    .getProgramAccounts(AEGIS_PROGRAM_PROGRAM_ADDRESS, {
      encoding: "base64",
      filters: [
        {
          memcmp: {
            offset: BigInt(0),
            bytes: getBase58Decoder().decode(
              VAULT_DISCRIMINATOR
            ) as Base58EncodedBytes,
            encoding: "base58",
          },
        },
      ],
    })
    .send()

  const decoder = getVaultDecoder()
  const matches: Account<Vault>[] = []
  for (const { pubkey, account } of accounts) {
    const data = getBase64Encoder().encode(account.data[0])
    const vault = decoder.decode(data)
    if (vault.guardians.includes(guardian)) {
      matches.push({
        address: pubkey,
        data: vault,
        executable: account.executable,
        lamports: account.lamports,
        programAddress: AEGIS_PROGRAM_PROGRAM_ADDRESS,
        space: BigInt(data.length),
      })
    }
  }
  return matches
}

function isRateLimitError(error: unknown): boolean {
  return error instanceof Error && /429/.test(error.message)
}

async function withRetry<T>(fn: () => Promise<T>, maxAttempts = 5): Promise<T> {
  let lastError: unknown
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      if (!isRateLimitError(error) || attempt === maxAttempts - 1) throw error
      await new Promise((resolve) =>
        setTimeout(resolve, 500 * Math.pow(2, attempt))
      )
    }
  }
  throw lastError
}

export async function waitForConfirmation(txSignature: string): Promise<void> {
  for (let attempt = 0; attempt < 60; attempt++) {
    const { value } = await withRetry(() =>
      rpc
        .getSignatureStatuses([signature(txSignature)], {
          searchTransactionHistory: true,
        })
        .send()
    )
    const status = value[0]
    if (status?.err) {
      throw new Error(`Transaction failed: ${JSON.stringify(status.err)}`)
    }
    if (
      status?.confirmationStatus === "confirmed" ||
      status?.confirmationStatus === "finalized"
    ) {
      return
    }
    await new Promise((resolve) => setTimeout(resolve, 500))
  }
  throw new Error("Timed out waiting for transaction confirmation")
}

export async function sendInstructions(
  signer: TransactionSendingSigner,
  instructions: Instruction[]
): Promise<string> {
  const { value: latestBlockhash } = await withRetry(() =>
    rpc.getLatestBlockhash().send()
  )

  const message = pipe(
    createTransactionMessage({ version: 0 }),
    (m) => setTransactionMessageFeePayerSigner(signer, m),
    (m) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, m),
    (m) => appendTransactionMessageInstructions(instructions, m)
  )

  const signatureBytes = await signAndSendTransactionMessageWithSigners(message)
  const signature = getBase58Decoder().decode(signatureBytes) as string
  await waitForConfirmation(signature)
  return signature
}
