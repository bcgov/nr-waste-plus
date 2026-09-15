### Builder
# Use GraalVM Native Image with Java 25. Override jdk.tls.disabledAlgorithms to
# re-enable TLS_RSA cipher suites and SHA-1 handshake signatures required by
# Oracle 19c TCPS (see issue #1020).
FROM ghcr.io/graalvm/native-image-community:25.0.2 AS build

# Re-enable TLS_RSA cipher suites and SHA-1 signatures for Oracle 19c TCPS
RUN sed -i '/^jdk.tls.disabledAlgorithms=/,/[^\]$/c\jdk.tls.disabledAlgorithms=SSLv3, TLSv1, TLSv1.1, DTLSv1.0, RC4, DES, MD5withRSA, DH keySize < 1024, EC keySize < 224, 3DES_EDE_CBC, anon, NULL, ECDH' $JAVA_HOME/conf/security/java.security

# Copy
WORKDIR /app
COPY pom.xml mvnw ./
COPY src ./src
COPY .mvn/ ./.mvn

# Build
RUN sed -i 's/\r$//' ./mvnw && ./mvnw -Pnative package -DskipTests -Dskip.unit.tests=true -Dspring-boot.run.profiles=prod

### Deployer
FROM gcr.io/distroless/java21-debian12:nonroot
ARG PORT=9090

# Copy
WORKDIR /app
COPY --from=build /app/target/nr-waste-plus-legacy ./nr-waste-plus-legacy

# User, port and health check
USER 1001
EXPOSE ${PORT}
HEALTHCHECK CMD curl -f http://localhost:${PORT}/actuator/health | grep '"status":"UP"'

ENV SPRING_PROFILES_ACTIVE=container,prod

# Startup
ENTRYPOINT ["/app/nr-waste-plus-legacy"]