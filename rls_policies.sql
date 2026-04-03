-- ═══════════════════════════════════════════════════════════════
-- Row Level Security (RLS) Policies — app2 (monitorizacao)
-- Apply these in the Supabase Dashboard → SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- ── 1. Enable RLS on all tables ─────────────────────────────────
ALTER TABLE "Residente"           ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RegistoAlimentacao"  ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RegistoAtividade"    ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Consulta"            ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Alerta"              ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LigacaoFamiliar"     ENABLE ROW LEVEL SECURITY;

-- ═══════════════════════════════════════════════════════════════
-- HELPER: role check (reads from JWT user_metadata)
-- ═══════════════════════════════════════════════════════════════
-- Staff/admin = full access; familiar = linked resident only

-- ── 2. Residente ────────────────────────────────────────────────

-- Staff and admins can read all residents
CREATE POLICY "staff_read_residentes"
ON "Residente" FOR SELECT
USING (
  (auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin', 'staff')
);

-- Familiares can only read their linked resident
CREATE POLICY "familiar_read_own_residente"
ON "Residente" FOR SELECT
USING (
  id IN (
    SELECT residente_id FROM "LigacaoFamiliar"
    WHERE familiar_email = auth.jwt() ->> 'email'
      AND status = 'aprovado'
  )
);

-- Only admins can insert/update/delete residents
CREATE POLICY "admin_write_residentes"
ON "Residente" FOR ALL
USING (
  (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
)
WITH CHECK (
  (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
);

-- ── 3. RegistoAlimentacao ────────────────────────────────────────

-- Staff/admin can read all records
CREATE POLICY "staff_read_alimentacao"
ON "RegistoAlimentacao" FOR SELECT
USING (
  (auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin', 'staff')
);

-- Familiares can only read records for their linked resident
CREATE POLICY "familiar_read_own_alimentacao"
ON "RegistoAlimentacao" FOR SELECT
USING (
  residente_id IN (
    SELECT residente_id FROM "LigacaoFamiliar"
    WHERE familiar_email = auth.jwt() ->> 'email'
      AND status = 'aprovado'
  )
);

-- Only staff/admin can insert, update, or delete records
CREATE POLICY "staff_write_alimentacao"
ON "RegistoAlimentacao" FOR ALL
USING (
  (auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin', 'staff')
)
WITH CHECK (
  (auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin', 'staff')
);

-- ── 4. RegistoAtividade ──────────────────────────────────────────

CREATE POLICY "staff_read_atividade"
ON "RegistoAtividade" FOR SELECT
USING (
  (auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin', 'staff')
);

CREATE POLICY "familiar_read_own_atividade"
ON "RegistoAtividade" FOR SELECT
USING (
  residente_id IN (
    SELECT residente_id FROM "LigacaoFamiliar"
    WHERE familiar_email = auth.jwt() ->> 'email'
      AND status = 'aprovado'
  )
);

CREATE POLICY "staff_write_atividade"
ON "RegistoAtividade" FOR ALL
USING (
  (auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin', 'staff')
)
WITH CHECK (
  (auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin', 'staff')
);

-- ── 5. Consulta ──────────────────────────────────────────────────

CREATE POLICY "staff_read_consultas"
ON "Consulta" FOR SELECT
USING (
  (auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin', 'staff')
);

CREATE POLICY "familiar_read_own_consultas"
ON "Consulta" FOR SELECT
USING (
  residente_id IN (
    SELECT residente_id FROM "LigacaoFamiliar"
    WHERE familiar_email = auth.jwt() ->> 'email'
      AND status = 'aprovado'
  )
);

CREATE POLICY "staff_write_consultas"
ON "Consulta" FOR ALL
USING (
  (auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin', 'staff')
)
WITH CHECK (
  (auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin', 'staff')
);

-- ── 6. Alerta ────────────────────────────────────────────────────

-- Staff/admin can read and manage all alerts
CREATE POLICY "staff_read_alertas"
ON "Alerta" FOR SELECT
USING (
  (auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin', 'staff')
);

-- Familiares can only read alerts for their linked resident
CREATE POLICY "familiar_read_own_alertas"
ON "Alerta" FOR SELECT
USING (
  residente_id IN (
    SELECT residente_id FROM "LigacaoFamiliar"
    WHERE familiar_email = auth.jwt() ->> 'email'
      AND status = 'aprovado'
  )
);

-- Familiares can only mark as read their own resident's alerts
CREATE POLICY "familiar_update_own_alertas"
ON "Alerta" FOR UPDATE
USING (
  residente_id IN (
    SELECT residente_id FROM "LigacaoFamiliar"
    WHERE familiar_email = auth.jwt() ->> 'email'
      AND status = 'aprovado'
  )
)
WITH CHECK (
  residente_id IN (
    SELECT residente_id FROM "LigacaoFamiliar"
    WHERE familiar_email = auth.jwt() ->> 'email'
      AND status = 'aprovado'
  )
);

-- Staff/admin can insert and update alerts
CREATE POLICY "staff_write_alertas"
ON "Alerta" FOR ALL
USING (
  (auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin', 'staff')
)
WITH CHECK (
  (auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin', 'staff')
);

-- ── 7. LigacaoFamiliar ───────────────────────────────────────────

-- Familiares can only see their own links
CREATE POLICY "familiar_read_own_ligacao"
ON "LigacaoFamiliar" FOR SELECT
USING (
  familiar_email = auth.jwt() ->> 'email'
);

-- Only admins can create, update, or delete family links
CREATE POLICY "admin_manage_ligacoes"
ON "LigacaoFamiliar" FOR ALL
USING (
  (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
)
WITH CHECK (
  (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
);
