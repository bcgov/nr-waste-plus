/**
 * Carbon theme names supported by the application.
 */
export const CARBON_THEMES = ['white', 'g10', 'g90', 'g100'] as const;

/**
 * Union of supported Carbon theme identifiers.
 */
export type CarbonTheme = (typeof CARBON_THEMES)[number];

/**
 * Persisted user preferences shared across the application.
 */
export type UserPreference = {
  theme: CarbonTheme;
  [key: string]: unknown;
};
