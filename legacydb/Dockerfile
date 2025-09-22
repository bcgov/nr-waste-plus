FROM gvenzl/oracle-free:23.9-slim-faststart

# Copy the custom scripts we need to the image with proper permissions
COPY --chown=oracle:oracle --chmod=755 removeDatabase ${ORACLE_BASE}/removeDatabase

# Switch to root once for all permission changes
USER root

# Make /opt/oracle and its contents group-writable in a single layer
RUN chown -R oracle:oinstall /opt/oracle \
    && chmod -R g+rw /opt/oracle \
    && find /opt/oracle -type d -exec chmod g+x {} \;

# Switch back to oracle user
USER oracle

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 CMD ["sh", "-c", "${ORACLE_BASE}/healthcheck.sh >/dev/null || exit 1"]

ENTRYPOINT ["container-entrypoint.sh"]
