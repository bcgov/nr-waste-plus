-- ============================================================================
-- V1.2.3__reliability_infrastructure.sql — Issue #1216: transactional
-- outbox and request idempotency (outbox_event, idempotency_record).
-- Feature work tracked in #1232 (outbox publication) and #1234
-- (Idempotency-Key middleware); column documentation from #1300.
-- ============================================================================
CREATE TABLE IF NOT EXISTS hrs.idempotency_record(
    idempotency_record_id bigint NOT NULL,
    idempotency_key character varying(256) NOT NULL,
    request_fingerprint character varying(128) NOT NULL,
    status character varying(32) DEFAULT 'IN_PROGRESS'::character varying NOT NULL,
    response_status integer,
    response_snapshot jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by character varying(128) NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by character varying(128) NOT NULL,
    CONSTRAINT idempotency_record_status_ck CHECK (status IN ('IN_PROGRESS', 'COMPLETED'))
    );

COMMENT ON TABLE hrs.idempotency_record IS 'Request fingerprints and completed responses used to make retried commands idempotent.';

COMMENT ON COLUMN hrs.idempotency_record.request_fingerprint IS 'Digest of request payload and route.';

COMMENT ON COLUMN hrs.idempotency_record.status IS 'Processing status: IN_PROGRESS or COMPLETED.';

COMMENT ON COLUMN hrs.idempotency_record.response_status IS 'HTTP status code captured from completed response.';

COMMENT ON COLUMN hrs.idempotency_record.response_snapshot IS 'JSONB snapshot of response returned on retry.';

CREATE SEQUENCE IF NOT EXISTS hrs.idempotency_record_id_seq START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE hrs.idempotency_record_id_seq OWNED BY hrs.idempotency_record.idempotency_record_id;

CREATE TABLE IF NOT EXISTS hrs.outbox_event(
    outbox_event_id bigint NOT NULL,
    event_id uuid NOT NULL,
    aggregate_type character varying(64) NOT NULL,
    aggregate_id bigint NOT NULL,
    event_type character varying(128) NOT NULL,
    payload jsonb NOT NULL,
    status character varying(32) DEFAULT 'PENDING'::character varying NOT NULL,
    attempt_count integer DEFAULT 0 NOT NULL,
    attempt_history jsonb DEFAULT '[]'::jsonb NOT NULL,
    next_retry_at timestamp with time zone DEFAULT now() NOT NULL,
    locked_until timestamp with time zone,
    locked_by character varying(128),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by character varying(128) NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by character varying(128) NOT NULL,
    CONSTRAINT outbox_event_attempt_count_ck CHECK ((attempt_count >= 0)),
    CONSTRAINT outbox_event_status_ck CHECK (status IN ('PENDING', 'IN_FLIGHT', 'RETRYING', 'CONFIRMED', 'RECONCILIATION_REQUIRED', 'PERMANENT_FAILURE'))
    );

COMMENT ON TABLE hrs.outbox_event IS 'Transactional outbox events pending reliable delivery and reconciliation.';

COMMENT ON COLUMN hrs.outbox_event.event_id IS 'Stable UUID identifying this event across delivery attempts.';

COMMENT ON COLUMN hrs.outbox_event.status IS 'Delivery state: PENDING, IN_FLIGHT, RETRYING, CONFIRMED, etc.';

COMMENT ON COLUMN hrs.outbox_event.attempt_history IS 'JSON array of delivery attempts with outcome timestamps.';

COMMENT ON COLUMN hrs.outbox_event.next_retry_at IS 'Earliest timestamp for next delivery retry.';

COMMENT ON COLUMN hrs.outbox_event.locked_until IS 'Lease expiration timestamp for in-flight processing.';

COMMENT ON COLUMN hrs.outbox_event.locked_by IS 'Worker node identifier holding the lease.';

CREATE SEQUENCE IF NOT EXISTS hrs.outbox_event_id_seq START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE hrs.outbox_event_id_seq OWNED BY hrs.outbox_event.outbox_event_id;

