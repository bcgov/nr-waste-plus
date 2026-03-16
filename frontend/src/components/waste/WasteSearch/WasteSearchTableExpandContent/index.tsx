import { Column, DefinitionTooltip, Grid } from '@carbon/react';
import { useQuery } from '@tanstack/react-query';
import { type FC } from 'react';

import EmptyValueTag from '@/components/core/Tags/EmptyValueTag';
import YesNoTag from '@/components/core/Tags/YesNoTag';
import ReadonlyInput from '@/components/Form/ReadonlyInput';
import RedirectLinkTag from '@/components/waste/RedirectLinkTag';
import { env } from '@/env';
import API from '@/services/APIs';

type WasteSearchTableExpandContentProps = {
  rowId: string;
};

/**
 * Loads and displays the expanded reporting-unit detail panel for a search result row.
 *
 * @param props The expand-content props.
 * @param props.rowId Composite row identifier used to resolve backend IDs.
 * @returns The expanded row content.
 */
const WasteSearchTableExpandContent: FC<WasteSearchTableExpandContentProps> = ({ rowId }) => {
  /**
   * Extracts a numeric identifier from the composite row ID.
   *
   * @param position The segment position within the row ID.
   * @returns The parsed numeric value or `null` when unavailable.
   */
  const extractNumericValue = (position: number): number | null => {
    const parts = String(rowId).split('-');
    return parts[position] === 'N/A' ? null : Number(parts[position]);
  };

  const ruId = extractNumericValue(1);
  const wasteAssessmentAreaId = extractNumericValue(3);

  const { data, isLoading } = useQuery({
    queryKey: ['search', 'ru', 'ex', rowId, ruId, wasteAssessmentAreaId],
    queryFn: () => API.search.getReportingUnitSearchExpand(ruId!, wasteAssessmentAreaId!),
    enabled: ruId !== null && wasteAssessmentAreaId !== null,
    staleTime: Infinity,
  });

  return (
    <Grid>
      {/* Visible on All */}
      <Column lg={2} md={2} sm={1}>
        <ReadonlyInput
          label="Licence number"
          id={`${rowId}-license-number`}
          isNumber={false}
          showSkeleton={isLoading}
        >
          {data?.licenseNo ?? ''}
        </ReadonlyInput>
      </Column>
      {/* Visible on All */}
      <Column lg={2} md={2} sm={1}>
        <ReadonlyInput
          label="Cutting Permit"
          id={`${rowId}-cutting-permit`}
          isNumber={false}
          showSkeleton={isLoading}
        >
          {data?.cuttingPermit ?? ''}
        </ReadonlyInput>
      </Column>
      {/* Visible on Lg+ */}
      <Column lg={2} md={0} sm={0}>
        <ReadonlyInput
          label="Timber Mark"
          id={`${rowId}-timber-mark`}
          isNumber={false}
          showSkeleton={isLoading}
        >
          {data?.timberMark ?? ''}
        </ReadonlyInput>
      </Column>
      {/* Visible on Lg+ */}
      <Column lg={1} md={0} sm={0}>
        <ReadonlyInput
          label="Mark area"
          id={`${rowId}-mark-area`}
          isNumber={false}
          showSkeleton={isLoading}
        >
          {data?.markArea ? `${data.markArea} ha` : ''}
        </ReadonlyInput>
      </Column>
      {/* Visible on Lg+ */}
      <Column lg={2} md={0} sm={0}>
        <ReadonlyInput
          label="Status"
          id={`${rowId}-status`}
          isNumber={false}
          showSkeleton={isLoading}
        >
          {data?.status?.description ?? ''}
        </ReadonlyInput>
      </Column>
      {/* Visible on All */}
      <Column lg={1} md={2} sm={1}>
        <ReadonlyInput
          label="Net area"
          id={`${rowId}-net-area`}
          isNumber={true}
          showSkeleton={isLoading}
        >
          {data?.netArea ? `${data.netArea} ha` : ''}
        </ReadonlyInput>
      </Column>

      {/* Empty column for spacing on md and sm */}
      <Column lg={0} md={2} sm={1}></Column>

      {/* Visible on md and sm */}
      <Column lg={0} md={2} sm={1}>
        <ReadonlyInput
          label="Timber Mark"
          id={`${rowId}-timber-mark-expand`}
          isNumber={false}
          showSkeleton={isLoading}
        >
          {data?.timberMark ?? ''}
        </ReadonlyInput>
      </Column>
      {/* Visible on md and sm */}
      <Column lg={0} md={2} sm={1}>
        <ReadonlyInput
          label="Mark area"
          id={`${rowId}-mark-area-expand`}
          isNumber={false}
          showSkeleton={isLoading}
        >
          {data?.markArea ? `${data.markArea} ha` : ''}
        </ReadonlyInput>
      </Column>
      {/* Visible on md and sm */}
      <Column lg={0} md={4} sm={2}>
        <ReadonlyInput
          label="Status"
          id={`${rowId}-status-expand`}
          isNumber={false}
          showSkeleton={isLoading}
        >
          {data?.status?.description ?? ''}
        </ReadonlyInput>
      </Column>
      {/* Visible on md and sm */}
      {data?.secondaryMarks && data.secondaryMarks.length > 0 && (
        <>
          <Column lg={0} md={2} sm={1}>
            <ReadonlyInput
              label="Secondary marks"
              displayLabel={false}
              id={`${rowId}-secondary-marks-expand`}
              isNumber={false}
              showSkeleton={isLoading}
            >
              {data.secondaryMarks.map((mark, index) => (
                <p key={`${rowId}-secondary-mark-expand-${index}`}>{mark.mark}</p>
              ))}
            </ReadonlyInput>
          </Column>
          <Column lg={0} md={2} sm={1}>
            <ReadonlyInput
              label="Secondary Area"
              displayLabel={false}
              id={`${rowId}-secondary-areas-expand`}
              isNumber={false}
              showSkeleton={isLoading}
            >
              {data.secondaryMarks.map((mark, index) => (
                <p key={`${rowId}-secondary-mark-area-expand-${index}`}>{mark.area} ha</p>
              ))}
            </ReadonlyInput>
          </Column>
          <Column lg={0} md={4} sm={2}>
            <ReadonlyInput
              label="Secondary Status"
              displayLabel={false}
              id={`${rowId}-secondary-statuses-expand`}
              isNumber={false}
              showSkeleton={isLoading}
            >
              {data.secondaryMarks.map((mark, index) => (
                <p key={`${rowId}-secondary-mark-status-expand-${index}`}>
                  {mark.status.description}
                </p>
              ))}
            </ReadonlyInput>
          </Column>
        </>
      )}

      <Column lg={2} md={2} sm={1}>
        <ReadonlyInput
          label="Exempted (Yes/No)"
          id={`${rowId}-exempted`}
          isNumber={false}
          showSkeleton={isLoading}
        >
          <YesNoTag value={data?.exempted} />
        </ReadonlyInput>
      </Column>
      <Column lg={2} md={2} sm={1}>
        <ReadonlyInput
          label="Submitter"
          id={`${rowId}-submitter`}
          isNumber={false}
          showSkeleton={isLoading}
        >
          {data?.submitter}
        </ReadonlyInput>
      </Column>
      <Column lg={2} md={4} sm={2}>
        <ReadonlyInput
          label="Attachments and comments"
          id={`${rowId}-attachments-comments`}
          isNumber={false}
          showSkeleton={isLoading}
        >
          {Number.isFinite(wasteAssessmentAreaId as number) ? (
            <DefinitionTooltip definition={'Go to Waste 303 page'} align="bottom" openOnHover>
              <RedirectLinkTag
                text="Link"
                url={`${env.VITE_LEGACY_BASE_URL}/waste303SubmissionAgreementAction.do?readOnlyMode=Y&dataBean.p_waste_assessment_area_id=${wasteAssessmentAreaId}`}
              />
            </DefinitionTooltip>
          ) : (
            <EmptyValueTag value="" />
          )}
        </ReadonlyInput>
      </Column>

      {/* Visible on lg+ */}
      {data?.secondaryMarks && data.secondaryMarks.length > 0 && (
        <>
          <Column lg={4} md={0} sm={0}></Column>
          <Column lg={2} md={0} sm={0}>
            <ReadonlyInput
              label="Secondary marks"
              displayLabel={false}
              id={`${rowId}-secondary-marks`}
              isNumber={false}
              showSkeleton={isLoading}
            >
              {data.secondaryMarks.map((mark, index) => (
                <p key={`${rowId}-secondary-mark-${index}`}>{mark.mark}</p>
              ))}
            </ReadonlyInput>
          </Column>
          <Column lg={1} md={0} sm={0}>
            <ReadonlyInput
              label="Secondary Area"
              displayLabel={false}
              id={`${rowId}-secondary-areas`}
              isNumber={false}
              showSkeleton={isLoading}
            >
              {data.secondaryMarks.map((mark, index) => (
                <p key={`${rowId}-secondary-mark-area-${index}`}>{mark.area} ha</p>
              ))}
            </ReadonlyInput>
          </Column>
          <Column lg={2} md={0} sm={0}>
            <ReadonlyInput
              label="Secondary Status"
              displayLabel={false}
              id={`${rowId}-secondary-statuses`}
              isNumber={false}
              showSkeleton={isLoading}
            >
              {data.secondaryMarks.map((mark, index) => (
                <p key={`${rowId}-secondary-mark-status-${index}`}>{mark.status.description}</p>
              ))}
            </ReadonlyInput>
          </Column>
          <Column lg={7} md={0} sm={0}></Column>
        </>
      )}

      <Column lg={16} md={8} sm={4}>
        <ReadonlyInput
          label="Comment:"
          id={`${rowId}-comment`}
          isNumber={false}
          showSkeleton={isLoading}
        >
          <EmptyValueTag value={data?.comments ?? ''} />
        </ReadonlyInput>
      </Column>
      <Column lg={2} md={2} sm={4}>
        <p>No. of blocks in RU: {data?.totalBlocks ?? 0}</p>
      </Column>
      <Column lg={14} md={6} sm={4}>
        <p>No. of secondary marks in block: {data?.totalChildren ?? 0}</p>
      </Column>
    </Grid>
  );
};

export default WasteSearchTableExpandContent;
