import { type FC, type ReactElement } from 'react';

import './index.scss';

type TagWrapperProps = {
  readonly children: ReactElement;
  readonly tag: ReactElement;
  readonly position?: 'left' | 'right';
};

/**
 * Wraps a child React element with any tag element, either to the left or right.
 *
 * Useful for annotating headers, labels, or UI components with a status tag
 * while preserving layout flexibility. The tag to render is passed explicitly
 * via the `tag` prop, making this component reusable across any tag type.
 *
 * @param {TagWrapperProps} props - The component props
 * @param {ReactElement} props.children - The content to wrap
 * @param {ReactElement} props.tag - The tag element to display alongside the children
 * @param {'left' | 'right'} [props.position='right'] - Position of the tag relative to the children
 *
 * @returns {JSX.Element} A wrapped element with the provided tag
 */
const TagWrapper: FC<TagWrapperProps> = ({ children, tag, position = 'right' }) => (
  <div className="tag-wrapper">
    {position === 'right' ? (
      <>
        {children}
        {tag}
      </>
    ) : (
      <>
        {tag}
        {children}
      </>
    )}
  </div>
);

export default TagWrapper;
