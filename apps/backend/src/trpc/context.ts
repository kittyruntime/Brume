import { prisma } from "@app/database"
import type { CreateFastifyContextOptions } from "@trpc/server/adapters/fastify"
import { verifyToken, isTokenBlacklisted, type TokenPayload } from "./auth"

export async function createContext({ req, res }: CreateFastifyContextOptions) {
  let user: TokenPayload | null = null

  const authHeader = req.headers.authorization
  if (authHeader?.startsWith("Bearer ")) {
    let payload: TokenPayload | null = null
    try {
      const p = verifyToken(authHeader.slice(7))
      if (!isTokenBlacklisted(p.jti)) payload = p
    } catch {
      // invalid token — user stays null
    }
    if (payload) {
      // Admin/user-manager/capability flags are read fresh from the DB on every
      // request (deliberately outside the try/catch above, so a DB error surfaces
      // as a real failure instead of silently downgrading to "invalid token"), so
      // demoting an account or revoking a capability takes effect immediately
      // instead of when its 7-day token expires.
      const dbUser = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: { isAdmin: true, isUserManager: true, capabilities: { select: { capability: true } } },
      })
      if (dbUser) {
        user = {
          userId: payload.userId,
          jti: payload.jti,
          isAdmin: dbUser.isAdmin,
          isUserManager: dbUser.isAdmin || dbUser.isUserManager,
          capabilities: dbUser.capabilities.map(c => c.capability),
        }
      }
    }
  }

  return { prisma, req, res, user }
}

export type Context = Awaited<ReturnType<typeof createContext>>
