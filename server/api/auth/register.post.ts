import bcrypt from 'bcryptjs'
import { createError, readBody } from 'h3'
import { issueCloudToken } from '../../utils/auth'
import { createUserId, database, ensureCloudSchema } from '../../utils/database'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ username?: string; password?: string }>(event)
  const username = body.username?.trim().toLowerCase() ?? ''
  const password = body.password ?? ''
  if (!/^[a-z0-9_]{3,24}$/.test(username)) throw createError({ statusCode: 400, message: '账号需为 3～24 位字母、数字或下划线' })
  if (password.length < 8 || password.length > 72) throw createError({ statusCode: 400, message: '密码长度需为 8～72 位' })
  await ensureCloudSchema()
  const exists = await database().query('SELECT 1 FROM gunfight_users WHERE username = $1', [username])
  if (exists.rowCount) throw createError({ statusCode: 409, message: '该账号已存在' })
  const id = createUserId()
  const passwordHash = await bcrypt.hash(password, 12)
  await database().query('INSERT INTO gunfight_users (id, username, password_hash) VALUES ($1, $2, $3)', [id, username, passwordHash])
  return { token: issueCloudToken(id, username), username }
})
