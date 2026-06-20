import { createSolanaRpc, createSolanaRpcSubscriptions } from "@solana/kit"

export const SOLANA_CLUSTER = "devnet" as const
export const SOLANA_CHAIN = "solana:devnet" as const

export const RPC_HTTP_URL =
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL ??
  "https://api.devnet.solana.com"

export const RPC_WS_URL =
  process.env.NEXT_PUBLIC_SOLANA_RPC_WS_URL ??
  RPC_HTTP_URL.replace("https://", "wss://").replace("http://", "ws://")

export const rpc = createSolanaRpc(RPC_HTTP_URL)

export const rpcSubscriptions = createSolanaRpcSubscriptions(RPC_WS_URL)

export const explorerTxUrl = (signature: string) =>
  `https://explorer.solana.com/tx/${signature}?cluster=${SOLANA_CLUSTER}`

export const explorerAddressUrl = (address: string) =>
  `https://explorer.solana.com/address/${address}?cluster=${SOLANA_CLUSTER}`
