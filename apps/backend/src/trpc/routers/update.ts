import { adminProcedure, router } from "../index"
import { z } from "zod"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { requestSync } from "../../nats"

const dirname = path.dirname(fileURLToPath(import.meta.url))

function installDir(): string {
  if (process.env.INSTALL_DIR) return process.env.INSTALL_DIR
  // dev: src/trpc/routers → ../../../../../ = repo root
  return path.resolve(dirname, "../../../../..")
}

// install.sh chowns INSTALL_DIR/database/data to the app user but leaves
// INSTALL_DIR itself root-owned (0755) once the release install/update flow
// has run. The backend runs unprivileged, so the pending-update marker must
// live somewhere it can actually create a file — database/data is the one
// directory install.sh guarantees it owns. Mirrored in scripts/install.sh
// (stale-marker cleanup, the update-apply path unit and its service).
//
// The release tarball flattens the monorepo (database/ sits directly under
// INSTALL_DIR); in the dev checkout the same data dir is nested under
// packages/. INSTALL_DIR is only set in production, so its presence tells
// us which layout applies.
function pendingUpdateFile(): string {
  const dbDataDir = process.env.INSTALL_DIR
    ? path.join(installDir(), "database", "data")
    : path.join(installDir(), "packages", "database", "data")
  return path.join(dbDataDir, ".pending-update")
}

function readCurrentVersion(): string {
  const vf = path.join(installDir(), "VERSION")
  if (fs.existsSync(vf)) return fs.readFileSync(vf, "utf8").trim()
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(installDir(), "package.json"), "utf8"))
    return `v${pkg.version}`
  } catch { return "unknown" }
}

type CheckResult = { latestVersion: string; checkedAt: string; releaseNotes?: string }

function readCheck(): CheckResult | null {
  try {
    return JSON.parse(fs.readFileSync(path.join(installDir(), ".update-check.json"), "utf8"))
  } catch { return null }
}

function isNewer(candidate: string, current: string): boolean {
  const toInts = (v: string) => v.replace(/^v/, "").split(".").map(x => parseInt(x) || 0)
  const [caMaj=0, caMin=0, caPatch=0] = toInts(candidate)
  const [cuMaj=0, cuMin=0, cuPatch=0] = toInts(current)
  if (caMaj !== cuMaj) return caMaj > cuMaj
  if (caMin !== cuMin) return caMin > cuMin
  return caPatch > cuPatch
}

const GITHUB_REPO = "kittyruntime/home-server-interface"
let restartScheduled = false

export const updateRouter = router({
  status: adminProcedure.query(() => {
    const current  = readCurrentVersion()
    const check    = readCheck()
    const pending  = fs.existsSync(pendingUpdateFile())
    const hasUpdate = check ? isNewer(check.latestVersion, current) : false
    return {
      current,
      latest:       check?.latestVersion  ?? null,
      hasUpdate,
      checkedAt:    check?.checkedAt      ?? null,
      releaseNotes: check?.releaseNotes   ?? null,
      pending,
      repoUrl:      `https://github.com/${GITHUB_REPO}`,
    }
  }),

  check: adminProcedure.mutation(async () => {
    const res = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`,
      { headers: { "User-Agent": "hsi-update-checker", Accept: "application/vnd.github+json" } }
    )
    if (!res.ok) throw new Error(`GitHub API returned ${res.status}`)
    const data = await res.json() as { tag_name: string; body?: string }
    const result: CheckResult = {
      latestVersion: data.tag_name,
      checkedAt: new Date().toISOString(),
      releaseNotes: data.body?.slice(0, 4000),
    }
    fs.writeFileSync(
      path.join(installDir(), ".update-check.json"),
      JSON.stringify(result),
      "utf8"
    )
    return result
  }),

  apply: adminProcedure
    .input(z.object({ version: z.string().regex(/^v\d+\.\d+\.\d+$/) }))
    .mutation(({ input }) => {
      fs.writeFileSync(pendingUpdateFile(), input.version, "utf8")
      return { ok: true }
    }),

  restart: adminProcedure.mutation(() => {
    if (!restartScheduled) {
      restartScheduled = true
      // Respond to the browser and let the audit write complete before exiting.
      // The service supervisor starts the backend again after EX_TEMPFAIL.
      const timer = setTimeout(() => process.exit(75), 750)
      timer.unref()
    }
    return { ok: true }
  }),

  rebootHost: adminProcedure.mutation(async () => {
    await requestSync<{ scheduled: boolean }>("root.sys.reboot", {}, 5_000)
    return { ok: true }
  }),
})
