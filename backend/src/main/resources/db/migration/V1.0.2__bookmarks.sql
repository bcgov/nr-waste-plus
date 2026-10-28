-- ============================================================================
-- V1.0.2__bookmarks.sql — Issue #779: wasteplus.user_bookmarks, the reporting
-- units a user has bookmarked (also the offline-mode reference list), keyed
-- by user + reporting unit with a reporting-unit lookup index.
-- ============================================================================
CREATE TABLE IF NOT EXISTS wasteplus.user_bookmarks(
    user_id character varying(60) NOT NULL,
    reporting_unit_id bigint NOT NULL
    );

COMMENT ON TABLE wasteplus.user_bookmarks IS '
Table to store user bookmarked reporting units.
Users can bookmark multiple reporting units.
Each reporting unit can be bookmarked by multiple users.
Bookmarked reporting units are also used as reference for the offline mode.';

COMMENT ON COLUMN wasteplus.user_bookmarks.user_id IS 'Unique identifier for the user';

COMMENT ON COLUMN wasteplus.user_bookmarks.reporting_unit_id IS '
Unique identifier for the reporting unit that the user has bookmarked.
This is a foreign key referencing the reporting unit in the oracle database.';

ALTER TABLE ONLY wasteplus.user_bookmarks
    DROP CONSTRAINT IF EXISTS user_bookmarks_pk CASCADE;

ALTER TABLE ONLY wasteplus.user_bookmarks
    ADD CONSTRAINT user_bookmarks_pk PRIMARY KEY (user_id, reporting_unit_id);

CREATE INDEX IF NOT EXISTS idx_user_bookmarks_reporting_unit_id ON wasteplus.user_bookmarks USING btree(reporting_unit_id);
