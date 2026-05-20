/**
 * Typed string-literal union of every in-tree route path registered in `routeTree.tsx`.
 *
 * Guard files cannot import from `routeTree.tsx` (circular dependency), so they cannot
 * benefit from the TanStack Router module augmentation that makes `useNavigate` fully
 * typed. Using this union as the parameter type for {@link navigateInTree} ensures that
 * call sites are checked against known paths while keeping the import graph acyclic.
 *
 * `/login` is intentionally absent — it is an external Cognito URL, not an in-tree route.
 */
export type InTreePath =
  | '/'
  | '/dashboard'
  | '/search'
  | '/clients'
  | '/no-role'
  | '/unauthorized'
  | `/reporting-units/${number}`;

/**
 * Typed navigate helper for in-tree route paths.
 *
 * Guard files sit inside the route tree's import graph and cannot import from
 * `routeTree.tsx`, so the TanStack Router module augmentation is not resolved when
 * these files are type-checked. This helper centralises the single unavoidable
 * `as any` escape hatch while keeping call sites typed against {@link InTreePath}.
 *
 * For truly external destinations (e.g. `/login`), use the navigate function
 * directly with an explanatory comment.
 *
 * @param navigate - The navigate function returned by `useNavigate()`.
 * @param to - A known in-tree path.
 * @param opts - Optional navigation options (`replace`, `search`).
 *
 * @example
 * navigateInTree(navigate, '/dashboard', { replace: true });
 */
export function navigateInTree(
  // The navigate fn's `to` type is unresolved in guard files due to circular imports.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  navigate: (opts: any) => void,
  to: InTreePath,
  opts?: { replace?: boolean; search?: Record<string, unknown> },
): void {
  navigate({ to, ...opts });
}
