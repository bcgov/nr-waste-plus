/**
 * District-selection list item as rendered by the DistrictSelection
 * components (a UI view type — built client-side from wire data, never
 * serialized).
 */
export type DistrictType = {
  id: string;
  name: string;
  kind: string;
  acronym?: string;
};
