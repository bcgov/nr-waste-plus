# syntax=docker/dockerfile:1.28

### Builder
FROM ghcr.io/graalvm/native-image-community:25.0.2 AS build

WORKDIR /app

# Dependency layer. Resolved before the sources are copied so the download is
# cached across source-only changes. -Pnative keeps the native-image plugin
# dependencies in this layer too, otherwise they are downloaded again in the
# compile layer below.
COPY .mvn/ ./.mvn/
COPY mvnw pom.xml ./
RUN microdnf install -y unzip && microdnf clean all \
    && chmod +x mvnw \
    && ./mvnw -B -Pnative dependency:go-offline

# Sources
COPY src/ ./src/

# Build
# Commit SHA of the source revision; the build context has no .git, so the
# pipeline passes it in and it is baked into info.app.commit.
ARG GIT_COMMIT=unknown
RUN ./mvnw -B -Pnative package -DskipTests -Dskip.unit.tests=true \
    -Dspring-boot.run.profiles=prod -Dgit.commit.id=${GIT_COMMIT}

### Tini - static PID 1 for signal forwarding and child reaping
FROM ghcr.io/graalvm/native-image-community:25.0.2 AS tini
ARG TARGETARCH
RUN microdnf install -y curl && microdnf clean all \
    && curl -fsSL -o /tini \
       "https://github.com/krallin/tini/releases/download/v0.19.0/tini-static-${TARGETARCH}" \
    && case "${TARGETARCH}" in \
         amd64) echo "c5b0666b4cb676901f90dfcb37106783c5fe2077b04590973b885950611b30ee  /tini" | sha256sum -c - ;; \
         arm64) echo "eae1d3aa50c48fb23b8cbdf4e369d0910dfc538566bfd09df89a774aa84a48b9  /tini" | sha256sum -c - ;; \
         *) echo "unsupported architecture: ${TARGETARCH}" >&2; exit 1 ;; \
       esac

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
COPY --from=tini --chmod=755 /tini /usr/local/bin/tini
COPY --from=build --chmod=755 /app/target/nr-waste-plus-backend ./nr-waste-plus-backend

# User, port
USER nonroot
EXPOSE ${PORT}

ENV SPRING_PROFILES_ACTIVE=container

# Startup
ENTRYPOINT ["/usr/local/bin/tini", "--"]
CMD ["/app/nr-waste-plus-backend"]
