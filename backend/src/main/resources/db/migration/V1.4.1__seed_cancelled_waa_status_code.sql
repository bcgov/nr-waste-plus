-- ============================================================================
-- V1.4.1__seed_cancelled_waa_status_code.sql
-- Seed CAN (Cancelled) into waa_status_code so cancelled blocks can reference
-- a valid Oracle/HRS status code and maintain foreign key integrity.
-- ============================================================================
INSERT INTO wasteplus.waa_status_code (
    code,
    description,
    effective_date,
    expiry_date,
    update_timestamp
)
VALUES
(
    'CAN',
    'Cancelled',
    DATE '2024-01-01',
    DATE '2099-12-31',
    TIMESTAMP '2025-05-22 00:00:00'
)
ON CONFLICT (code) DO NOTHING;
