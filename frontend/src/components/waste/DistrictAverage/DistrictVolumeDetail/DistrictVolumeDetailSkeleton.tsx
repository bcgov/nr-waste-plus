import { Column, SkeletonText } from '@carbon/react';

/**
 * Skeleton component for the District Volume Table Detail page.
 *
 * Displays loading skeletons mimicking the same layout as the detail views
 * ({@link InteriorDetailView} / {@link CoastDetailView}) — two header fields
 * at the top, two below, and a full-width tab area at the bottom.
 *
 * Rendered while the actual data is being fetched via the React Query hook.
 *
 * @returns The skeleton component.
 */
const DistrictVolumeDetailSkeleton: React.FC = () => {
  return (
    <>
      <Column
        lg={4}
        md={4}
        sm={4}
        className="district-volume-detail__start-date"
        data-testid="skeleton-start-date"
      >
        <SkeletonText heading width="120px" />
        <SkeletonText width="80px" />
      </Column>
      <Column
        lg={12}
        md={4}
        sm={4}
        className="district-volume-detail__end-date"
        data-testid="skeleton-end-date"
      >
        <SkeletonText heading width="120px" />
        <SkeletonText width="80px" />
      </Column>
      <Column
        lg={4}
        md={4}
        sm={4}
        className="district-volume-detail__table-level-factor"
        data-testid="skeleton-table-level-factor"
      >
        <SkeletonText heading width="200px" />
        <SkeletonText width="80px" />
      </Column>
      <Column
        lg={12}
        md={4}
        sm={4}
        className="district-volume-detail__heli-multiplier"
        data-testid="skeleton-heli-multiplier"
      >
        <SkeletonText heading width="120px" />
        <SkeletonText width="80px" />
      </Column>
      <Column
        lg={16}
        md={4}
        sm={4}
        className="district-volume-detail__zones"
        data-testid="skeleton-zones"
      >
        <SkeletonText heading width="160px" />
        <SkeletonText width="100%" />
        <SkeletonText width="100%" />
        <SkeletonText width="100%" />
      </Column>
    </>
  );
};

export default DistrictVolumeDetailSkeleton;
