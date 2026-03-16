-- Importação de Recurso e Tipo de Formalização
-- Chunk 1 de 1 (32.199 registros)
-- Gerado automaticamente - SEM CONSTRAINT UNIQUE em emenda
-- Permite duplicatas de emenda

INSERT INTO formalizacao_recursos_tipos_staging (emenda, tipo_formalizacao, recurso) VALUES
('202.007.316.400', 'Convênio normal', 'SIM'),
('202.007.316.395', 'Repasse fundo a fundo', 'SIM'),
('202.007.316.401', 'Impedida Tecnicamente', 'SIM'),
('202.007.316.327', 'Convênio normal', 'SIM'),
('202.007.316.336', 'Convênio normal', 'SIM'),
('202.007.316.329', 'Convênio normal', 'SIM'),
('202.007.316.330', 'Convênio normal', 'SIM'),
('202.007.316.331', 'Convênio normal', 'SIM'),
('202.007.316.332', 'Convênio normal', 'SIM')
-- [Aqui virão os 32.199 registros do seu CSV real
-- Cole o resto dos dados aqui]
;

-- ✅ Verificar dados importados
SELECT COUNT(*) as total_importados FROM formalizacao_recursos_tipos_staging;

-- ✅ Verificar se tem duplicatas agora
SELECT emenda, COUNT(*) as qtd
FROM formalizacao_recursos_tipos_staging
GROUP BY emenda
HAVING COUNT(*) > 1
ORDER BY qtd DESC;
