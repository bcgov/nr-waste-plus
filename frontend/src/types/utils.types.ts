/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Overrides properties in T with properties in U.
 */
export type Override<T, U> = Omit<T, keyof U> & U;

/**
 * Gets the type of property K in T, excluding undefined.
 * i.e. if the property is optional, gets the type of it as if it was required.
 */
export type DefinedValue<T, K extends keyof T> = Required<T>[K];

/**
 * Gets the properties in T whose value is an array.
 */
export type ArrayKey<T> = {
  [K in keyof T]-?: DefinedValue<T, K> extends any[] ? K : never;
}[keyof T];

/**
 * Gets the element type of an array type.
 */
export type ElementOf<T> = T extends (infer U)[] ? U : never;
