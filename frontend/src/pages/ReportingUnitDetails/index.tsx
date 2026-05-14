import { Column, Grid } from '@carbon/react';
import { useLoaderData } from '@tanstack/react-router';
import { type FC } from 'react';

import type { ReportingUnitDto } from '@/services/types';

import PageNotification from '@/components/core/PageNotification';
import PageTitle from '@/components/core/PageTitle';
import EmptyValueTag from '@/components/core/Tags/EmptyValueTag';
import LegacyDataTag from '@/components/core/Tags/LegacyDataTag';
import TagWrapper from '@/components/core/Tags/TagWrapper';
import UnderConstructionTag from '@/components/core/Tags/UnderConstructionTag';
import ReadonlyInput from '@/components/Form/ReadonlyInput';
import TooltipRoleBasedRedirectLinkTag from '@/components/waste/TooltipRoleBasedRedirectLinkTag';
import { Role } from '@/context/auth/types';
import { env } from '@/env';

import './index.scss';

const ReportingUnitDetailsPage: FC = () => {
  const data = useLoaderData({ strict: false }) as ReportingUnitDto;

  return (
    <>
      <Column lg={16} md={8} sm={4} className="rudetail-column__banner">
        <TagWrapper
          position="right"
          tag={
            <LegacyDataTag
              url={`/waste101ReportUnitDetailsAction.do?dataBean.p_reporting_unit_id=${data.id}`}
            />
          }
        >
          <TagWrapper position="right" tag={<UnderConstructionTag type="page" />}>
            <PageTitle
              title={`Reporting Unit no.: ${data.id}`}
              subtitle="Start a new waste submission by creating a reporting unit"
            />
          </TagWrapper>
        </TagWrapper>
      </Column>
      <Column lg={16} md={8} sm={4} className="notification-column">
        <PageNotification eventTarget="ru-details" />
      </Column>
      <Column lg={16} md={8} sm={4} className="rudetail-column__body">
        <Grid>
          <Column max={4} xlg={8} lg={8} md={4} sm={4}>
            <ReadonlyInput label="Client name">
              <span className="rudetail-text">{data.client.description}</span>
            </ReadonlyInput>
          </Column>
          <Column max={2} xlg={4} lg={4} md={4} sm={4}>
            <ReadonlyInput label="Client ID">
              <TooltipRoleBasedRedirectLinkTag
                tooltip="View client details"
                text={data.client.code}
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
              <EmptyValueTag value={data.grade.description} />
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
    </>
  );
};

export default ReportingUnitDetailsPage;
