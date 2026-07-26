export const CLOUD_TOKEN_KEY = 'gunfight-cloud-token'
export const CLOUD_USER_KEY = 'gunfight-cloud-user'

export type CloudSession = {
  token: string
  username: string
}

export function readCloudSession(storage: Pick<Storage, 'getItem'>): CloudSession | null {
  const token = storage.getItem(CLOUD_TOKEN_KEY) ?? ''
  const username = storage.getItem(CLOUD_USER_KEY) ?? ''
  return token && username ? { token, username } : null
}

export function writeCloudSession(storage: Pick<Storage, 'setItem'>, session: CloudSession) {
  storage.setItem(CLOUD_TOKEN_KEY, session.token)
  storage.setItem(CLOUD_USER_KEY, session.username)
}

export function clearCloudSession(storage: Pick<Storage, 'removeItem'>) {
  storage.removeItem(CLOUD_TOKEN_KEY)
  storage.removeItem(CLOUD_USER_KEY)
}
