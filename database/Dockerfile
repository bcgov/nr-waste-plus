FROM postgres:17.4-alpine

HEALTHCHECK --interval=35s --timeout=4s CMD pg_isready -U "${POSTGRES_USER}" -d "${POSTGRES_DB}"
 
# Non-privileged user
USER postgres
