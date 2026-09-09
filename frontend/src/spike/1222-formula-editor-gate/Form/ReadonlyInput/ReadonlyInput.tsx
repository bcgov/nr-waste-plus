import React from 'react';

export interface ReadonlyInputProps {
  value?: string | number;
  label?: string;
  id?: string;
  className?: string;
}

export const ReadonlyInput: React.FC<ReadonlyInputProps> = ({ value, label, id, className }) => {
  return (
    <div className={className} aria-readonly="true">
      {label && <label htmlFor={id}>{label}</label>}
      <output id={id} aria-live="polite">{String(value ?? '')}</output>
    </div>
  );
};

export default ReadonlyInput;
