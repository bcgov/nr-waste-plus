import { Column, Grid } from '@carbon/react';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState, type FC } from 'react';

import EmptyValueTag from '@/components/core/Tags/EmptyValueTag';
import YesNoTag from '@/components/core/Tags/YesNoTag';
import ReadonlyInput from '@/components/Form/ReadonlyInput';
import RedirectLinkTag from '@/components/waste/RedirectLinkTag';
import { env } from '@/env';
import API from '@/services/APIs';

type WasteSearchTableExpandContentProps = {
  rowId: string;
};

const WasteSearchTableExpandContent: FC<WasteSearchTableExpandContentProps> = ({ rowId }) => {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const extractNumericValue = (position: number): number | null => {
    const parts = String(rowId).split('-');
    return parts[position] === 'N/A' ? null : Number(parts[position]);
  };

  const [ruId, setRuId] = useState<number | null>(extractNumericValue(1));
  const [blockId, setBlockId] = useState<number | null>(extractNumericValue(3));

  const { data, isLoading } = useQuery({
    queryKey: ['search', 'ru', 'ex', rowId, ruId, blockId],
    queryFn: () => API.search.getReportingUnitSearchExpand(ruId!, blockId!),
    enabled: ruId !== null && blockId !== null,
    staleTime: Infinity,
  });

  useEffect(() => {
    setRuId(extractNumericValue(1));
    setBlockId(extractNumericValue(3));
  }, [extractNumericValue, rowId]);

  return (
    <Grid>
      <Column lg={2} md={8} sm={4}>
        <ReadonlyInput
          label="License Number"
          id={`${rowId}-license-number`}
          isNumber={false}
          showSkeleton={isLoading}
        >
          {data?.licenseNo ?? ''}
        </ReadonlyInput>
      </Column>
      <Column lg={2} md={8} sm={4}>
        <ReadonlyInput
          label="Cutting Permit"
          id={`${rowId}-cutting-permit`}
          isNumber={false}
          showSkeleton={isLoading}
        >
          {data?.cuttingPermit ?? ''}
        </ReadonlyInput>
      </Column>
      <Column lg={2} md={8} sm={4}>
        <ReadonlyInput
          label="Timber Mark"
          id={`${rowId}-timber-mark`}
          isNumber={false}
          showSkeleton={isLoading}
        >
          {data?.timberMark ?? ''}
        </ReadonlyInput>
      </Column>
      <Column lg={2} md={8} sm={4}>
        <ReadonlyInput
          label="Exempted (Yes/No)"
          id={`${rowId}-exempted`}
          isNumber={false}
          showSkeleton={isLoading}
        >
          <YesNoTag value={data?.exempted} />
        </ReadonlyInput>
      </Column>
      <Column lg={2} md={8} sm={4}>
        <ReadonlyInput
          label="Multi-mark (Yes/No)"
          id={`${rowId}-multi-mark`}
          isNumber={false}
          showSkeleton={isLoading}
        >
          <YesNoTag value={data?.multiMark} />
        </ReadonlyInput>
      </Column>
      <Column lg={2} md={8} sm={4}>
        <ReadonlyInput
          label="Net area"
          id={`${rowId}-net-area`}
          isNumber={true}
          showSkeleton={isLoading}
        >
          {data?.netArea}
        </ReadonlyInput>
      </Column>
      <Column lg={2} md={8} sm={4}>
        <ReadonlyInput
          label="Submitter"
          id={`${rowId}-submitter`}
          isNumber={false}
          showSkeleton={isLoading}
        >
          {data?.submitter}
        </ReadonlyInput>
      </Column>
      <Column lg={2} md={8} sm={4}>
        <ReadonlyInput
          label="Attachments"
          id={`${rowId}-attachments`}
          isNumber={false}
          showSkeleton={isLoading}
        >
          {data?.attachment.code ? (
            <RedirectLinkTag
              text="Link"
              url={`${env.VITE_LEGACY_BASE_URL}/waste303SubmissionAgreementAction.do?dataBean.p_waste_assessment_area_id=${blockId}&dataBean.p_revision_count=1&statusAction=Approve`}
            />
          ) : (
            <EmptyValueTag value={data?.attachment.code ?? ''} />
          )}
        </ReadonlyInput>
      </Column>
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
      <Column lg={16} md={8} sm={4}>
        <p>Total blocks in reporting unit: {data?.totalBlocks ?? 0}</p>
      </Column>
    </Grid>
  );
};

export default WasteSearchTableExpandContent;
