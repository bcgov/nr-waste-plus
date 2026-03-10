import { Search } from '@carbon/react';
import { useEffect, useRef, type FC } from 'react';

/**
 * Props for the SearchInput component.
 *
 * @property {string} id - Unique identifier for the search input.
 * @property {string} label - Accessible label for the search input.
 * @property {string} placeholder - Placeholder text for the input field.
 * @property {string} value - The current value of the search input.
 * @property {(value: string) => void} onChange - Callback fired when the input value changes.
 */
type SearchInputProps = {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  onSearch?: () => void;
};

/**
 * SearchInput is a reusable search field built on Carbon's Search component.
 * It provides a controlled input for search queries, with custom mouse tracking logic and keyboard handling for accessibility.
 *
 * @param {SearchInputProps} props - The props for the component.
 * @returns {JSX.Element} The rendered SearchInput component.
 */
const SearchInput: FC<SearchInputProps> = ({
  id,
  label,
  placeholder,
  onChange,
  value,
  onSearch,
}) => {
  const lastEmittedValueRef = useRef(value);

  useEffect(() => {
    lastEmittedValueRef.current = value;
  }, [value]);

  const emitChange = (nextValue: string) => {
    lastEmittedValueRef.current = nextValue;
    onChange(nextValue);
  };

  return (
    <Search
      aria-label={placeholder}
      data-testid={id}
      role="searchbox"
      size="md"
      placeholder={placeholder}
      labelText={label}
      closeButtonLabelText="Clear search input"
      id={id}
      onClear={() => emitChange('')}
      onChange={(e) => emitChange(e.currentTarget.value)}
      onBlur={(e) => {
        const nextValue = e.currentTarget.value;
        if (nextValue !== lastEmittedValueRef.current) {
          emitChange(nextValue);
        }
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.currentTarget.blur();
          if (onSearch) {
            onSearch();
          }
        }
      }}
      value={value}
    />
  );
};

export default SearchInput;
