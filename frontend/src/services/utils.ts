export const removeEmpty = <T extends object>(obj: T): Partial<T> => {
  return Object.fromEntries(
    Object.entries(obj)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      .filter(([_, v]) => {
        if (Array.isArray(v)) {
          // Remove invalid values from array
          const filtered = v.filter((item) => item !== null && item !== undefined && item !== '');
          return filtered.length > 0;
        }
        if (typeof v === 'object' && v !== null) {
          return Object.keys(v).length > 0;
        }
        return Boolean(v);
      })
      .map(([k, v]) => {
        if (Array.isArray(v)) {
          // Remove invalid values from array
          return [k, v.filter((item) => item !== null && item !== undefined && item !== '')];
        }
        if (typeof v === 'object' && v !== null) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          return [k, removeEmpty(v) as any];
        }
        return [k, v];
      }),
  ) as Partial<T>;
};

const generateHex = (length: number): string => {
  const chars = 'abcdef0123456789';
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
};

export const getB3Headers = () => {
  return {
    'X-B3-TraceId': generateHex(32),
    'X-B3-SpanId': generateHex(16),
  };
};
