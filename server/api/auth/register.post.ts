import bcrypt from 'bcryptjs'
import { createError, readBody } from 'h3'
import { issueCloudToken } from '../../utils/auth'
import { cloudServiceUnavailable, isPostgresUniqueViolation } from '../../utils/cloud-errors'
import { createUserId, database, ensureCloudSchema } from '../../utils/database'
import { parseCredentials } from '../../utils/validation'

export default defineEventHandler(async (event) => {
  const { username, password } = parseCredentials(await readBody(event))
  const id = createUserId()
  const token = issueCloudToken(id, username)
  let passwordHash: string
  try {
    passwordHash = await bcrypt.hash(password, 12)
  } catch {
    throw cloudServiceUnavailable()
  }
  try {
    await ensureCloudSchema()
    await database().query('INSERT INTO gunfight_users (id, username, password_hash) VALUES ($1, $2, $3)', [id, username, passwordHash])
  } catch (error) {
    if (isPostgresUniqueViolation(error)) throw createError({ statusCode: 409, message: '该账号已存在' })
    throw cloudServiceUnavailable()
  }
  return { token, username }
})
