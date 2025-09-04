### Builder
FROM ghcr.io/graalvm/native-image-community:24.0.2@sha256:3101e115bb4b363791245fcb9f595bcec1f63ca8c5a380273f4cd91e05bfe6ff AS build

# Copy
WORKDIR /app
COPY pom.xml mvnw ./
COPY src ./src
COPY .mvn/ ./.mvn

# Build
RUN ./mvnw -Pnative package -DskipTests -Dskip.unit.tests=true -Dspring-boot.run.profiles=prod

### Deployer
FROM gcr.io/distroless/java-base:nonroot@sha256:72548e08b006f2511ea406518e851a6f0656270ca710dc025b94010fd7843b95
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