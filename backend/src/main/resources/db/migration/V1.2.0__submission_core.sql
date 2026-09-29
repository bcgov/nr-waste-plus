-- ============================================================================
-- V1.2.0__submission_core.sql — Issue #1215: District Average submission
-- core (block, block_area_segment, block_mark, district_average_block,
-- reporting_unit with sequences, PKs, FKs and indexes). V1.1.3 column
-- additions from #1272 are folded into the table definitions; documentation
-- and naming standardization from #1300.
-- ============================================================================
CREATE TABLE IF NOT EXISTS hrs.block(
    block_id bigint NOT NULL,
    reporting_unit_id bigint NOT NULL,
    block_type character varying(32) NOT NULL,
    is_draft boolean DEFAULT true NOT NULL,
    plc_date date,
    revision bigint DEFAULT 1 NOT NULL,
    created_by character varying(128) NOT NULL,
    updated_by character varying(128) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL
    );

COMMENT ON TABLE hrs.block IS 'Submission block belonging to a reporting unit. Equivalent to a "cut block" in legacy/FTA terminology — renamed for consistency with app-wide usage.';

CREATE TABLE IF NOT EXISTS hrs.block_area_segment(
    block_area_segment_id bigint NOT NULL,
    block_id bigint NOT NULL,
    source character varying(32) NOT NULL,
    area_ha numeric(12, 3),
    road_length_m numeric(12, 3),
    road_width_m numeric(12, 3),
    created_by character varying(128) NOT NULL,
    updated_by character varying(128) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL,
    block_mark_id bigint,
    starting_area_ha numeric(12, 3),
    net_waste_area_ha numeric(12, 3)
    );

COMMENT ON TABLE hrs.block_area_segment IS 'Area and road segments used by a submission block.';

CREATE SEQUENCE IF NOT EXISTS hrs.block_area_segment_id_seq START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE hrs.block_area_segment_id_seq OWNED BY hrs.block_area_segment.block_area_segment_id;

CREATE SEQUENCE IF NOT EXISTS hrs.block_id_seq START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE hrs.block_id_seq OWNED BY hrs.block.block_id;

CREATE TABLE IF NOT EXISTS hrs.block_mark(
    block_mark_id bigint NOT NULL,
    block_id bigint NOT NULL,
    mark_type character varying(32) NOT NULL,
    sequence_no integer NOT NULL,
    mark character varying(64) NOT NULL,
    validation_status character varying(32),
    created_by character varying(128) NOT NULL,
    updated_by character varying(128) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL,
    forest_file_id character varying(128),
    timber_mark character varying(128),
    cutting_permit_id character varying(128),
    cut_block_id character varying(128),
    CONSTRAINT block_mark_sequence_ck CHECK ((((mark_type)::text <> 'SECONDARY'::text) OR ((sequence_no >= 1) AND (sequence_no <= 5))))
    );

COMMENT ON TABLE hrs.block_mark IS 'Typed forest and road marks associated with a submission block. "Block mark" is equivalent to "timber mark" in legacy/FTA terminology — renamed for consistency with app-wide usage.';

CREATE SEQUENCE IF NOT EXISTS hrs.block_mark_id_seq START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE hrs.block_mark_id_seq OWNED BY hrs.block_mark.block_mark_id;

CREATE TABLE IF NOT EXISTS hrs.district_average_block(
    district_average_block_id bigint NOT NULL,
    benchmark_zone character varying(32),
    maturity character varying(32),
    retention_percentage numeric(5, 2),
    criteria integer[],
    coast_ground_based_area_ha numeric(12, 3),
    coast_helicopter_area_ha numeric(12, 3),
    revision bigint DEFAULT 1 NOT NULL,
    created_by character varying(128) NOT NULL,
    updated_by character varying(128) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL,
    harvest_status_code character varying(32),
    bec_zone character varying(32),
    bec_subvariant character varying(32),
    has_dispersed_retention boolean NOT NULL,
    dispersed_retention_pct numeric(5, 2),
    primary_logging_complete_date date,
    is_heli_logging boolean NOT NULL,
    cable_yarding_area_ha numeric(12, 3),
    skyline_logging_area_ha numeric(12, 3)
    );

