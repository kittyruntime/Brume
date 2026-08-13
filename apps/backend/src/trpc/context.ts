import { prisma } from "@app/database"
import type { CreateFastifyContextOptions } from "@trpc/server/adapters/fastify"
import { authenticateRequest } from "../utils/request-auth"

export async function createContext({ req, res }: CreateFastifyContextOptions) {
  const user = await authenticateRequest(req)

  return { prisma, req, res, user }
}

export type Context = Awaited<ReturnType<typeof createContext>>
