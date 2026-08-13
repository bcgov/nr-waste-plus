ALTER TABLE hrs.district_volume
    ADD COLUMN IF NOT EXISTS config_type VARCHAR(50) NOT NULL DEFAULT 'DISTRICT_VOLUME';

UPDATE hrs.district_volume
    SET config_type = 'DISTRICT_VOLUME'
    WHERE config_type IS NULL;

CREATE INDEX IF NOT EXISTS idx_district_volume_config_type
    ON hrs.district_volume (config_type);
