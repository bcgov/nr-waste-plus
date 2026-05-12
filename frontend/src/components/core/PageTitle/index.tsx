import { Breadcrumb, BreadcrumbItem, Column } from '@carbon/react';
import { useNavigate } from '@tanstack/react-router';
import { useEffect, useMemo, type FC } from 'react';

import { type BreadCrumbType } from './types';

import Subtitle from '@/components/core/Subtitle';
import UnderConstructionTag from '@/components/core/Tags/UnderConstructionTag';
import { usePageTitle } from '@/context/pageTitle/usePageTitle';

import './index.scss';

/**
 * Props for the {@link PageTitle} component.
 */
interface PageTitleProps {
  /** Main page title rendered as an `<h1>`. */
  readonly title: string;
  /** Optional subtitle rendered below the heading. */
  readonly subtitle?: string;
  /** When `true`, displays an "Under Construction" tag next to the title. */
  readonly experimental?: boolean;
  /** Optional slot for action elements (e.g. buttons) rendered beside the heading. */
  readonly children?: React.ReactNode;
  /** Ordered breadcrumb trail. Each item is a clickable link except the last. */
  readonly breadCrumbs?: BreadCrumbType[];
}

/**
 * Renders the standard page heading block used across routed screens.
 *
 * The component combines an optional breadcrumb trail, the page `<h1>`, an
 * optional {@link Subtitle}, an optional {@link UnderConstructionTag}, and an
 * action slot rendered beside the title.
 *
 * On mount and whenever the derived breadcrumb title changes, the visible title
 * is also pushed into the page title context via {@link usePageTitle} so shell-
 * level consumers stay in sync.
 *
 * @param props - Component props.
 * @param props.title - Main heading text.
 * @param props.subtitle - Optional subtitle rendered beneath the heading.
 * @param props.experimental - Shows the "Under Construction" tag when `true`.
 * @param props.children - Optional action elements rendered beside the heading.
 * @param props.breadCrumbs - Ordered breadcrumb entries; each entry is a `{ name, path }` pair.
 * @returns The rendered page title column.
 */
const PageTitle: FC<PageTitleProps> = ({
  title,
  subtitle,
  experimental,
  children,
  breadCrumbs,
}: PageTitleProps) => {
  const navigate = useNavigate();
  const { setPageTitle } = usePageTitle();

  const breadcrumbTitle = useMemo(
    () => breadCrumbs?.map((crumb) => crumb.name).join(' - ') ?? '',
    [breadCrumbs],
  );

  useEffect(() => {
    setPageTitle(breadcrumbTitle || title, 2);
  }, [title, setPageTitle, breadcrumbTitle]);

  return (
    <Column className="page-title-col" sm={4} md={8} lg={16}>
      {breadCrumbs?.length ? (
        <Breadcrumb className="page-title-breadcrumb">
          {breadCrumbs.map((crumb) => (
            <BreadcrumbItem
              key={crumb.name}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              onClick={() => void navigate({ to: crumb.path as any })}
            >
              {crumb.name}
            </BreadcrumbItem>
          ))}
        </Breadcrumb>
      ) : null}
      <div className="page-title-container">
        <div className="title-container">
          <h1>{title}</h1>
          {children}
          {experimental ? <UnderConstructionTag type="page" /> : null}
        </div>
        {subtitle ? <Subtitle text={subtitle} /> : null}
      </div>
    </Column>
  );
};

export default PageTitle;
