import { Search } from '@carbon/react';
import { type FC } from 'react';

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
      onClear={() => onChange('')}
      onChange={(e) => onChange(e.currentTarget.value)}
      onBlur={(e) => onChange(e.currentTarget.value)}
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
