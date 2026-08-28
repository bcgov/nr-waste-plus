-- Issue #1216: transactional delivery and request idempotency metadata.

CREATE TABLE IF NOT EXISTS hrs.outbox_event (
    id BIGSERIAL,
    event_id UUID NOT NULL,
    aggregate_type VARCHAR(64) NOT NULL,
    aggregate_id BIGINT NOT NULL,
    event_type VARCHAR(128) NOT NULL,
    payload JSONB NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    attempt_count INTEGER NOT NULL DEFAULT 0,
    next_retry_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by VARCHAR(128) NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by VARCHAR(128) NOT NULL,
    CONSTRAINT outbox_event_pk PRIMARY KEY (id),
    CONSTRAINT outbox_event_event_uq UNIQUE (event_id),
    CONSTRAINT outbox_event_status_ck CHECK (
        status IN (
            'PENDING', 'IN_FLIGHT', 'RETRYING', 'CONFIRMED',
            'RECONCILIATION_REQUIRED', 'PERMANENT_FAILURE'
        )
    ),
    CONSTRAINT outbox_event_attempt_count_ck CHECK (attempt_count >= 0)
);

CREATE INDEX IF NOT EXISTS idx_outbox_actionable
    ON hrs.outbox_event (next_retry_at)
    WHERE status IN ('PENDING', 'RETRYING');

CREATE TABLE IF NOT EXISTS hrs.idempotency_record (
    id BIGSERIAL,
    idempotency_key VARCHAR(256) NOT NULL,
    request_fingerprint VARCHAR(128) NOT NULL,
    response_status INTEGER,
    response_body JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by VARCHAR(128) NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by VARCHAR(128) NOT NULL,
    CONSTRAINT idempotency_record_pk PRIMARY KEY (id),
    CONSTRAINT idempotency_record_key_uq UNIQUE (idempotency_key)
);

COMMENT ON TABLE hrs.outbox_event IS
    'Transactional outbox events pending reliable delivery and reconciliation.';
COMMENT ON COLUMN hrs.outbox_event.event_id IS
    'Stable UUID used to identify this event across delivery attempts.';
COMMENT ON COLUMN hrs.outbox_event.status IS
    'Delivery state: PENDING, IN_FLIGHT, RETRYING, CONFIRMED, RECONCILIATION_REQUIRED, or PERMANENT_FAILURE.';
COMMENT ON COLUMN hrs.outbox_event.next_retry_at IS
    'Earliest time at which a pending or retrying event may be leased.';
COMMENT ON TABLE hrs.idempotency_record IS
    'Request fingerprints and completed responses used to make retried commands idempotent.';
COMMENT ON COLUMN hrs.idempotency_record.request_fingerprint IS
    'Digest of the request payload and operation contract.';
