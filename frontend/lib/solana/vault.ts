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

export async function sendInstructions(
  signer: TransactionSendingSigner,
  instructions: Instruction[]
): Promise<string> {
  const { value: latestBlockhash } = await rpc.getLatestBlockhash().send()

  const message = pipe(
    createTransactionMessage({ version: 0 }),
    (m) => setTransactionMessageFeePayerSigner(signer, m),
    (m) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, m),
    (m) => appendTransactionMessageInstructions(instructions, m)
  )

  const signatureBytes = await signAndSendTransactionMessageWithSigners(message)
  return getBase58Decoder().decode(signatureBytes) as string
}
