-- ============================================================================
-- V1.0.1__user_preferences.sql — wasteplus.user_preferences: JSONB preference
-- store with optimistic-lock revision. No dedicated schema issue; serves the
-- default search-preference stories #6, #169 and #243.
-- ============================================================================
CREATE TABLE IF NOT EXISTS wasteplus.user_preferences(
    user_id character varying(60) NOT NULL,
    preferences jsonb DEFAULT '{}'::jsonb NOT NULL,
    updated_date timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    revision bigint DEFAULT 1 NOT NULL
    );

COMMENT ON TABLE wasteplus.user_preferences IS 'Table to store user preferences in JSON format';

COMMENT ON COLUMN wasteplus.user_preferences.user_id IS 'Unique identifier for the user';

COMMENT ON COLUMN wasteplus.user_preferences.preferences IS 'User preferences stored in JSON format';

COMMENT ON COLUMN wasteplus.user_preferences.updated_date IS 'Timestamp of the last update to the user preferences';

COMMENT ON COLUMN wasteplus.user_preferences.revision IS 'Revision number for optimistic locking';

ALTER TABLE ONLY wasteplus.user_preferences
    DROP CONSTRAINT IF EXISTS user_preferences_pk CASCADE;

ALTER TABLE ONLY wasteplus.user_preferences
    ADD CONSTRAINT user_preferences_pk PRIMARY KEY (user_id);
