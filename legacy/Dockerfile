### Builder
# GraalVM Native Image with Java 25. Override jdk.tls.disabledAlgorithms to
# re-enable TLS_RSA cipher suites and SHA-1 handshake signatures required by
# Oracle 19c TCPS (see java.security.override and issue #1020).
# NOTE: -Djava.security.properties applies process-wide (all TLS connections
# including JWKS/issuer metadata HTTPS). Temporary workaround until the Oracle
# DB certificate chain is upgraded to stronger keys and modern signatures.
FROM ghcr.io/graalvm/native-image-community:25.0.2 AS build

# Copy
WORKDIR /app
COPY pom.xml mvnw ./
COPY src ./src
COPY .mvn/ ./.mvn

# Build
RUN ./mvnw -Pnative package -DskipTests -Dskip.unit.tests=true -Dspring-boot.run.profiles=prod

### Deployer
FROM gcr.io/distroless/java-base:nonroot
ARG PORT=9090

# Copy
WORKDIR /app
COPY --from=build /app/target/nr-waste-plus-legacy ./nr-waste-plus-legacy
COPY --from=build /app/target/classes/java.security.override ./java.security.override

# User, port and health check
USER 1001
EXPOSE ${PORT}
HEALTHCHECK CMD curl -f http://localhost:${PORT}/actuator/health | grep '"status":"UP"'

ENV SPRING_PROFILES_ACTIVE=container,prod

# Startup
ENTRYPOINT ["/app/nr-waste-plus-legacy", "-Djava.security.properties=/app/java.security.override"]