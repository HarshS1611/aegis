"use client"

import { useState } from "react"
import { toast } from "sonner"
import type { Instruction, TransactionSendingSigner } from "@solana/kit"

import { sendInstructions } from "@/lib/solana/vault"
import { sendInstructionsAsJitoBundle } from "@/lib/solana/jito"
import { addTransactionLogEntry } from "@/lib/transaction-log"

export function useSendInstruction(
  signer: TransactionSendingSigner | null,
  onSuccess?: () => void | Promise<void>
) {
  const [isPending, setIsPending] = useState(false)

  const send = async (
    instructions: Instruction[],
    options?: { useJitoBundle?: boolean }
  ) => {
    if (!signer) {
      toast.error("Connect a wallet first")
      return
    }
    setIsPending(true)
    try {
      if (options?.useJitoBundle) {
        try {
          const { bundleId, signature } = await sendInstructionsAsJitoBundle(
            signer,
            instructions
          )
          toast.success("Jito bundle submitted")
          addTransactionLogEntry({
            label: "Jito bundle",
            status: "success",
            signature,
            bundleId,
          })
          await onSuccess?.()
          return
        } catch (error) {
          console.error("Jito bundle submission failed", error)
          toast.warning("Jito bundle unavailable, sending normally")
        }
      }

      const signature = await sendInstructions(signer, instructions)
      toast.success("Transaction sent")
      addTransactionLogEntry({
        label: "Transaction",
        status: "success",
        signature,
      })
      await onSuccess?.()
    } catch (error) {
      console.error(error)
      const message = error instanceof Error ? error.message : String(error)
      toast.error("Transaction failed")
      addTransactionLogEntry({
        label: "Transaction",
        status: "error",
        message,
      })
    } finally {
      setIsPending(false)
    }
  }

  return { send, isPending }
}
