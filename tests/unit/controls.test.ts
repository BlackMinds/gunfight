import { describe, expect, it } from 'vitest'
import { normalizeGameControlKey } from '../../shared/game/controls'

describe('game keyboard controls', () => {
  it.each([
    ['Digit1', '!', '1'],
    ['Digit2', '@', '2'],
    ['Digit3', '#', '3'],
    ['Numpad1', 'End', '1'],
    ['Numpad2', 'ArrowDown', '2'],
    ['Numpad3', 'PageDown', '3']
  ])('normalizes physical %s to shortcut %s', (code, key, expected) => {
    expect(normalizeGameControlKey({ code, key })).toBe(expected)
  })

  it('keeps character-based controls as a fallback', () => {
    expect(normalizeGameControlKey({ code: '', key: 'W' })).toBe('w')
    expect(normalizeGameControlKey({ code: '', key: 'ArrowLeft' })).toBe('arrowleft')
  })
})
