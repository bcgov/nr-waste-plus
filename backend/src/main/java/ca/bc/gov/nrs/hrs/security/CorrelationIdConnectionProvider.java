package ca.bc.gov.nrs.hrs.security;

import io.micrometer.tracing.Span;
import io.micrometer.tracing.Tracer;
import java.sql.Array;
import java.sql.Blob;
import java.sql.CallableStatement;
import java.sql.Clob;
import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.NClob;
import java.sql.PreparedStatement;
import java.sql.SQLClientInfoException;
import java.sql.SQLException;
import java.sql.SQLWarning;
import java.sql.SQLXML;
import java.sql.Savepoint;
import java.sql.ShardingKey;
import java.sql.Statement;
import java.sql.Struct;
import java.util.Map;
import java.util.Properties;
import java.util.concurrent.Executor;
import org.hibernate.engine.jdbc.connections.spi.ConnectionProvider;
import org.hibernate.service.spi.Configurable;
import org.hibernate.service.spi.Stoppable;

/**
 * Hibernate {@link ConnectionProvider} decorator that injects the current B3 trace id
 * into the PostgreSQL transaction via {@code app.correlation_id} GUC.
 *
 * <p>When a Micrometer {@link Span} is active, {@link #getConnection()} wraps the pooled
 * JDBC connection in {@link DeferredCorrelationIdConnection}, which binds the trace id
 * lazily — immediately before the <em>first</em> statement execution rather than at
 * acquisition time. This ordering matters: Hibernate acquires the connection
 * <em>before</em> applying the caller's isolation level, so binding eagerly would open
 * the PostgreSQL transaction block first and make any subsequent
 * {@code SET TRANSACTION ISOLATION LEVEL ...} fail with <em>"Cannot change transaction
 * isolation level in the middle of a transaction"</em>. Deferring the
 * {@code SELECT set_config('app.correlation_id', ?, true)} keeps it inside whatever
 * transaction Spring/Hibernate has established, including
 * {@code Isolation.SERIALIZABLE} paths.</p>
 *
 * <p>The third argument {@code true} marks the setting local to the current transaction,
 * so PostgreSQL discards it on commit/rollback and no reset bookkeeping is required.
 * When no span is present the raw connection is returned unchanged and
 * {@code current_setting('app.correlation_id', true)} stays {@code NULL}.</p>
 *
 * <p>GraalVM-safe: no reflection, no proxies, no runtime bytecode. All dependencies are
 * constructor-injected; delegate lifecycle methods are forwarded verbatim.</p>
 */
public class CorrelationIdConnectionProvider implements ConnectionProvider, Configurable, Stoppable {

  private static final String BIND_CORRELATION_ID =
      "SELECT set_config('app.correlation_id', ?, true)";

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
    Connection connection = delegate.getConnection();
    Span span = tracer.currentSpan();
    if (span == null || span.isNoop()) {
      return connection;
    }
    String traceId = span.context().traceId();
    if (traceId == null || traceId.isBlank()) {
      return connection;
    }
    return new DeferredCorrelationIdConnection(connection, traceId);
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

  /**
   * JDBC {@link Connection} wrapper that binds the correlation id just-in-time, on the
   * first statement-producing call, inside the transaction already configured by the
   * caller. Every other operation is forwarded verbatim.
   */
  private final class DeferredCorrelationIdConnection implements Connection {

    private final Connection target;
    private final String traceId;
    private boolean bound;

    private DeferredCorrelationIdConnection(Connection target, String traceId) {
      this.target = target;
      this.traceId = traceId;
    }

    /** Executes the transaction-local GUC binding exactly once, before first use. */
    private void bindOnce() throws SQLException {
      if (bound) {
        return;
      }
      bound = true;
      try (PreparedStatement statement = target.prepareStatement(BIND_CORRELATION_ID)) {
        statement.setString(1, traceId);
        statement.execute();
      }
    }

    @Override
    public Statement createStatement() throws SQLException {
      bindOnce();
      return target.createStatement();
    }

