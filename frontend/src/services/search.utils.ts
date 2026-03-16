import type {
  CodeDescriptionDto,
  ReportingUnitSearchParametersDto,
  ReportingUnitSearchParametersViewDto,
  ReportingUnitSearchParametersViewSpecific,
} from './search.types';

type ReportingUnitSearchParametersConverter<
  K extends keyof ReportingUnitSearchParametersViewSpecific,
> = (value: ReportingUnitSearchParametersViewDto[K]) => ReportingUnitSearchParametersDto[K];

type ReportingUnitSearchParametersConverterMap = {
  [field in keyof ReportingUnitSearchParametersViewSpecific]-?: ReportingUnitSearchParametersConverter<field>;
};

/**
 * Field-specific converters from view-model search values to backend DTO values.
 */
export const reportingUnitSearchParametersConverterMap: ReportingUnitSearchParametersConverterMap =
  {
    clientNumbers: (value) => value?.map((item) => item.code),
  };

/**
 * Narrows a search view-model key to one that requires custom conversion.
 *
 * @param key The key being inspected.
 * @returns True when the key maps to a field-specific converter.
 */
const isViewSpecificKey = (
  key: keyof ReportingUnitSearchParametersViewDto,
): key is keyof ReportingUnitSearchParametersViewSpecific => {
  return key in reportingUnitSearchParametersConverterMap;
};

type CodeDescriptionArrayConverter<K extends keyof ReportingUnitSearchParametersViewDto> = (
  value: CodeDescriptionDto[] | undefined,
) => ReportingUnitSearchParametersViewDto[K];

type CodeDescriptionArrayConverterMap = {
  [field in keyof ReportingUnitSearchParametersViewDto]: CodeDescriptionArrayConverter<field>;
};

/**
 * The default CodeDescriptionDto[] converter, which converts it to string[].
 * @param value - the array to be converted
 * @returns an array of `code` from each `value`'s item
 */
const defaultCodeDescriptionArrayConverter: CodeDescriptionArrayConverter<
  keyof ReportingUnitSearchParametersViewDto
> = (value) => value?.map((item) => item.code);

/**
 * Key-mapped custom converters from CodeDescriptionDto[] to the corresponding property type.
 *
 * Specially useful when property's type is different from string[], which the default converter
 * already converts to.
 */
const customCodeDescriptionArrayConverterMap: CodeDescriptionArrayConverterMap = {
  clientNumbers: (value) => value,
};

/**
 * Returns the code-description converter for a specific search form field.
 *
 * @param key The search form field name.
 * @returns The converter used to normalize that field.
 */
export const getCodeDescriptionArrayConverter = (
  key: keyof ReportingUnitSearchParametersViewDto,
) => {
  const converter: CodeDescriptionArrayConverter<typeof key> =
    customCodeDescriptionArrayConverterMap[key] || defaultCodeDescriptionArrayConverter;

  return converter;
};

/**
 * Converts the search form view model into the plain DTO expected by the API.
 *
 * @param viewData The search form state.
 * @returns A backend-ready search parameter DTO.
 */
export const reportingUnitSearchParametersView2Plain = (
  viewData: ReportingUnitSearchParametersViewDto,
): ReportingUnitSearchParametersDto => {
  const data: ReportingUnitSearchParametersDto = {};

  const setDataValue = <K extends keyof ReportingUnitSearchParametersDto>(
    key: K,
    value: ReportingUnitSearchParametersDto[K],
  ) => {
    data[key] = value;
  };

  const setDataValueWithConverter = <K extends keyof ReportingUnitSearchParametersViewSpecific>(
    key: K,
    value: ReportingUnitSearchParametersViewSpecific[K],
    converter: ReportingUnitSearchParametersConverter<K>,
  ) => {
    data[key] = converter(value);
  };

  for (const rawKey in viewData) {
    const key = rawKey as keyof ReportingUnitSearchParametersViewDto;
    if (isViewSpecificKey(key)) {
      /*
      While the type casting below might not be necessary right now, it will be, as soon as
      ReportingUnitSearchParametersViewSpecific has more than 1 property.
      */
      const converter = reportingUnitSearchParametersConverterMap[ //NOSONAR
        key
      ] as ReportingUnitSearchParametersConverter<typeof key>;
      setDataValueWithConverter(key, viewData[key], converter);
    } else {
      setDataValue(key, viewData[key]);
    }
  }
  return data;
};
