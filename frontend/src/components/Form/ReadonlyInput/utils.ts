export const toKebabCase = (text: string): string => {
  return text.trim().split(' ').filter(Boolean).join('-').toLowerCase();
};
