export const removeEmpty = <T extends object>(obj: T): Partial<T> => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  return Object.fromEntries(Object.entries(obj).filter(([_, v]) => v)) as Partial<T>;
};
