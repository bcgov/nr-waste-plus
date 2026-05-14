import { Column, Grid } from '@carbon/react';
import { type FC } from 'react';

import type { ReportingUnitDto } from '@/services/reportingUnit.types';

import EmptyValueTag from '@/components/core/Tags/EmptyValueTag';
import ReadonlyInput from '@/components/Form/ReadonlyInput';
import TooltipRoleBasedRedirectLinkTag from '@/components/waste/TooltipRoleBasedRedirectLinkTag';
import { Role } from '@/context/auth/types';
import { env } from '@/env';

import './index.scss';

type ReportingUnitDetailsTombstoneProps = {
  data: ReportingUnitDto;
};

/**
 * Tombstone panel displaying read-only key fields for a reporting unit.
 *
 * Renders client name, client number (with an IDIR-gated link to client details),
 * client status, district, grade, and sampling option inside a bordered grid layout.
 *
 * @param props Component props.
 * @param props.data The reporting unit data to display.
 * @returns A read-only tombstone panel for the reporting unit.
 */
const ReportingUnitDetailsTombstone: FC<ReportingUnitDetailsTombstoneProps> = ({ data }) => (
  <Column lg={16} md={8} sm={4} className="rudetail-column__body">
    <Grid>
      <Column max={4} xlg={8} lg={8} md={4} sm={4}>
        <ReadonlyInput label="Client name">
          <span className="rudetail-text">{data.client.description}</span>
        </ReadonlyInput>
      </Column>
      <Column max={2} xlg={4} lg={4} md={4} sm={4}>
        <ReadonlyInput label="Client number">
          <TooltipRoleBasedRedirectLinkTag
            tooltip="View client details"
            text={data.client.code || ''}
            url={`${env.VITE_CLIENT_BASE_URL}/clients/details/${data.client.code}`}
            allowedRoles={[Role.IDIR]}
          />
        </ReadonlyInput>
      </Column>
      <Column max={2} xlg={4} lg={4} md={4} sm={4}>
        <ReadonlyInput label="Client status">
          <span className="rudetail-text">{data.clientStatus.description}</span>
        </ReadonlyInput>
      </Column>
      <Column max={4} xlg={6} lg={6} md={4} sm={4}>
        <ReadonlyInput label="District">
          <span className="rudetail-text">
            {data.district.code} - {data.district.description}
          </span>
        </ReadonlyInput>
      </Column>
      <Column max={2} xlg={5} lg={5} md={4} sm={4}>
        <ReadonlyInput label="Grades">
          <EmptyValueTag value={data.grade.description || ''} />
        </ReadonlyInput>
      </Column>
      <Column max={2} xlg={5} lg={5} md={4} sm={4}>
        <ReadonlyInput label="Sampling option">
          <span className="rudetail-text">
            {data.sampling.code} - {data.sampling.description}
          </span>
        </ReadonlyInput>
      </Column>
    </Grid>
  </Column>
);

export default ReportingUnitDetailsTombstone;
