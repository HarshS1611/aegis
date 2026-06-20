"use client"

import type { TransactionSendingSigner, TransactionSigner } from "@solana/kit"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useSendInstruction } from "@/hooks/use-send-instruction"
import { getInitializeVaultInstructionAsync } from "@/lib/generated"

export function InitializeVaultCard({
  signer,
  onSuccess,
}: {
  signer: TransactionSendingSigner
  onSuccess: () => void | Promise<void>
}) {
  const { send, isPending } = useSendInstruction(signer, onSuccess)

  return (
    <Card>
      <CardHeader>
        <CardTitle>No vault found</CardTitle>
        <CardDescription>
          Create an Aegis vault owned by your connected wallet. You can add
          guardians and configure recovery settings afterwards.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          disabled={isPending}
          onClick={async () => {
            const instruction = await getInitializeVaultInstructionAsync({
              owner: signer as unknown as TransactionSigner,
            })
            await send([instruction])
          }}
        >
          {isPending ? "Initializing..." : "Initialize Vault"}
        </Button>
      </CardContent>
    </Card>
  )
}
