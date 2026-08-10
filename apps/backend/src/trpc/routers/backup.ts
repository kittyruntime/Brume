import { z } from "zod"
import { TRPCError } from "@trpc/server"
import { adminProcedure, router } from "../index"
import { nextBackupRun, runBackupPlan } from "../../services/backup-scheduler"

const absolutePath = z.string().trim().min(1).max(4096).refine(v => v.startsWith("/"), "An absolute path is required")
const planShape = z.object({
  name: z.string().trim().min(1).max(80), direction: z.enum(["push", "pull"]),
  source: absolutePath, destination: absolutePath,
  remoteHost: z.string().trim().max(253).regex(/^[a-zA-Z0-9][a-zA-Z0-9.-]*$/).nullable(),
  remoteUser: z.string().trim().max(32).regex(/^[a-z_][a-z0-9_-]*$/).nullable(),
  remotePort: z.number().int().min(1).max(65535), sshKeyPath: absolutePath.nullable(),
  schedule: z.enum(["manual", "hourly", "daily", "weekly"]),
  scheduleHour: z.number().int().min(0).max(23), scheduleMinute: z.number().int().min(0).max(59),
  scheduleWeekday: z.number().int().min(0).max(6), deleteExtra: z.boolean(), compress: z.boolean(),
  bandwidthLimit: z.number().int().min(64).max(1048576).nullable(),
  excludes: z.array(z.string().trim().min(1).max(255).regex(/^[^\0\r\n]+$/)).max(50), enabled: z.boolean(),
})
const validatePlan = (v: z.infer<typeof planShape>, ctx: z.RefinementCtx) => {
  const remote = Boolean(v.remoteHost)
  if (remote !== Boolean(v.remoteUser) || remote !== Boolean(v.sshKeyPath)) ctx.addIssue({ code: "custom", message: "Remote host, user and SSH key are required together" })
  if (remote && v.source === v.destination) ctx.addIssue({ code: "custom", message: "Source and destination must differ" })
  if (!remote && (v.source === v.destination || v.destination.startsWith(`${v.source}/`) || v.source.startsWith(`${v.destination}/`))) ctx.addIssue({ code: "custom", message: "Local source and destination must not overlap" })
}
const planInput = planShape.superRefine(validatePlan)

const data = (v: z.infer<typeof planInput>) => ({ ...v, excludes: JSON.stringify(v.excludes), nextRunAt: v.enabled ? nextBackupRun(v.schedule, v.scheduleHour, v.scheduleMinute, v.scheduleWeekday) : null })
const output = (p: any) => ({ ...p, excludes: JSON.parse(p.excludes) })

export const backupRouter = router({
  list: adminProcedure.query(async ({ ctx }) => (await ctx.prisma.backupPlan.findMany({ orderBy: { createdAt: "desc" } })).map(output)),
  create: adminProcedure.input(planInput).mutation(async ({ ctx, input }) => output(await ctx.prisma.backupPlan.create({ data: data(input) }))),
  update: adminProcedure.input(planShape.extend({ id: z.string().uuid() }).superRefine(validatePlan)).mutation(async ({ ctx, input }) => {
    const { id, ...values } = input
    return output(await ctx.prisma.backupPlan.update({ where: { id }, data: data(values) }))
  }),
  delete: adminProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    const plan = await ctx.prisma.backupPlan.findUnique({ where: { id: input.id } })
    if (plan?.lastStatus === "pending" || plan?.lastStatus === "running") throw new TRPCError({ code: "CONFLICT", message: "A running backup cannot be deleted" })
    await ctx.prisma.backupPlan.delete({ where: { id: input.id } }); return { ok: true }
  }),
  run: adminProcedure.input(z.object({ id: z.string().uuid() })).mutation(({ ctx, input }) => runBackupPlan(input.id, ctx.user!.userId)),
})
