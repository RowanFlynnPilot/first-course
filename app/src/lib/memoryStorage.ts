// A minimal Storage, so the tests of what the phone keeps (timers, the cart's
// checks, the cook in progress) do not need a browser. Used only by tests.

export function memoryStorage(): Storage {
  const items = new Map<string, string>()
  return {
    get length() {
      return items.size
    },
    clear: () => items.clear(),
    getItem: (name) => items.get(name) ?? null,
    key: (index) => [...items.keys()][index] ?? null,
    removeItem: (name) => void items.delete(name),
    setItem: (name, value) => void items.set(name, value),
  }
}