    @Override
    public Statement createStatement(int resultSetType, int resultSetConcurrency)
        throws SQLException {
      bindOnce();
      return target.createStatement(resultSetType, resultSetConcurrency);
    }

    @Override
    public Statement createStatement(int resultSetType, int resultSetConcurrency,
        int resultSetHoldability) throws SQLException {
      bindOnce();
      return target.createStatement(resultSetType, resultSetConcurrency, resultSetHoldability);
    }

    @Override
    public PreparedStatement prepareStatement(String sql) throws SQLException {
      bindOnce();
      return target.prepareStatement(sql);
    }

    @Override
    public PreparedStatement prepareStatement(String sql, int resultSetType,
        int resultSetConcurrency) throws SQLException {
      bindOnce();
      return target.prepareStatement(sql, resultSetType, resultSetConcurrency);
    }

    @Override
    public PreparedStatement prepareStatement(String sql, int resultSetType,
        int resultSetConcurrency, int resultSetHoldability) throws SQLException {
      bindOnce();
      return target.prepareStatement(sql, resultSetType, resultSetConcurrency,
          resultSetHoldability);
    }

    @Override
    public PreparedStatement prepareStatement(String sql, int autoGeneratedKeys)
        throws SQLException {
      bindOnce();
      return target.prepareStatement(sql, autoGeneratedKeys);
    }

    @Override
    public PreparedStatement prepareStatement(String sql, int[] columnIndexes)
        throws SQLException {
      bindOnce();
      return target.prepareStatement(sql, columnIndexes);
    }

    @Override
    public PreparedStatement prepareStatement(String sql, String[] columnNames)
        throws SQLException {
      bindOnce();
      return target.prepareStatement(sql, columnNames);
    }

    @Override
    public CallableStatement prepareCall(String sql) throws SQLException {
      bindOnce();
      return target.prepareCall(sql);
    }

    @Override
    public CallableStatement prepareCall(String sql, int resultSetType,
        int resultSetConcurrency) throws SQLException {
      bindOnce();
      return target.prepareCall(sql, resultSetType, resultSetConcurrency);
    }

    @Override
    public CallableStatement prepareCall(String sql, int resultSetType,
        int resultSetConcurrency, int resultSetHoldability) throws SQLException {
      bindOnce();
      return target.prepareCall(sql, resultSetType, resultSetConcurrency, resultSetHoldability);
    }

    @Override
    public String nativeSQL(String sql) throws SQLException {
      return target.nativeSQL(sql);
    }

    @Override
    public void setAutoCommit(boolean autoCommit) throws SQLException {
      target.setAutoCommit(autoCommit);
    }

    @Override
    public boolean getAutoCommit() throws SQLException {
      return target.getAutoCommit();
    }

    @Override
    public void commit() throws SQLException {
      target.commit();
    }

    @Override
    public void rollback() throws SQLException {
      target.rollback();
    }

    @Override
    public void rollback(Savepoint savepoint) throws SQLException {
      target.rollback(savepoint);
    }

    @Override
    public void close() throws SQLException {
      target.close();
    }

    @Override
    public boolean isClosed() throws SQLException {
      return target.isClosed();
    }

    @Override
    public DatabaseMetaData getMetaData() throws SQLException {
      return target.getMetaData();
    }

    @Override
    public void setReadOnly(boolean readOnly) throws SQLException {
      target.setReadOnly(readOnly);
    }

    @Override
    public boolean isReadOnly() throws SQLException {
      return target.isReadOnly();
    }

    @Override
    public void setCatalog(String catalog) throws SQLException {
      target.setCatalog(catalog);
    }

    @Override
    public String getCatalog() throws SQLException {
      return target.getCatalog();
    }

    @Override
    public void setTransactionIsolation(int level) throws SQLException {
      target.setTransactionIsolation(level);
    }

    @Override
    public int getTransactionIsolation() throws SQLException {
      return target.getTransactionIsolation();
    }

