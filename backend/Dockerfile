### Builder
FROM ghcr.io/graalvm/native-image-community:25.0.2 AS build

# Copy
WORKDIR /app
COPY pom.xml mvnw ./
COPY src ./src
COPY .mvn/ ./.mvn

# Build
# Commit SHA of the source revision; the build context has no .git, so the
# pipeline passes it in and it is baked into info.app.commit.
ARG GIT_COMMIT=unknown
RUN microdnf install -y unzip && microdnf clean all
RUN ./mvnw -Pnative package -DskipTests -Dskip.unit.tests=true -Dspring-boot.run.profiles=prod -Dgit.commit.id=${GIT_COMMIT}

### Deployer
FROM gcr.io/distroless/java-base:nonroot
ARG PORT=8080
# Source revision of the image. The build stage has no .git in its context, so
# the pipeline passes the SHA in and it is baked into the artifact's build
# metadata as well.
ARG GIT_COMMIT=unknown
LABEL org.opencontainers.image.revision="${GIT_COMMIT}"

# Copy
WORKDIR /app
COPY --from=build /app/target/nr-waste-plus-backend ./nr-waste-plus-backend

# User, port and health check
USER 1001
EXPOSE ${PORT}
HEALTHCHECK CMD curl -f http://localhost:${PORT}/actuator/health | grep '"status":"UP"'

ENV SPRING_PROFILES_ACTIVE=container

# Startup
ENTRYPOINT ["/app/nr-waste-plus-backend"]
