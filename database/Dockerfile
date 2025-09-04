FROM postgres:13.22@sha256:aedabd10a05c7304233d006a186a42d7d350b11e702d227dc09a99882dafa142

HEALTHCHECK --interval=35s --timeout=4s CMD pg_isready -d db_prod
 
# Non-privileged user
USER postgres
