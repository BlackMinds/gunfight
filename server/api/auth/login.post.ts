import bcrypt from 'bcryptjs'
import { createError, readBody } from 'h3'
import { issueCloudToken } from '../../utils/auth'
import { database, ensureCloudSchema } from '../../utils/database'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ username?: string; password?: string }>(event)
  const username = body.username?.trim().toLowerCase() ?? ''
  const password = body.password ?? ''
  await ensureCloudSchema()
  const result = await database().query<{ id: string; password_hash: string }>('SELECT id, password_hash FROM gunfight_users WHERE username = $1', [username])
  const user = result.rows[0]
  if (!user || !(await bcrypt.compare(password, user.password_hash))) throw createError({ statusCode: 401, message: '账号或密码错误' })
  return { token: issueCloudToken(user.id, username), username }
})
