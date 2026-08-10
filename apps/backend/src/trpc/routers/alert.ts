import { router, storageProcedure } from "../index"

export const alertRouter = router({
  list: storageProcedure.query(({ ctx }) => ctx.prisma.alert.findMany()),
})
