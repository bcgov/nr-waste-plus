package ca.bc.gov.nrs.hrs.security;

import io.micrometer.tracing.Span;
import io.micrometer.tracing.Tracer;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.util.Map;
import org.hibernate.engine.jdbc.connections.spi.ConnectionProvider;
import org.hibernate.service.spi.Configurable;
import org.hibernate.service.spi.Stoppable;

/**
 * Hibernate {@link ConnectionProvider} decorator that injects the current B3 trace id
 * into the PostgreSQL session via {@code app.correlation_id} GUC.
 *
 * <p>On each {@link #getConnection()} call the delegate is asked for a JDBC connection
 * and, when a current Micrometer {@link Span} exists, its {@code traceId} is bound
 * transaction-scoped via {@code SELECT set_config('app.correlation_id', ?, true)}.
 * The third argument {@code true} marks the setting as local to the current transaction
 * ({@code is_local}), so PostgreSQL automatically discards it on commit/rollback and no
 * explicit reset is required. When no span is present the connection is returned
 * unchanged, leaving {@code current_setting('app.correlation_id', true)} as {@code NULL}
 * for the audit trigger to handle.</p>
 *
 * <p>GraalVM-safe: no reflection, no proxies, no runtime bytecode. All dependencies are
 * constructor-injected; delegate lifecycle methods are forwarded verbatim.</p>
 */
public class CorrelationIdConnectionProvider implements ConnectionProvider, Configurable, Stoppable {

  private final ConnectionProvider delegate;
  private final Tracer tracer;

  /**
   * Creates a decorating provider.
   *
   * @param delegate the real pooled provider (e.g. {@code DatasourceConnectionProviderImpl})
   * @param tracer Micrometer tracer providing the current B3 span
   */
  public CorrelationIdConnectionProvider(ConnectionProvider delegate, Tracer tracer) {
    this.delegate = delegate;
    this.tracer = tracer;
  }

  @Override
  public Connection getConnection() throws SQLException {
    Connection conn = delegate.getConnection();
    Span span = tracer.currentSpan();
    if (span != null && !span.isNoop()) {
      String traceId = span.context().traceId();
      if (traceId != null && !traceId.isBlank()) {
        try {
          // Hibernate calls getConnection() before it begins the JDBC transaction. Keep the
          // connection non-autocommit so the transaction-local setting remains active until
          // Hibernate commits or rolls back the transaction.
          conn.setAutoCommit(false);
          try (PreparedStatement ps =
              conn.prepareStatement("SELECT set_config('app.correlation_id', ?, true)")) {
            ps.setString(1, traceId);
            ps.execute();
          }
        } catch (SQLException exception) {
          delegate.closeConnection(conn);
          throw exception;
        }
      }
    }
    return conn;
  }

  @Override
  public void configure(Map<String, Object> properties) {
    ((Configurable) delegate).configure(properties);
  }

  @Override
  public void stop() {
    ((Stoppable) delegate).stop();
  }

  @Override
  public void closeConnection(Connection conn) throws SQLException {
    delegate.closeConnection(conn);
  }

  @Override
  public boolean supportsAggressiveRelease() {
    return delegate.supportsAggressiveRelease();
  }

  @Override
  public boolean isUnwrappableAs(Class<?> unwrapType) {
    return delegate.isUnwrappableAs(unwrapType);
  }

  @Override
  public <T> T unwrap(Class<T> unwrapType) {
    return delegate.unwrap(unwrapType);
  }
}
