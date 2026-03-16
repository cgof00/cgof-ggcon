-- ============================================================
-- CRIAR NOVA TABELA SEM CONSTRAINT UNIQUE NA COLUNA EMENDA
-- ============================================================
-- Isso permite ter múltiplos registros com a mesma emenda

-- 1️⃣ DELETAR TABELA ANTIGA
DROP TABLE IF EXISTS formalizacao_recursos CASCADE;

-- 2️⃣ CRIAR NOVA TABELA (SEM PRIMARY KEY em emenda)
CREATE TABLE formalizacao_recursos_tipos_staging (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  emenda TEXT NOT NULL,
  tipo_formalizacao TEXT,
  recurso TEXT,
  processed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3️⃣ CRIAR ÍNDICE (para performance, mas SEM UNIQUE)
CREATE INDEX idx_staging_emenda ON formalizacao_recursos(emenda);

-- ✅ Confirmação
SELECT 'Nova tabela criada ✓ (sem UNIQUE constraint)' AS status;

-- 4️⃣ VERIFICAR ESTRUTURA
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'formalizacao_recursos_tipos_staging'
ORDER BY ordinal_position;
