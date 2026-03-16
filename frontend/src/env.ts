declare global {
  interface Window {
    config: Record<string, string>;
  }
}

/**
 * Runtime environment values merged from Vite and optional window-injected config.
 */
export const env: Record<string, string> = {
  ...import.meta.env,
  ...(globalThis as unknown as Window).config,
};