    @Override
    public void setTypeMap(Map<String, Class<?>> map) throws SQLException {
      target.setTypeMap(map);
    }

    @Override
    public Map<String, Class<?>> getTypeMap() throws SQLException {
      return target.getTypeMap();
    }

    @Override
    public void setHoldability(int holdability) throws SQLException {
      target.setHoldability(holdability);
    }

    @Override
    public int getHoldability() throws SQLException {
      return target.getHoldability();
    }

    @Override
    public Savepoint setSavepoint() throws SQLException {
      bindOnce();
      return target.setSavepoint();
    }

    @Override
    public Savepoint setSavepoint(String name) throws SQLException {
      bindOnce();
      return target.setSavepoint(name);
    }

    @Override
    public void releaseSavepoint(Savepoint savepoint) throws SQLException {
      target.releaseSavepoint(savepoint);
    }

    @Override
    public Clob createClob() throws SQLException {
      return target.createClob();
    }

    @Override
    public Blob createBlob() throws SQLException {
      return target.createBlob();
    }

    @Override
    public NClob createNClob() throws SQLException {
      return target.createNClob();
    }

    @Override
    public SQLXML createSQLXML() throws SQLException {
      return target.createSQLXML();
    }

    @Override
    public boolean isValid(int timeout) throws SQLException {
      return target.isValid(timeout);
    }

    @Override
    public void setClientInfo(String name, String value) throws SQLClientInfoException {
      target.setClientInfo(name, value);
    }

    @Override
    public void setClientInfo(Properties properties) throws SQLClientInfoException {
      target.setClientInfo(properties);
    }

    @Override
    public String getClientInfo(String name) throws SQLException {
      return target.getClientInfo(name);
    }

    @Override
    public Properties getClientInfo() throws SQLException {
      return target.getClientInfo();
    }

    @Override
    public Array createArrayOf(String typeName, Object[] elements) throws SQLException {
      return target.createArrayOf(typeName, elements);
    }

    @Override
    public Struct createStruct(String typeName, Object[] attributes) throws SQLException {
      return target.createStruct(typeName, attributes);
    }

    @Override
    public void setSchema(String schema) throws SQLException {
      target.setSchema(schema);
    }

    @Override
    public String getSchema() throws SQLException {
      return target.getSchema();
    }

    @Override
    public void abort(Executor executor) throws SQLException {
      target.abort(executor);
    }

    @Override
    public void setNetworkTimeout(Executor executor, int milliseconds) throws SQLException {
      target.setNetworkTimeout(executor, milliseconds);
    }

    @Override
    public int getNetworkTimeout() throws SQLException {
      return target.getNetworkTimeout();
    }

    @Override
    public SQLWarning getWarnings() throws SQLException {
      return target.getWarnings();
    }

    @Override
    public void clearWarnings() throws SQLException {
      target.clearWarnings();
    }

    @Override
    public boolean setShardingKeyIfValid(ShardingKey shardingKey, ShardingKey superShardingKey,
        int timeout) throws SQLException {
      return target.setShardingKeyIfValid(shardingKey, superShardingKey, timeout);
    }

    @Override
    public boolean setShardingKeyIfValid(ShardingKey shardingKey, int timeout)
        throws SQLException {
      return target.setShardingKeyIfValid(shardingKey, timeout);
    }

    @Override
    public void setShardingKey(ShardingKey shardingKey) throws SQLException {
      target.setShardingKey(shardingKey);
    }

    @Override
    public void setShardingKey(ShardingKey shardingKey, ShardingKey superShardingKey)
        throws SQLException {
      target.setShardingKey(shardingKey, superShardingKey);
    }

    @Override
    public <T> T unwrap(Class<T> iface) throws SQLException {
      return iface.cast(target.unwrap(iface));
    }

    @Override
    public boolean isWrapperFor(Class<?> iface) throws SQLException {
      return target.isWrapperFor(iface);
    }
  }
}
