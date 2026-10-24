-- =============================================================================
-- Migration 005: Undertakings & Compliance Documents
-- =============================================================================

CREATE TABLE IF NOT EXISTS undertakings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT NULL,
    due_date DATE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING', -- PENDING, SUBMITTED, VERIFIED, OVERDUE, WAIVED
    submitted_at TIMESTAMPTZ NULL,
    verified_at TIMESTAMPTZ NULL,
    verified_by UUID NULL REFERENCES profiles(id) ON DELETE SET NULL,
    document_path TEXT NULL,
    remarks TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_undertakings_app ON undertakings(application_id);
CREATE INDEX IF NOT EXISTS idx_undertakings_due ON undertakings(due_date);
CREATE INDEX IF NOT EXISTS idx_undertakings_status ON undertakings(status);

CREATE TRIGGER trg_undertakings_updated_at
BEFORE UPDATE ON undertakings
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS compliance_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    application_id UUID NULL REFERENCES applications(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    document_type VARCHAR(100) NOT NULL,
    valid_from DATE NOT NULL,
    valid_until DATE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'VALID', -- VALID, EXPIRING, EXPIRED
    storage_path TEXT NULL,
    verified BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comp_docs_inst ON compliance_documents(institution_id);
CREATE INDEX IF NOT EXISTS idx_comp_docs_app ON compliance_documents(application_id);
CREATE INDEX IF NOT EXISTS idx_comp_docs_expiry ON compliance_documents(valid_until);
CREATE INDEX IF NOT EXISTS idx_comp_docs_status ON compliance_documents(status);

CREATE TRIGGER trg_compliance_documents_updated_at
BEFORE UPDATE ON compliance_documents
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
