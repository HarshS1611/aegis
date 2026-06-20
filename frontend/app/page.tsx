import Link from "next/link"
import {
  ArrowRight,
  Clock,
  GitFork,
  ShieldCheck,
  ShieldQuestion,
  Users,
  Zap,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { SiteHeader } from "@/components/site-header"
import { GITHUB_URL } from "@/lib/constants"
import { AEGIS_PROGRAM_PROGRAM_ADDRESS } from "@/lib/generated"
import { explorerAddressUrl } from "@/lib/solana/config"

const steps = [
  {
    icon: Users,
    title: "1. Register guardians",
    description:
      "The owner adds trusted wallet addresses as guardians and sets an approval threshold (M of N).",
  },
  {
    icon: Clock,
    title: "2. Stay active",
    description:
      "Periodic ping calls reset the inactivity clock. Guardians have zero power while the owner is active.",
  },
  {
    icon: ShieldQuestion,
    title: "3. Recovery triggers",
    description:
      "If the owner is inactive past the configured window, a guardian can initiate recovery and propose a new owner.",
  },
  {
    icon: Zap,
    title: "4. Atomic rotation",
    description:
      "Once threshold approvals are collected, the final approval and rotation can land atomically via a Jito bundle.",
  },
]

const personas = [
  {
    value: "owner",
    label: "Vault owner",
    description:
      "Full control at all times. Funds never move — only the owner key can change.",
    actions: [
      "Create a vault and set guardians, threshold, and inactivity window",
      "Ping periodically to prove you're still active",
      "Cancel any in-progress recovery instantly, no questions asked",
      "Add or remove guardians whenever you're not in active recovery",
    ],
  },
  {
    value: "guardian",
    label: "Guardian",
    description:
      "Trusted by the owner. Cannot access funds, only help rotate the owner key after inactivity.",
    actions: [
      "Read vault status to see if the inactivity window has elapsed",
      "Initiate recovery with a proposed new owner address",
      "Approve recovery — counts toward the M-of-N threshold",
      "Execute rotation once threshold is met, optionally as an atomic Jito bundle",
    ],
  },
]

const securityPoints = [
  "Guardians can never move, spend, or view vault funds — only rotate the owner key.",
  "The owner can cancel any active recovery at any time, no matter how many approvals exist.",
  "Recovery only activates after a configurable inactivity window (minimum 1 day).",
  "M-of-N guardian approval required — no single guardian can act alone.",
  "Recoveries expire automatically after 7 days if not completed.",
]

export default function LandingPage() {
  return (
    <div className="mx-auto flex min-h-svh max-w-7xl flex-col gap-16 p-6 pb-24">
      <SiteHeader />

      {/* Hero */}
      <section className="grid gap-6 pt-12 text-center">
        <Badge variant="secondary" className="mx-auto">
          Devnet — Turbin3 Capstone POC
        </Badge>
        <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
          Social recovery for your Solana wallet, without a custodian
        </h1>
        <p className="text-muted-foreground mx-auto max-w-2xl text-lg">
          Aegis lets you register guardians on-chain, set an inactivity
          window, and let a threshold of guardians rotate your wallet&apos;s
          ownership key if you ever lose access — fully non-custodial, with
          optional atomic execution via Jito.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Button size="lg" asChild>
            <Link href="/app">
              Launch app <ArrowRight className="size-4" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <a
              href={explorerAddressUrl(AEGIS_PROGRAM_PROGRAM_ADDRESS)}
              target="_blank"
              rel="noreferrer"
            >
              View program on Explorer
            </a>
          </Button>
        </div>
      </section>

      {/* How it works */}
      <section className="grid gap-6">
        <div className="text-center">
          <h2 className="text-2xl font-semibold">How it works</h2>
          <p className="text-muted-foreground">
            One on-chain vault PDA per owner. Four steps from setup to
            recovery.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map(({ icon: Icon, title, description }) => (
            <Card key={title}>
              <CardHeader>
                <Icon className="text-primary size-6" />
                <CardTitle className="text-base">{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      {/* Personas */}
      <section className="grid gap-6">
        <div className="text-center">
          <h2 className="text-2xl font-semibold">Two roles, clear powers</h2>
          <p className="text-muted-foreground">
            See exactly what each side can — and can&apos;t — do.
          </p>
        </div>
        <Tabs defaultValue="owner" className="mx-auto w-full max-w-2xl">
          <TabsList className="mx-auto">
            {personas.map((p) => (
              <TabsTrigger key={p.value} value={p.value}>
                {p.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {personas.map((p) => (
            <TabsContent key={p.value} value={p.value}>
              <Card>
                <CardHeader>
                  <CardTitle>{p.label}</CardTitle>
                  <CardDescription>{p.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="grid gap-2 text-sm">
                    {p.actions.map((action) => (
                      <li key={action} className="flex items-start gap-2">
                        <ShieldCheck className="text-primary mt-0.5 size-4 shrink-0" />
                        <span>{action}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      </section>

      {/* Recovery state machine */}
      <section className="grid gap-6">
        <div className="text-center">
          <h2 className="text-2xl font-semibold">Recovery lifecycle</h2>
          <p className="text-muted-foreground">
            Two on-chain states. The owner can always cancel.
          </p>
        </div>
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-center gap-3">
          <Badge className="px-4 py-2 text-sm">Idle</Badge>
          <ArrowRight className="text-muted-foreground size-4" />
          <Badge variant="destructive" className="px-4 py-2 text-sm">
            Recovery pending
          </Badge>
          <ArrowRight className="text-muted-foreground size-4" />
          <Badge variant="secondary" className="px-4 py-2 text-sm">
            Rotated
          </Badge>
          <span className="text-muted-foreground text-sm">or</span>
          <Badge variant="outline" className="px-4 py-2 text-sm">
            Cancelled
          </Badge>
          <span className="text-muted-foreground text-sm">or</span>
          <Badge variant="outline" className="px-4 py-2 text-sm">
            Expired (7 days)
          </Badge>
          <ArrowRight className="text-muted-foreground size-4" />
          <Badge className="px-4 py-2 text-sm">Idle</Badge>
        </div>
      </section>

      {/* Jito */}
      <section className="grid gap-6 lg:grid-cols-2 lg:items-center">
        <div className="grid gap-3">
          <Badge variant="secondary" className="w-fit">
            <Zap className="size-3" /> Optional
          </Badge>
          <h2 className="text-2xl font-semibold">
            Atomic execution via Jito bundles
          </h2>
          <p className="text-muted-foreground">
            Between the threshold being reached and{" "}
            <code className="text-foreground">execute_rotation</code>{" "}
            confirming, a brief front-running window exists. Aegis can
            package the final approval, the rotation instruction, and a
            validator tip into a single Jito bundle — both land in the same
            block, or neither does.
          </p>
          <p className="text-muted-foreground text-sm">
            The on-chain program has no dependency on Jito.{" "}
            <code className="text-foreground">execute_rotation</code>{" "}
            validates its own state and works correctly with or without a
            bundle.
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Bundle composition</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="grid gap-2 text-sm">
              <li className="flex items-center gap-2">
                <Badge variant="outline">1</Badge> Final{" "}
                <code>approve_recovery</code> (reaches threshold)
              </li>
              <li className="flex items-center gap-2">
                <Badge variant="outline">2</Badge>{" "}
                <code>execute_rotation</code> (updates owner)
              </li>
              <li className="flex items-center gap-2">
                <Badge variant="outline">3</Badge> Tip instruction (priority
                inclusion)
              </li>
            </ol>
          </CardContent>
        </Card>
      </section>

      <Separator />

      {/* Security */}
      <section className="grid gap-6">
        <div className="text-center">
          <h2 className="text-2xl font-semibold">Security guarantees</h2>
        </div>
        <div className="mx-auto grid max-w-2xl gap-3">
          {securityPoints.map((point) => (
            <div key={point} className="flex items-start gap-2 text-sm">
              <ShieldCheck className="text-primary mt-0.5 size-4 shrink-0" />
              <span>{point}</span>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="grid gap-4 text-center">
        <h2 className="text-2xl font-semibold">Ready to protect your vault?</h2>
        <div className="flex items-center justify-center gap-3">
          <Button size="lg" asChild>
            <Link href="/app">
              Launch app <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
        <p className="text-muted-foreground text-xs">
          Program ID:{" "}
          <a
            href={explorerAddressUrl(AEGIS_PROGRAM_PROGRAM_ADDRESS)}
            target="_blank"
            rel="noreferrer"
            className="font-mono underline-offset-4 hover:underline"
          >
            {AEGIS_PROGRAM_PROGRAM_ADDRESS}
          </a>
        </p>
      </section>

      <Separator />

      {/* Footer */}
      <footer className="flex flex-col items-center gap-2 text-center">
        <p className="text-muted-foreground text-sm">
          Aegis — Turbin3 Builders Program Q2 2026 Capstone
        </p>
        <a
          href={GITHUB_URL}
          target="_blank"
          rel="noreferrer"
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2 text-sm underline-offset-4 hover:underline"
        >
          <GitFork className="size-4" /> View source on GitHub
        </a>
      </footer>
    </div>
  )
}
