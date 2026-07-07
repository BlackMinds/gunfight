import { vi } from 'vitest'

vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => window.setTimeout(() => callback(performance.now()), 16))
vi.stubGlobal('cancelAnimationFrame', (id: number) => window.clearTimeout(id))
