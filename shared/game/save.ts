import type { Attachment } from './weapons'

export const CURRENT_SAVE_VERSION = 6

export const emptyLegacyBase = () => ({ weaponLevel: 0, armorLevel: 0, magnetLevel: 0 })

export function migrateAttachmentIdentity(item: Attachment): Attachment {
  const legacyName = '吸血模块'
  const nextName = '生命模块'
  const templateKey = item.templateKey === legacyName ? nextName : item.templateKey
  const name = item.name.startsWith(legacyName) ? item.name.replace(legacyName, nextName) : item.name
  return { ...item, templateKey, name }
}
