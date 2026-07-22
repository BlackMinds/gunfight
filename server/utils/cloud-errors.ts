import { createError } from 'h3'

export function cloudServiceUnavailable() {
  return createError({ statusCode: 503, message: '云存档服务暂时不可用，请稍后重试' })
}

export function isPostgresUniqueViolation(error: unknown) {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === '23505'
}
