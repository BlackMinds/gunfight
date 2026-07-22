import jwt from 'jsonwebtoken'
import { createError, getHeader, type H3Event } from 'h3'

type CloudToken = { sub: string; username: string }

function jwtSecret() {
  const secret = process.env.NUXT_JWT_SECRET || process.env.JWT_SECRET
  if (!secret || secret.length < 32) throw createError({ statusCode: 503, message: '云存档鉴权配置无效' })
  return secret
}

export function issueCloudToken(userId: string, username: string) {
  return jwt.sign({ sub: userId, username } satisfies CloudToken, jwtSecret(), { expiresIn: '30d', issuer: 'gunfight-cloud' })
}

export function requireCloudUser(event: H3Event): CloudToken {
  const authorization = getHeader(event, 'authorization')
  if (!authorization?.startsWith('Bearer ')) throw createError({ statusCode: 401, message: '请先登录云存档账号' })
  const secret = jwtSecret()
  try {
    const payload = jwt.verify(authorization.slice(7), secret, { issuer: 'gunfight-cloud' }) as jwt.JwtPayload
    if (!payload.sub || typeof payload.username !== 'string') throw new Error('invalid token')
    return { sub: payload.sub, username: payload.username }
  } catch {
    throw createError({ statusCode: 401, message: '云存档登录已过期，请重新登录' })
  }
}
