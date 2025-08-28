import { type FC } from 'react';

const EmptyValueTag: FC<{ value: string }> = ({ value }) => {
  if (value) {
    return <span>{value}</span>;
  } else {
    return <span>-</span>;
  }
};

export default EmptyValueTag;
