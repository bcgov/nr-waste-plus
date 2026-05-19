import { type FC, type ReactElement } from 'react';

import './index.scss';

type TagWrapperProps = {
  /** The content to wrap. */
  readonly children: ReactElement;
  /** The tag element to display alongside the children. */
  readonly tag: ReactElement;
  /** Position of the tag relative to the children. Defaults to `'right'`. */
  readonly position?: 'left' | 'right';
  /** When `false`, the tag is hidden entirely. Defaults to `true`. */
  readonly enabled?: boolean;
};

/**
 * Wraps a child React element with any tag element, either to the left or right.
 *
 * Useful for annotating headers, labels, or UI components with a status tag
 * while preserving layout flexibility. The tag to render is passed explicitly
 * via the `tag` prop, making this component reusable across any tag type.
 *
 * @returns The wrapped element with the tag positioned according to `position`.
 */
const TagWrapper: FC<TagWrapperProps> = ({ children, tag, position = 'right', enabled = true }) => (
  <div className="tag-wrapper">
    {position === 'right' ? (
      <>
        {children}
        {enabled && tag}
      </>
    ) : (
      <>
        {enabled && tag}
        {children}
      </>
    )}
  </div>
);

export default TagWrapper;
