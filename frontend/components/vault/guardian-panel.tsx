"use client"

import { useState } from "react"
import { toast } from "sonner"
import {
  address,
  isAddress,
  isSome,
  type Address,
  type TransactionSendingSigner,
  type TransactionSigner,
} from "@solana/kit"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { useSendInstruction } from "@/hooks/use-send-instruction"
import {
  RecoveryState,
  getApproveRecoveryInstruction,
  getExecuteRotationInstruction,
  getInitiateRecoveryInstruction,
  type Vault,
} from "@/lib/generated"

function parseAddress(value: string): Address | null {
  const trimmed = value.trim()
  return isAddress(trimmed) ? address(trimmed) : null
}

export function GuardianPanel({
  vaultAddress,
  vault,
  signer,
  onSuccess,
}: {
  vaultAddress: Address
  vault: Vault
  signer: TransactionSendingSigner
  onSuccess: () => void | Promise<void>
}) {
  const guardian = signer as unknown as TransactionSigner
  const { send, isPending } = useSendInstruction(signer, onSuccess)
  const [proposedOwnerInput, setProposedOwnerInput] = useState("")
  const [useJitoBundle, setUseJitoBundle] = useState(false)

  const inRecovery = vault.recoveryState === RecoveryState.RecoveryPending
  const hasApproved = vault.approvals.includes(signer.address)
  const thresholdMet = vault.approvals.length >= vault.threshold
  const isFinalApproval = !hasApproved && vault.approvals.length + 1 >= vault.threshold

  return (
    <Card>
      <CardHeader>
        <CardTitle>Guardian controls</CardTitle>
        <CardDescription>
          You are a registered guardian for this vault.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {!inRecovery ? (
          <div className="grid gap-2">
            <Label htmlFor="proposed-owner">
              Initiate recovery — proposed new owner
            </Label>
            <div className="flex gap-2">
              <Input
                id="proposed-owner"
                placeholder="New owner wallet address"
                value={proposedOwnerInput}
                onChange={(e) => setProposedOwnerInput(e.target.value)}
              />
              <Button
                disabled={isPending}
                onClick={async () => {
                  const proposedOwner = parseAddress(proposedOwnerInput)
                  if (!proposedOwner) {
                    toast.error("Enter a valid wallet address")
                    return
                  }
                  await send([
                    getInitiateRecoveryInstruction({
                      vault: vaultAddress,
                      guardian,
                      proposedOwner,
                    }),
                  ])
                  setProposedOwnerInput("")
                }}
              >
                Initiate recovery
              </Button>
            </div>
            <p className="text-muted-foreground text-xs">
              Only possible once the owner has been inactive for the
              configured inactivity window.
            </p>
          </div>
        ) : (
          <div className="grid gap-3">
            {isSome(vault.proposedOwner) && (
              <p className="text-sm">
                Proposed owner:{" "}
                <span className="font-mono text-xs">
                  {vault.proposedOwner.value}
                </span>
              </p>
            )}

            <div className="flex items-center gap-2">
              <Switch
                id="use-jito-bundle"
                checked={useJitoBundle}
                onCheckedChange={setUseJitoBundle}
              />
              <Label htmlFor="use-jito-bundle" className="text-sm">
                Submit as atomic Jito bundle
              </Label>
            </div>
            <p className="text-muted-foreground text-xs">
              Bundles the approval and rotation into one transaction with a
              tip, closing the front-running window between threshold and
              execution. Jito bundles only land on mainnet — on devnet this
              falls back to a normal transaction.
            </p>

            <div className="flex flex-wrap items-center gap-2">
              {!hasApproved && (
                <Button
                  disabled={isPending}
                  onClick={() => {
                    if (isFinalApproval) {
                      return send(
                        [
                          getApproveRecoveryInstruction({
                            vault: vaultAddress,
                            guardian,
                          }),
                          getExecuteRotationInstruction({
                            vault: vaultAddress,
                            guardian,
                          }),
                        ],
                        { useJitoBundle }
                      )
                    }
                    return send([
                      getApproveRecoveryInstruction({
                        vault: vaultAddress,
                        guardian,
                      }),
                    ])
                  }}
                >
                  {isFinalApproval
                    ? "Approve & execute rotation"
                    : "Approve recovery"}
                </Button>
              )}
              {hasApproved && !thresholdMet && (
                <Button disabled>Approved</Button>
              )}
              {thresholdMet && (
                <Button
                  variant="outline"
                  disabled={isPending}
                  onClick={() =>
                    send(
                      [
                        getExecuteRotationInstruction({
                          vault: vaultAddress,
                          guardian,
                        }),
                      ],
                      { useJitoBundle }
                    )
                  }
                >
                  Execute rotation ({vault.approvals.length}/{vault.threshold})
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
