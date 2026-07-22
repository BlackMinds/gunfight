import bcrypt from 'bcryptjs'
import { createError, readBody } from 'h3'
import type { QueryResult } from 'pg'
import { issueCloudToken } from '../../utils/auth'
import { cloudServiceUnavailable } from '../../utils/cloud-errors'
import { database, ensureCloudSchema } from '../../utils/database'
import { parseCredentials } from '../../utils/validation'

export default defineEventHandler(async (event) => {
  const { username, password } = parseCredentials(await readBody(event))
  let result: QueryResult<{ id: string; password_hash: string }>
  try {
    await ensureCloudSchema()
    result = await database().query<{ id: string; password_hash: string }>('SELECT id, password_hash FROM gunfight_users WHERE username = $1', [username])
  } catch {
    throw cloudServiceUnavailable()
  }
  const user = result.rows[0]
  let passwordMatches = false
  try {
    passwordMatches = Boolean(user && await bcrypt.compare(password, user.password_hash))
  } catch {
    throw cloudServiceUnavailable()
  }
  if (!user || !passwordMatches) throw createError({ statusCode: 401, message: '账号或密码错误' })
  return { token: issueCloudToken(user.id, username), username }
})
