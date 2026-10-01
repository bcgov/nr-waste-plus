import { Column, SkeletonText } from '@carbon/react';
import { type FC } from 'react';

/**
 * Loading skeleton for the reporting-unit block details page.
 *
 * Mirrors the loaded layout — page banner, reporting-unit summary card and the
 * waste-volume results region — using {@link SkeletonText} placeholders so the
 * transition to real content does not shift the layout.
 *
 * Rendered only after the request has been in flight for at least 300 ms
 * (see `SKELETON_DELAY_MS`), so fast responses never flash a skeleton.
 *
 * @returns The block details skeleton, as grid columns ready for the layout `Grid`.
 */
const BlockDetailsSkeleton: FC = () => (
  <>
    <Column
      lg={16}
      md={8}
      sm={4}
      className="rublock-column__banner"
      data-testid="block-details-skeleton"
    >
      <SkeletonText heading width="260px" />
      <SkeletonText width="320px" />
    </Column>
    <Column
      lg={16}
      md={8}
      sm={4}
      className="rublock-column__summary"
      data-testid="block-details-skeleton-summary"
    >
      <SkeletonText heading width="200px" />
      <div className="rublock-skeleton-fields">
        <SkeletonText width="160px" />
        <SkeletonText width="120px" />
        <SkeletonText width="180px" />
        <SkeletonText width="100px" />
        <SkeletonText width="160px" />
        <SkeletonText width="140px" />
      </div>
    </Column>
    <Column
      lg={16}
      md={8}
      sm={4}
      className="rublock-column__results"
      data-testid="block-details-skeleton-results"
    >
      <SkeletonText heading width="180px" />
      <SkeletonText width="100%" />
      <SkeletonText width="100%" />
      <SkeletonText width="100%" />
    </Column>
  </>
);

export default BlockDetailsSkeleton;
