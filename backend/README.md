# Harvest Residue System - Waste

[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=nr-waste-plus-backend&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=nr-waste-plus-backend)

Report logging waste and residue data for billing and cut control

## Development

For more developer information visit the [documentation](https://github.com/bcgov/nr-waste-plus/wiki/Backend-Structure) for a broader documentation.

### Object Storage (MinIO / S3)

The application uses the `ObjectStorageProvider` abstraction for attachment storage. For local development, an S3-compatible MinIO service is provided via Docker Compose:

```bash
# Start MinIO and auto-seed the default bucket
docker compose up -d minio minio-init
```

- **API Endpoint**: `http://localhost:9000` (host) / `http://minio:9000` (Docker network)
- **Web Console**: `http://localhost:9001`
- **Default Bucket**: `nr-waste` (persisted in named volume `minio_data`)

#### Environment Variables

Set non-default credentials in your `.env` file or environment (never committed to version control):

| Environment Variable | Description | Local / Dev Default |
| --- | --- | --- |
| `MINIO_ROOT_USER` / `OBJECT_STORAGE_ACCESS_KEY` | MinIO root / S3 access key | (Set in `.env` / environment) |
| `MINIO_ROOT_PASSWORD` / `OBJECT_STORAGE_SECRET_KEY` | MinIO root / S3 secret key | (Set in `.env` / environment) |
| `OBJECT_STORAGE_ENDPOINT` | Custom S3/MinIO endpoint URL | `http://localhost:9000` |
| `OBJECT_STORAGE_BUCKET` | Target bucket name | `nr-waste` |
| `OBJECT_STORAGE_REGION` | Signing region | `ca-central-1` |
| `S3_FORCE_PATH_STYLE` | Enables path-style addressing on the S3 client | `true` |

For integration tests, `MinioContainerSupport` provisions on-demand Testcontainers with isolated bucket namespaces. For extended architectural documentation, visit the [project wiki](https://github.com/bcgov/nr-waste-plus/wiki/Backend-Structure).

