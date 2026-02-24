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

export const reportingUnitSearchParametersConverterMap: ReportingUnitSearchParametersConverterMap =
  {
    clientNumbers: (value) => value?.map((item) => item.code),
  };

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

export const getCodeDescriptionArrayConverter = (
  key: keyof ReportingUnitSearchParametersViewDto,
) => {
  const converter: CodeDescriptionArrayConverter<typeof key> =
    customCodeDescriptionArrayConverterMap[key] || defaultCodeDescriptionArrayConverter;

  return converter;
};

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
