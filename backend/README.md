# Harvest Residue System - Waste

[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=nr-waste-plus-backend&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=nr-waste-plus-backend)

Report logging waste and residue data for billing and cut control

## Development

For more developer information visit the [documentation](https://github.com/bcgov/nr-waste-plus/wiki/Backend-Structure) for a broader documentation.

### Object Storage (MinIO / S3)

The application uses the `ObjectStorageProvider` abstraction for the attachment upload and download lifecycle. The environment split is:
- **Production / Deployed**: AWS S3 with standard credentials and virtual-host addressing.
- **Local / Testcontainers / Dev / PR**: MinIO with path-style addressing (`S3_FORCE_PATH_STYLE=true`), avoiding any dependency on real AWS credentials.

#### Local MinIO via Docker Compose

MinIO and its automated bucket-seeding service (`minio-init`) are defined in `docker-compose.yml`:

```bash
# Start MinIO and auto-seed the default bucket
docker compose up -d minio minio-init
```

- **API Endpoint**: `http://localhost:9000` (from host) / `http://minio:9000` (within Docker network)
- **Web Console**: `http://localhost:9001`
- **Default Bucket**: `nr-waste` (automatically created by `minio-init`)

#### Environment Variables

Credentials must be non-default and sourced from environment variables or a local `.env` file (never committed to version control):

| Environment Variable | Description | Local / Dev Default |
| --- | --- | --- |
| `MINIO_ROOT_USER` / `OBJECT_STORAGE_ACCESS_KEY` | MinIO root / S3 access key | (Must be set in `.env` / environment) |
| `MINIO_ROOT_PASSWORD` / `OBJECT_STORAGE_SECRET_KEY` | MinIO root / S3 secret key | (Must be set in `.env` / environment) |
| `OBJECT_STORAGE_ENDPOINT` | Custom S3/MinIO endpoint URL | `http://localhost:9000` |
| `OBJECT_STORAGE_BUCKET` | Target bucket name | `nr-waste` |
| `OBJECT_STORAGE_REGION` | Signing region | `ca-central-1` |
| `S3_FORCE_PATH_STYLE` | Enables path-style addressing (required for MinIO) | `true` |

#### Integration Tests & CI Isolation

- **Local Integration Tests**: When running tests locally without an external MinIO instance, `MinioContainerSupport` automatically starts a Testcontainers MinIO instance with dynamic credentials and an isolated bucket (`nr-waste-test-<UUID>`).
- **CI / PR Pipeline**: The PR pipeline provisions an isolated MinIO instance per job run with unique credentials and a dedicated bucket namespace (`nr-waste-pr-<run_id>-<run_attempt>`), preventing state collision between parallel PR runs. Tests execute against this provisioned instance when `OBJECT_STORAGE_ENDPOINT` is present.

