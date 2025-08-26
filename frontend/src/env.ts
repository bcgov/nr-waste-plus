declare global {
  interface Window {
    config: object;
  }
}

export const env: Record<string, string> = { ...import.meta.env, ...window.config };
