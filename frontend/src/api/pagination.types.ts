export type SortDirectionType = 'ASC' | 'DESC' | 'NONE';

export type NestedKeyOf<T> = {
  [K in keyof T & (string | number)]: T[K] extends object
    ? `${K}` | `${K}.${NestedKeyOf<T[K]>}`
    : `${K}`;
}[keyof T & (string | number)];

export type ValueByPath<T, P extends string> = P extends `${infer K}.${infer Rest}`
  ? K extends keyof T
    ? ValueByPath<T[K], Rest>
    : never
  : P extends keyof T
    ? T[P]
    : never;

export type PageableRequest<T> = {
  page: number;
  size: number;
  sort?: Array<`${NestedKeyOf<T>},${SortDirectionType}`>;
};