COMMENT ON TABLE hrs.district_average_block IS 'District Average-specific block extension.';

CREATE TABLE IF NOT EXISTS hrs.reporting_unit(
    reporting_unit_id bigint NOT NULL,
    client_number character varying(8) NOT NULL,
    client_locn_code character varying(32) NOT NULL,
    org_unit_no character varying(3) NOT NULL,
    revision bigint DEFAULT 1 NOT NULL,
    created_by character varying(128) NOT NULL,
    updated_by character varying(128) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL
    );

COMMENT ON TABLE hrs.reporting_unit IS 'Locally-owned reporting unit for a District Average submission.';

CREATE SEQUENCE IF NOT EXISTS hrs.reporting_unit_id_seq START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE hrs.reporting_unit_id_seq OWNED BY hrs.reporting_unit.reporting_unit_id;

ALTER TABLE ONLY hrs.block
    ALTER COLUMN block_id SET DEFAULT nextval('hrs.block_id_seq'::regclass);

ALTER TABLE ONLY hrs.block_area_segment
    ALTER COLUMN block_area_segment_id SET DEFAULT nextval('hrs.block_area_segment_id_seq'::regclass);

ALTER TABLE ONLY hrs.block_mark
    ALTER COLUMN block_mark_id SET DEFAULT nextval('hrs.block_mark_id_seq'::regclass);

ALTER TABLE ONLY hrs.reporting_unit
    ALTER COLUMN reporting_unit_id SET DEFAULT nextval('hrs.reporting_unit_id_seq'::regclass);

ALTER TABLE ONLY hrs.block_area_segment
    DROP CONSTRAINT IF EXISTS block_area_segment_pk CASCADE;

ALTER TABLE ONLY hrs.block_area_segment
    ADD CONSTRAINT block_area_segment_pk PRIMARY KEY (block_area_segment_id);

ALTER TABLE ONLY hrs.block_mark
    DROP CONSTRAINT IF EXISTS block_mark_pk CASCADE;

ALTER TABLE ONLY hrs.block_mark
    ADD CONSTRAINT block_mark_pk PRIMARY KEY (block_mark_id);

ALTER TABLE ONLY hrs.block
    DROP CONSTRAINT IF EXISTS block_pk CASCADE;

ALTER TABLE ONLY hrs.block
    ADD CONSTRAINT block_pk PRIMARY KEY (block_id);

ALTER TABLE ONLY hrs.district_average_block
    DROP CONSTRAINT IF EXISTS district_average_block_pk CASCADE;

ALTER TABLE ONLY hrs.district_average_block
    ADD CONSTRAINT district_average_block_pk PRIMARY KEY (district_average_block_id);

ALTER TABLE ONLY hrs.reporting_unit
    DROP CONSTRAINT IF EXISTS reporting_unit_pk CASCADE;

ALTER TABLE ONLY hrs.reporting_unit
    ADD CONSTRAINT reporting_unit_pk PRIMARY KEY (reporting_unit_id);

CREATE INDEX IF NOT EXISTS idx_block_area_segment_block_id ON hrs.block_area_segment USING btree(block_id);

CREATE INDEX IF NOT EXISTS idx_block_mark_block_id ON hrs.block_mark USING btree(block_id);

