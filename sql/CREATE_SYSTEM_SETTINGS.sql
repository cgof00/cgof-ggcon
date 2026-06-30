-- ============================================================
-- EXECUTAR NO SUPABASE: cria tabela system_settings
-- Usada para coordenar "forçar atualização para todos usuários"
-- ============================================================

CREATE TABLE IF NOT EXISTS system_settings (
  key        text PRIMARY KEY,
  value      text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Linha inicial para o mecanismo de force-reload
INSERT INTO system_settings (key, value, updated_at)
VALUES ('force_reload_at', '0', now())
ON CONFLICT (key) DO NOTHING;

-- RLS: qualquer usuário autenticado pode LER
-- escrita é feita via service_role_key pelo backend (somente admin)
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'system_settings' AND policyname = 'leitura_publica'
  ) THEN
    CREATE POLICY "leitura_publica" ON system_settings FOR SELECT USING (true);
  END IF;
END $$;

-- Somente o backend (service_role) escreve — sem política de INSERT/UPDATE para roles normais
