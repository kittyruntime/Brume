import { prisma } from "@app/database"
import { requestSync } from "../nats"

type CheckResult = { target: string; message: string }
type Checker = { source: string; check: () => Promise<CheckResult[]> }

type RaidArray = {
  name: string
  level: string
  state: string
  devices: string[]
  active: number
  total: number
}

async function checkRaid(): Promise<CheckResult[]> {
  const res = await requestSync<{ raids: RaidArray[] }>("root.sys.blockdevices", {}, 15_000)
  return res.raids
    .filter(r => !((r.state === "active" || r.state === "clean") && r.active === r.total))
    .map(r => ({
      target: r.name,
      message: `${r.active}/${r.total} devices active (${r.state})`,
    }))
}

type BlockDevLite = { name: string; type: string }

type SmartAttr = { isCritical: boolean; raw: number }
type SmartResult = {
  available: boolean
  healthPassed: boolean
  attributes: SmartAttr[]
  nvme?: { criticalWarning: number; mediaErrors: number }
}

// Mirrors apps/dashboard/src/composables/useSmart.ts's smartStatus — same
// classification over the same already-computed (root-worker-side) data,
// duplicated here (not shared) since it's 6 lines and this is the only other
// place that needs it.
function deriveSmartStatus(s: SmartResult): "passed" | "warning" | "failed" | "unknown" {
  if (!s.available) return "unknown"
  if (!s.healthPassed) return "failed"
  if (s.attributes.some(a => a.isCritical && a.raw > 0)) return "warning"
  if (s.nvme && (s.nvme.criticalWarning > 0 || s.nvme.mediaErrors > 0)) return "warning"
  return "passed"
}

async function checkSmart(): Promise<CheckResult[]> {
  const { devices } = await requestSync<{ devices: BlockDevLite[] }>("root.sys.blockdevices", {}, 15_000)
  const disks = devices.filter(d => d.type === "disk")
  const results: CheckResult[] = []
  for (const d of disks) {
    let smart: SmartResult
    try {
      smart = await requestSync<SmartResult>("root.sys.smart", { device: d.name }, 15_000)
    } catch {
      continue // unreadable SMART data for this disk — skip, not an alert condition on its own
    }
    const status = deriveSmartStatus(smart)
    if (status === "warning" || status === "failed") {
      results.push({ target: d.name, message: `SMART status: ${status}` })
    }
  }
  return results
}

const checkers: Checker[] = [
  { source: "storage.raid", check: checkRaid },
  { source: "storage.smart", check: checkSmart },
]

async function runChecks(): Promise<void> {
  for (const { source, check } of checkers) {
    let found: CheckResult[] | null
    try {
      found = await check()
    } catch {
      found = null // transient failure — leave this source's existing alerts as-is
    }
    if (found === null) continue
    const targets = found.map(f => f.target)
    await prisma.alert.deleteMany({ where: { source, target: { notIn: targets } } })
    for (const f of found) {
      await prisma.alert.upsert({
        where: { source_target: { source, target: f.target } },
        create: { source, target: f.target, message: f.message },
        update: { message: f.message },
      })
    }
  }
}

export function startAlertSampler(): void {
  void runChecks()
  setInterval(() => { void runChecks() }, 5 * 60_000)
}