CREATE INDEX IF NOT EXISTS idx_block_reporting_unit_id ON hrs.block USING btree(reporting_unit_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_block_mark_live_type_sequence ON hrs.block_mark USING btree(block_id, mark_type, sequence_no)
    WHERE (is_deleted = false);

CREATE UNIQUE INDEX IF NOT EXISTS uq_block_one_da_per_ru ON hrs.block USING btree(reporting_unit_id)
    WHERE (((block_type)::text = 'DISTRICT_AVERAGE'::text) AND (is_deleted = false));

CREATE UNIQUE INDEX IF NOT EXISTS uq_reporting_unit_client_district ON hrs.reporting_unit USING btree(client_number, client_locn_code, org_unit_no)
    WHERE (is_deleted = false);

ALTER TABLE ONLY hrs.block_area_segment
    DROP CONSTRAINT IF EXISTS fk_block_area_segment_block CASCADE;

ALTER TABLE ONLY hrs.block_area_segment
    ADD CONSTRAINT fk_block_area_segment_block FOREIGN KEY (block_id) REFERENCES hrs.block(block_id);

ALTER TABLE ONLY hrs.block_mark
    DROP CONSTRAINT IF EXISTS fk_block_mark_block CASCADE;

ALTER TABLE ONLY hrs.block_mark
    ADD CONSTRAINT fk_block_mark_block FOREIGN KEY (block_id) REFERENCES hrs.block(block_id);

ALTER TABLE ONLY hrs.block
    DROP CONSTRAINT IF EXISTS fk_block_reporting_unit CASCADE;

ALTER TABLE ONLY hrs.block
    ADD CONSTRAINT fk_block_reporting_unit FOREIGN KEY (reporting_unit_id) REFERENCES hrs.reporting_unit(reporting_unit_id);

ALTER TABLE ONLY hrs.district_average_block
    DROP CONSTRAINT IF EXISTS fk_district_average_block_block CASCADE;

ALTER TABLE ONLY hrs.district_average_block
    ADD CONSTRAINT fk_district_average_block_block FOREIGN KEY (district_average_block_id) REFERENCES hrs.block(block_id);

-- ============================================================================
-- V1.1.8__da_schema_standards.sql — Issue #1300: column
-- documentation (and FK constraints) for the tables owned by this file.
-- ============================================================================
COMMENT ON COLUMN hrs.block.block_id IS 'Unique identifier for the submission block.';

COMMENT ON COLUMN hrs.block.reporting_unit_id IS 'Foreign key referencing the parent reporting unit.';

COMMENT ON COLUMN hrs.block.block_type IS 'Block category, e.g. DISTRICT_AVERAGE.';

COMMENT ON COLUMN hrs.block.is_draft IS 'Whether this block is still an uncommitted draft.';

COMMENT ON COLUMN hrs.block.plc_date IS 'Primary logging complete date.';

COMMENT ON COLUMN hrs.block.revision IS 'Optimistic locking revision counter.';

COMMENT ON COLUMN hrs.block.created_by IS 'Audit actor that created this block.';

COMMENT ON COLUMN hrs.block.updated_by IS 'Audit actor that last updated this block.';

COMMENT ON COLUMN hrs.block.created_at IS 'Timestamp when this block was created.';

COMMENT ON COLUMN hrs.block.updated_at IS 'Timestamp when this block was last updated.';

COMMENT ON COLUMN hrs.block.is_deleted IS 'Soft-delete flag; live uniqueness indexes exclude deleted rows.';

COMMENT ON COLUMN hrs.block_area_segment.block_area_segment_id IS 'Unique identifier for the area segment.';

COMMENT ON COLUMN hrs.block_area_segment.block_id IS 'Foreign key referencing the parent block.';

COMMENT ON COLUMN hrs.block_area_segment.source IS 'Segment derivation source: e.g. MANUAL or FTA.';

COMMENT ON COLUMN hrs.block_area_segment.area_ha IS 'Segment area in hectares.';

COMMENT ON COLUMN hrs.block_area_segment.road_length_m IS 'Road length in meters.';

COMMENT ON COLUMN hrs.block_area_segment.road_width_m IS 'Road width in meters.';

COMMENT ON COLUMN hrs.block_area_segment.created_by IS 'Audit actor that created this segment.';

COMMENT ON COLUMN hrs.block_area_segment.updated_by IS 'Audit actor that last updated this segment.';

COMMENT ON COLUMN hrs.block_area_segment.created_at IS 'Timestamp when this segment was created.';

COMMENT ON COLUMN hrs.block_area_segment.updated_at IS 'Timestamp when this segment was last updated.';

COMMENT ON COLUMN hrs.block_area_segment.is_deleted IS 'Soft-delete flag.';

COMMENT ON COLUMN hrs.block_mark.block_mark_id IS 'Unique identifier for the block mark.';

COMMENT ON COLUMN hrs.block_mark.block_id IS 'Foreign key referencing the parent block.';

COMMENT ON COLUMN hrs.block_mark.mark_type IS 'Mark type: PRIMARY or SECONDARY.';

COMMENT ON COLUMN hrs.block_mark.sequence_no IS 'Sequential order number for secondary marks.';

COMMENT ON COLUMN hrs.block_mark.mark IS 'Timber mark or identifier string.';

COMMENT ON COLUMN hrs.block_mark.validation_status IS 'External mark validation state.';

COMMENT ON COLUMN hrs.block_mark.created_by IS 'Audit actor that created this mark.';

COMMENT ON COLUMN hrs.block_mark.updated_by IS 'Audit actor that last updated this mark.';

COMMENT ON COLUMN hrs.block_mark.created_at IS 'Timestamp when this mark was created.';

COMMENT ON COLUMN hrs.block_mark.updated_at IS 'Timestamp when this mark was last updated.';

COMMENT ON COLUMN hrs.block_mark.is_deleted IS 'Soft-delete flag.';

COMMENT ON COLUMN hrs.district_average_block.district_average_block_id IS 'Primary key and foreign key referencing the parent block.';

COMMENT ON COLUMN hrs.district_average_block.benchmark_zone IS 'Benchmark pricing zone.';

COMMENT ON COLUMN hrs.district_average_block.maturity IS 'Timber maturity: MATURE or IMMATURE.';

COMMENT ON COLUMN hrs.district_average_block.retention_percentage IS 'Stand retention percentage.';

COMMENT ON COLUMN hrs.district_average_block.criteria IS 'Integer array of applicable District Average qualifying criteria.';

COMMENT ON COLUMN hrs.district_average_block.coast_helicopter_area_ha IS 'Coast helicopter logging area in hectares.';

COMMENT ON COLUMN hrs.district_average_block.revision IS 'Optimistic locking revision counter.';

COMMENT ON COLUMN hrs.district_average_block.created_by IS 'Audit actor that created this DA extension.';

COMMENT ON COLUMN hrs.district_average_block.updated_by IS 'Audit actor that last updated this DA extension.';

COMMENT ON COLUMN hrs.district_average_block.created_at IS 'Timestamp when this DA extension was created.';

COMMENT ON COLUMN hrs.district_average_block.updated_at IS 'Timestamp when this DA extension was last updated.';

COMMENT ON COLUMN hrs.district_average_block.is_deleted IS 'Soft-delete flag.';

COMMENT ON COLUMN hrs.district_average_block.is_heli_logging IS 'Whether helicopter logging applies to the submission block.';

COMMENT ON COLUMN hrs.reporting_unit.reporting_unit_id IS 'Unique identifier for the reporting unit.';

COMMENT ON COLUMN hrs.reporting_unit.client_number IS 'Forest client number.';

COMMENT ON COLUMN hrs.reporting_unit.client_locn_code IS 'Forest client location code.';

COMMENT ON COLUMN hrs.reporting_unit.org_unit_no IS 'Ministry organizational unit number.';

COMMENT ON COLUMN hrs.reporting_unit.revision IS 'Optimistic locking revision counter.';

COMMENT ON COLUMN hrs.reporting_unit.created_by IS 'Audit actor that created this reporting unit.';

COMMENT ON COLUMN hrs.reporting_unit.updated_by IS 'Audit actor that last updated this reporting unit.';

COMMENT ON COLUMN hrs.reporting_unit.created_at IS 'Timestamp when this reporting unit was created.';

COMMENT ON COLUMN hrs.reporting_unit.updated_at IS 'Timestamp when this reporting unit was last updated.';

COMMENT ON COLUMN hrs.reporting_unit.is_deleted IS 'Soft-delete flag; live uniqueness indexes exclude deleted rows.';
