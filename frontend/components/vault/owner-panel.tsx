"use client"

import { useState } from "react"
import { toast } from "sonner"
import {
  address,
  isAddress,
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
import { Separator } from "@/components/ui/separator"
import { useSendInstruction } from "@/hooks/use-send-instruction"
import {
  RecoveryState,
  getAddGuardianInstruction,
  getCancelRecoveryInstruction,
  getPingInstruction,
  getRemoveGuardianInstruction,
  getSetInactivityWindowInstruction,
  getSetThresholdInstruction,
  type Vault,
} from "@/lib/generated"

function parseAddress(value: string): Address | null {
  const trimmed = value.trim()
  return isAddress(trimmed) ? address(trimmed) : null
}

export function OwnerPanel({
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
  const owner = signer as unknown as TransactionSigner
  const { send, isPending } = useSendInstruction(signer, onSuccess)

  const [guardianInput, setGuardianInput] = useState("")
  const [removeGuardianInput, setRemoveGuardianInput] = useState("")
  const [threshold, setThreshold] = useState(String(vault.threshold))
  const [inactivityDays, setInactivityDays] = useState(
    String(Number(vault.inactivityWindow) / 86400)
  )

  const inRecovery = vault.recoveryState === RecoveryState.RecoveryPending

  return (
    <Card>
      <CardHeader>
        <CardTitle>Owner controls</CardTitle>
        <CardDescription>
          Manage guardians, recovery settings, and prove liveness.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            disabled={isPending || inRecovery}
            onClick={() =>
              send([getPingInstruction({ vault: vaultAddress, owner })])
            }
          >
            Ping (prove liveness)
          </Button>
          {inRecovery && (
            <Button
              variant="destructive"
              disabled={isPending}
              onClick={() =>
                send([
                  getCancelRecoveryInstruction({ vault: vaultAddress, owner }),
                ])
              }
            >
              Cancel recovery
            </Button>
          )}
        </div>

        <Separator />

        <div className="grid gap-2">
          <Label htmlFor="add-guardian">Add guardian</Label>
          <div className="flex gap-2">
            <Input
              id="add-guardian"
              placeholder="Guardian wallet address"
              value={guardianInput}
              onChange={(e) => setGuardianInput(e.target.value)}
              disabled={inRecovery}
            />
            <Button
              disabled={isPending || inRecovery}
              onClick={async () => {
                const guardian = parseAddress(guardianInput)
                if (!guardian) {
                  toast.error("Enter a valid guardian address")
                  return
                }
                await send([
                  getAddGuardianInstruction({
                    vault: vaultAddress,
                    owner,
                    guardian,
                  }),
                ])
                setGuardianInput("")
              }}
            >
              Add
            </Button>
          </div>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="remove-guardian">Remove guardian</Label>
          <div className="flex gap-2">
            <Input
              id="remove-guardian"
              placeholder="Guardian wallet address"
              value={removeGuardianInput}
              onChange={(e) => setRemoveGuardianInput(e.target.value)}
              disabled={inRecovery}
            />
            <Button
              variant="outline"
              disabled={isPending || inRecovery}
              onClick={async () => {
                const guardian = parseAddress(removeGuardianInput)
                if (!guardian) {
                  toast.error("Enter a valid guardian address")
                  return
                }
                await send([
                  getRemoveGuardianInstruction({
                    vault: vaultAddress,
                    owner,
                    guardian,
                  }),
                ])
                setRemoveGuardianInput("")
              }}
            >
              Remove
            </Button>
          </div>
        </div>

        <Separator />

        <div className="grid gap-2">
          <Label htmlFor="threshold">
            Approval threshold (M of {vault.guardians.length} guardians)
          </Label>
          <div className="flex gap-2">
            <Input
              id="threshold"
              type="number"
              min={1}
              max={vault.guardians.length || 1}
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
              disabled={inRecovery}
              className="max-w-32"
            />
            <Button
              variant="outline"
              disabled={isPending || inRecovery}
              onClick={async () => {
                const value = Number(threshold)
                if (!Number.isInteger(value) || value < 1) {
                  toast.error("Enter a valid threshold")
                  return
                }
                await send([
                  getSetThresholdInstruction({
                    vault: vaultAddress,
                    owner,
                    threshold: value,
                  }),
                ])
              }}
            >
              Update
            </Button>
          </div>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="inactivity-window">
            Inactivity window (days, minimum 1)
          </Label>
          <div className="flex gap-2">
            <Input
              id="inactivity-window"
              type="number"
              min={1}
              value={inactivityDays}
              onChange={(e) => setInactivityDays(e.target.value)}
              disabled={inRecovery}
              className="max-w-32"
            />
            <Button
              variant="outline"
              disabled={isPending || inRecovery}
              onClick={async () => {
                const days = Number(inactivityDays)
                if (!Number.isFinite(days) || days < 1) {
                  toast.error("Enter a valid number of days")
                  return
                }
                await send([
                  getSetInactivityWindowInstruction({
                    vault: vaultAddress,
                    owner,
                    seconds: BigInt(Math.floor(days * 86400)),
                  }),
                ])
              }}
            >
              Update
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
