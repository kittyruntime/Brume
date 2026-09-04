import { z } from "zod"
import { router, storageProcedure } from "../index"

const DEFAULT_THRESHOLDS = { diskUsageWarningPercent: 80, diskUsageCriticalPercent: 90 }

export const alertRouter = router({
  list: storageProcedure.query(({ ctx }) => ctx.prisma.alert.findMany()),

  thresholds: storageProcedure.query(async ({ ctx }) => {
    const row = await ctx.prisma.alertThreshold.findUnique({ where: { id: "default" } })
    return row ?? { id: "default", ...DEFAULT_THRESHOLDS }
  }),

  updateThresholds: storageProcedure
    .input(z.object({
      diskUsageWarningPercent: z.number().int().min(1).max(99),
      diskUsageCriticalPercent: z.number().int().min(1).max(99),
    }).refine(v => v.diskUsageCriticalPercent > v.diskUsageWarningPercent, {
      message: "Critical threshold must be higher than the warning threshold",
    }))
    .mutation(({ ctx, input }) =>
      ctx.prisma.alertThreshold.upsert({
        where:  { id: "default" },
        update: input,
        create: { id: "default", ...input },
      })
    ),
})
