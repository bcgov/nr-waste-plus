declare global {
  interface Window {
    config: Record<string, string>;
  }
}

export const env: Record<string, string> = {
  ...import.meta.env,
  ...(globalThis as unknown as Window).config,
};
