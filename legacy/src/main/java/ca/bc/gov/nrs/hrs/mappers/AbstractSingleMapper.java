package ca.bc.gov.nrs.hrs.mappers;

/**
 * Mapper contract that converts a projection/result object into a DTO.
 *
 * <p>Implementations map a single projection type (usually returned by JPA queries or
 * database projections) to a corresponding DTO used by the application or API. This
 * interface keeps mappers focused on a single-item conversion and is typically implemented
 * by MapStruct or hand-written mappers.</p>
 *
 * @param <D> the DTO type produced by the mapper
 * @param <P> the projection/source type consumed by the mapper
 */
public interface AbstractSingleMapper<D, P> {
  /**
   * Convert the provided projection instance to a DTO.
   *
   * @param projection the source projection object, may be null in some mapping contexts
   * @return a mapped DTO instance corresponding to {@code projection}, or null when input is null
   */
  D fromProjection(P projection);
}
