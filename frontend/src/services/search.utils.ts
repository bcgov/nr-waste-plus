import type {
  ReportingUnitSearchParametersDto,
  ReportingUnitSearchParametersViewDto,
  ReportingUnitSearchParametersViewSpecific,
} from './search.types';

type ReportingUnitSearchParametersConverter<
  T extends keyof ReportingUnitSearchParametersViewSpecific,
> = (value: ReportingUnitSearchParametersViewDto[T]) => ReportingUnitSearchParametersDto[T];

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
