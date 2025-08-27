package ca.bc.gov.nrs.hrs.mappers;

public interface AbstractSingleMapper<D, P> {
  D fromProjection(P projection);
}
