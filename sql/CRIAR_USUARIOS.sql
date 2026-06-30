-- Script para criar usuários no sistema
-- Senha: 123456 (SHA-256: 8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92)
-- Execute no Supabase SQL Editor

INSERT INTO usuarios (email, nome, senha_hash, role, ativo, created_at, updated_at)
VALUES
  ('renata.convenios2023@gmail.com', 'Renata Aparecida Pimenta Moreira', '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', 'usuario', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('paulo.convenios2023@gmail.com', 'Paulo Sergio Bottoni', '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', 'usuario', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('paula.convenios2023@gmail.com', 'Paula Araujo Peixoto', '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', 'usuario', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('cassia.convenios2023@gmail.com', 'Cassia Maria Santos Teles', '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', 'usuario', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('rabreu@saude.sp.gov.br', 'Rosana Marques de Oliveira Abreu', '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', 'usuario', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('whsalles@saude.sp.gov.br', 'Wander Heleno Salles', '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', 'usuario', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('efpereira@saude.sp.gov.br', 'Eliana Franco Pereira', '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', 'usuario', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('jsmoreira@saude.sp.gov.br', 'Jose Luiz dos Santos Moreira', '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', 'usuario', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('jrbatista@saude.sp.gov.br', 'Jose Romao Batista', '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', 'usuario', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('cmconstantino@saude.sp.gov.br', 'Cesar Moreira Constantino', '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', 'usuario', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('dbsantos@saude.sp.gov.br', 'Diego Barbosa dos Santos', '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', 'usuario', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('diva.convenios2023@gmail.com', 'Diva Santos da Fonseca', '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', 'usuario', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('mtfmartins@saude.sp.gov.br', 'Marcus Thadeu Faria Martins', '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', 'usuario', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('mrferreiraconvenios@gmail.com', 'Marcia Rodrigues Ferreira', '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', 'usuario', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('gabrielavergueiro.convenios2023@gmail.com', 'Gabriela Fernanda Vergueiro', '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', 'usuario', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('rlourenco@saude.sp.gov.br', 'Rita de Cassia Lourenco Shiga Caetano', '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', 'usuario', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('mraphael@saude.sp.gov.br', 'Maristela Aparecida Raphael', '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', 'usuario', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('esamecima@saude.sp.gov.br', 'Elza Tatsuo Samecima', '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', 'usuario', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('fesouza@saude.sp.gov.br', 'Fernanda da Silva e Souza', '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', 'usuario', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('tasilva@saude.sp.gov.br', 'Thiago Almeida da Silva', '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', 'usuario', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('mcmoura@saude.sp.gov.br', 'Marta Conceicao de Moura', '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', 'usuario', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('rhsantos@saude.sp.gov.br', 'Ronaldo Hilario dos Santos', '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', 'usuario', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('aspcarvalho@saude.sp.gov.br', 'Arlete Shirley Pereira de Carvalho', '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', 'usuario', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('rtatit@saude.sp.gov.br', 'Renato Tatit', '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', 'usuario', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (email) DO UPDATE SET
  nome = EXCLUDED.nome,
  senha_hash = EXCLUDED.senha_hash,
  ativo = true,
  updated_at = CURRENT_TIMESTAMP;

-- Verificar resultado
SELECT id, email, nome, role, ativo FROM usuarios ORDER BY nome;
