import type { SpeciesCompositionRow } from '@/services/speciesComposition.types';
import type { FC } from 'react';

import SpeciesCompositionDetailMatrix from '@/components/waste/SpeciesCompositionDetailView/SpeciesCompositionDetailMatrix';

/**
 * Props for the SpeciesCompositionReviewTable component.
 */
interface SpeciesCompositionReviewTableProps {
  /** Parsed species composition rows to display in the review table. */
  readonly 'rows': SpeciesCompositionRow[];
  /** Optional test identifier. */
  readonly 'data-testid'?: string;
}

/**
 * Review table displaying parsed species composition data.
 *
 * Uses the same TableResource matrix as the saved detail page so the review
 * accurately represents the table that will be persisted.
 *
 * @returns A detail-style species composition matrix.
 */
const SpeciesCompositionReviewTable: FC<SpeciesCompositionReviewTableProps> = ({
  rows,
  'data-testid': testId,
}) => {
  return (
    <div className="species-composition-review-table" data-testid={testId}>
      <h3 className="species-composition-review-table__title">Review uploaded data</h3>
      <SpeciesCompositionDetailMatrix rows={rows} />
    </div>
  );
};

export default SpeciesCompositionReviewTable;
