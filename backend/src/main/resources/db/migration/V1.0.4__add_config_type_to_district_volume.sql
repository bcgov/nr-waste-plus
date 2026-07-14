ALTER TABLE district_volume
    ADD COLUMN config_type VARCHAR(50) NOT NULL DEFAULT 'DISTRICT_VOLUME';

UPDATE district_volume SET config_type = 'DISTRICT_VOLUME';

CREATE INDEX idx_district_volume_config_type
    ON district_volume (config_type);