const physicalControlKeys: Record<string, string> = {
  Digit1: '1',
  Digit2: '2',
  Digit3: '3',
  Numpad1: '1',
  Numpad2: '2',
  Numpad3: '3'
}

export function normalizeGameControlKey(event: Pick<KeyboardEvent, 'code' | 'key'>) {
  return physicalControlKeys[event.code] ?? event.key.toLowerCase()
}
