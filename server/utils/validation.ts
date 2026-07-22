import { Buffer } from 'node:buffer'
import { createError } from 'h3'
import { PUBLISHED_STAGE_CAP } from '../../shared/game/formulas'
import { CURRENT_SAVE_VERSION } from '../../shared/game/save'

const USERNAME_PATTERN = /^[a-z0-9_]{3,24}$/
const MAX_CLOUD_SAVE_BYTES = 1_000_000

type JsonObject = Record<string, unknown>

function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isSafeInteger(value: unknown, min: number, max = Number.MAX_SAFE_INTEGER) {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= min && value <= max
}

function isFiniteNumber(value: unknown, min: number) {
  return typeof value === 'number' && Number.isFinite(value) && value >= min
}

function hasIntegerFields(value: unknown, fields: string[]) {
  return isObject(value) && fields.every((field) => isSafeInteger(value[field], 0))
}

function isAttachmentList(value: unknown) {
  return Array.isArray(value) && value.every((item) => typeof item === 'string' || isObject(item))
}

export function parseCredentials(value: unknown) {
  if (!isObject(value)) throw createError({ statusCode: 400, message: '账号信息格式无效' })
  const username = typeof value.username === 'string' ? value.username.trim().toLowerCase() : ''
  const password = typeof value.password === 'string' ? value.password : ''
  if (!USERNAME_PATTERN.test(username)) throw createError({ statusCode: 400, message: '账号需为 3～24 位字母、数字或下划线' })
  if (password.length < 8 || password.length > 72) throw createError({ statusCode: 400, message: '密码长度需为 8～72 位' })
  return { username, password }
}

export function isValidCloudSavePayload(payload: unknown): payload is JsonObject {
  if (!isObject(payload)) return false
  if (!isSafeInteger(payload.saveVersion, 1, CURRENT_SAVE_VERSION)) return false
  if (!isSafeInteger(payload.stage, 1, PUBLISHED_STAGE_CAP)) return false
  if (payload.highestCleared !== undefined && !isSafeInteger(payload.highestCleared, 0, PUBLISHED_STAGE_CAP)) return false
  if (!hasIntegerFields(payload.resources, ['gold', 'alloy', 'parts'])) return false
  if (!hasIntegerFields(payload.base, ['weaponLevel', 'armorLevel', 'magnetLevel'])) return false
  if (!isObject(payload.player)) return false
  if (!isSafeInteger(payload.player.level, 1) || !isFiniteNumber(payload.player.exp, 0) || !isFiniteNumber(payload.player.hp, 0)) return false
  if (!isAttachmentList(payload.equipped) || !isAttachmentList(payload.inventory)) return false
  if (payload.savedAt !== undefined && !isSafeInteger(payload.savedAt, 0)) return false
  return true
}

export function parseCloudSaveWrite(value: unknown) {
  if (!isObject(value)) throw createError({ statusCode: 400, message: '云存档请求格式无效' })
  if (!isSafeInteger(value.baseRevision, 0)) throw createError({ statusCode: 400, message: '基础修订号无效' })
  if (!isValidCloudSavePayload(value.payload)) throw createError({ statusCode: 400, message: '存档核心字段无效' })

  let serialized: string
  try {
    serialized = JSON.stringify(value.payload)
  } catch {
    throw createError({ statusCode: 400, message: '存档内容无法序列化' })
  }
  if (Buffer.byteLength(serialized, 'utf8') > MAX_CLOUD_SAVE_BYTES) {
    throw createError({ statusCode: 413, message: '存档超过 1 MB 上限' })
  }
  return { baseRevision: value.baseRevision, payload: value.payload }
}
