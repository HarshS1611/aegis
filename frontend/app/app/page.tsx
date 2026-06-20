import { VaultDashboard } from "@/components/vault/vault-dashboard"
import { TransactionLog } from "@/components/vault/transaction-log"
import { SiteHeader } from "@/components/site-header"

export default function AppPage() {
  return (
    <div className="mx-auto flex min-h-svh max-w-7xl flex-col gap-6 p-6">
      <SiteHeader showLaunch={false} />
      <VaultDashboard />
      <TransactionLog />
    </div>
  )
}