ALTER TABLE ONLY hrs.idempotency_record
    ALTER COLUMN idempotency_record_id SET DEFAULT nextval('hrs.idempotency_record_id_seq'::regclass);

ALTER TABLE ONLY hrs.outbox_event
    ALTER COLUMN outbox_event_id SET DEFAULT nextval('hrs.outbox_event_id_seq'::regclass);

ALTER TABLE ONLY hrs.idempotency_record
    DROP CONSTRAINT IF EXISTS idempotency_record_key_uq CASCADE;

ALTER TABLE ONLY hrs.idempotency_record
    ADD CONSTRAINT idempotency_record_key_uq UNIQUE (idempotency_key);

ALTER TABLE ONLY hrs.idempotency_record
    DROP CONSTRAINT IF EXISTS idempotency_record_pk CASCADE;

ALTER TABLE ONLY hrs.idempotency_record
    ADD CONSTRAINT idempotency_record_pk PRIMARY KEY (idempotency_record_id);

ALTER TABLE ONLY hrs.outbox_event
    DROP CONSTRAINT IF EXISTS outbox_event_event_uq CASCADE;

ALTER TABLE ONLY hrs.outbox_event
    ADD CONSTRAINT outbox_event_event_uq UNIQUE (event_id);

ALTER TABLE ONLY hrs.outbox_event
    DROP CONSTRAINT IF EXISTS outbox_event_pk CASCADE;

ALTER TABLE ONLY hrs.outbox_event
    ADD CONSTRAINT outbox_event_pk PRIMARY KEY (outbox_event_id);

CREATE INDEX IF NOT EXISTS idx_outbox_actionable ON hrs.outbox_event USING btree(next_retry_at)
    WHERE
    status IN ('PENDING', 'RETRYING');

CREATE INDEX IF NOT EXISTS idx_outbox_lease ON hrs.outbox_event USING btree(locked_until)
    WHERE (locked_until IS NOT NULL);

-- ============================================================================
-- V1.1.8__da_schema_standards.sql — Issue #1300: column
-- documentation (and FK constraints) for the tables owned by this file.
-- ============================================================================
COMMENT ON COLUMN hrs.idempotency_record.idempotency_record_id IS 'Unique identifier for the idempotency record.';

COMMENT ON COLUMN hrs.idempotency_record.idempotency_key IS 'Unique idempotency key supplied by the client.';

COMMENT ON COLUMN hrs.idempotency_record.created_at IS 'Timestamp when the request was first accepted.';

COMMENT ON COLUMN hrs.idempotency_record.created_by IS 'Actor that initiated the request.';

COMMENT ON COLUMN hrs.idempotency_record.updated_at IS 'Timestamp when the idempotency record was last updated.';

COMMENT ON COLUMN hrs.idempotency_record.updated_by IS 'Actor that last updated the idempotency record.';

COMMENT ON COLUMN hrs.outbox_event.outbox_event_id IS 'Unique identifier for the outbox event record.';

COMMENT ON COLUMN hrs.outbox_event.aggregate_type IS 'Domain aggregate type, e.g. SUBMISSION.';

COMMENT ON COLUMN hrs.outbox_event.aggregate_id IS 'Identifier of the owning aggregate.';

COMMENT ON COLUMN hrs.outbox_event.event_type IS 'Domain event type name.';

COMMENT ON COLUMN hrs.outbox_event.payload IS 'Serialized event payload as JSONB.';

COMMENT ON COLUMN hrs.outbox_event.attempt_count IS 'Number of transmission attempts performed.';

COMMENT ON COLUMN hrs.outbox_event.created_at IS 'Timestamp when the event was enqueued.';

COMMENT ON COLUMN hrs.outbox_event.created_by IS 'Actor that enqueued the outbox event.';

COMMENT ON COLUMN hrs.outbox_event.updated_at IS 'Timestamp when the outbox record was last modified.';

COMMENT ON COLUMN hrs.outbox_event.updated_by IS 'Actor that last updated the outbox event.';
