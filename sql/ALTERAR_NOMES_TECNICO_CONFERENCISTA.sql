-- Script para alterar os nomes nas colunas TECNICO e CONFERENCISTA
-- da tabela formalizacao, substituindo nomes curtos pelos nomes completos
-- Execute no Supabase SQL Editor

-- ===== ATUALIZAR COLUNA TECNICO =====

UPDATE formalizacao SET tecnico = 'Renata Aparecida Pimenta Moreira' WHERE UPPER(TRIM(tecnico)) = 'RENATA';
UPDATE formalizacao SET tecnico = 'Paulo Sergio Bottoni' WHERE UPPER(TRIM(tecnico)) = 'PAULO';
UPDATE formalizacao SET tecnico = 'Paula Araujo Peixoto' WHERE UPPER(TRIM(tecnico)) = 'PAULA';
UPDATE formalizacao SET tecnico = 'Cassia Maria Santos Teles' WHERE UPPER(TRIM(tecnico)) = 'CASSIA';
UPDATE formalizacao SET tecnico = 'Rosana Marques de Oliveira Abreu' WHERE UPPER(TRIM(tecnico)) = 'ROSANA';
UPDATE formalizacao SET tecnico = 'Wander Heleno Salles' WHERE UPPER(TRIM(tecnico)) = 'WANDER';
UPDATE formalizacao SET tecnico = 'Eliana Franco Pereira' WHERE UPPER(TRIM(tecnico)) = 'ELIANA';
UPDATE formalizacao SET tecnico = 'Jose Luiz dos Santos Moreira' WHERE UPPER(TRIM(tecnico)) = 'JOSÉ LUIZ';
UPDATE formalizacao SET tecnico = 'Jose Romao Batista' WHERE UPPER(TRIM(tecnico)) = 'JOSÉ ROMÃO';
UPDATE formalizacao SET tecnico = 'Cesar Moreira Constantino' WHERE UPPER(TRIM(tecnico)) = 'CESAR';
UPDATE formalizacao SET tecnico = 'Diego Barbosa dos Santos' WHERE UPPER(TRIM(tecnico)) = 'DIEGO';
UPDATE formalizacao SET tecnico = 'Diva Santos da Fonseca' WHERE UPPER(TRIM(tecnico)) = 'DIVA';
UPDATE formalizacao SET tecnico = 'Marcus Thadeu Faria Martins' WHERE UPPER(TRIM(tecnico)) = 'MARCUS';
UPDATE formalizacao SET tecnico = 'Marcia Rodrigues Ferreira' WHERE UPPER(TRIM(tecnico)) = 'MARCIA';
UPDATE formalizacao SET tecnico = 'Gabriela Fernanda Vergueiro' WHERE UPPER(TRIM(tecnico)) = 'GABRIELA';
UPDATE formalizacao SET tecnico = 'Rita de Cassia Lourenco Shiga Caetano' WHERE UPPER(TRIM(tecnico)) IN ('RITA LOURENÇO', 'RITA LOURENCO', 'RITA');
UPDATE formalizacao SET tecnico = 'Maristela Aparecida Raphael' WHERE UPPER(TRIM(tecnico)) = 'MARISTELA';
UPDATE formalizacao SET tecnico = 'Elza Tatsuo Samecima' WHERE UPPER(TRIM(tecnico)) = 'ELZA';
UPDATE formalizacao SET tecnico = 'Fernanda da Silva e Souza' WHERE UPPER(TRIM(tecnico)) = 'FERNANDA';
UPDATE formalizacao SET tecnico = 'Thiago Almeida da Silva' WHERE UPPER(TRIM(tecnico)) = 'THIAGO';
UPDATE formalizacao SET tecnico = 'Marta Conceicao de Moura' WHERE UPPER(TRIM(tecnico)) = 'MARTA';
UPDATE formalizacao SET tecnico = 'Ronaldo Hilario dos Santos' WHERE UPPER(TRIM(tecnico)) = 'RONALDO';
UPDATE formalizacao SET tecnico = 'Arlete Shirley Pereira de Carvalho' WHERE UPPER(TRIM(tecnico)) = 'ARLETE';
UPDATE formalizacao SET tecnico = 'Renato Tatit' WHERE UPPER(TRIM(tecnico)) = 'RENATO';

-- ===== ATUALIZAR COLUNA CONFERENCISTA =====

UPDATE formalizacao SET conferencista = 'Renata Aparecida Pimenta Moreira' WHERE UPPER(TRIM(conferencista)) = 'RENATA';
UPDATE formalizacao SET conferencista = 'Paulo Sergio Bottoni' WHERE UPPER(TRIM(conferencista)) = 'PAULO';
UPDATE formalizacao SET conferencista = 'Paula Araujo Peixoto' WHERE UPPER(TRIM(conferencista)) = 'PAULA';
UPDATE formalizacao SET conferencista = 'Cassia Maria Santos Teles' WHERE UPPER(TRIM(conferencista)) = 'CASSIA';
UPDATE formalizacao SET conferencista = 'Rosana Marques de Oliveira Abreu' WHERE UPPER(TRIM(conferencista)) = 'ROSANA';
UPDATE formalizacao SET conferencista = 'Wander Heleno Salles' WHERE UPPER(TRIM(conferencista)) = 'WANDER';
UPDATE formalizacao SET conferencista = 'Eliana Franco Pereira' WHERE UPPER(TRIM(conferencista)) = 'ELIANA';
UPDATE formalizacao SET conferencista = 'Jose Luiz dos Santos Moreira' WHERE UPPER(TRIM(conferencista)) = 'JOSÉ LUIZ';
UPDATE formalizacao SET conferencista = 'Jose Romao Batista' WHERE UPPER(TRIM(conferencista)) = 'JOSÉ ROMÃO';
UPDATE formalizacao SET conferencista = 'Cesar Moreira Constantino' WHERE UPPER(TRIM(conferencista)) = 'CESAR';
UPDATE formalizacao SET conferencista = 'Diego Barbosa dos Santos' WHERE UPPER(TRIM(conferencista)) = 'DIEGO';
UPDATE formalizacao SET conferencista = 'Diva Santos da Fonseca' WHERE UPPER(TRIM(conferencista)) = 'DIVA';
UPDATE formalizacao SET conferencista = 'Marcus Thadeu Faria Martins' WHERE UPPER(TRIM(conferencista)) = 'MARCUS';
UPDATE formalizacao SET conferencista = 'Marcia Rodrigues Ferreira' WHERE UPPER(TRIM(conferencista)) = 'MARCIA';
UPDATE formalizacao SET conferencista = 'Gabriela Fernanda Vergueiro' WHERE UPPER(TRIM(conferencista)) = 'GABRIELA';
UPDATE formalizacao SET conferencista = 'Rita de Cassia Lourenco Shiga Caetano' WHERE UPPER(TRIM(conferencista)) IN ('RITA LOURENÇO', 'RITA LOURENCO', 'RITA');
UPDATE formalizacao SET conferencista = 'Maristela Aparecida Raphael' WHERE UPPER(TRIM(conferencista)) = 'MARISTELA';
UPDATE formalizacao SET conferencista = 'Elza Tatsuo Samecima' WHERE UPPER(TRIM(conferencista)) = 'ELZA';
UPDATE formalizacao SET conferencista = 'Fernanda da Silva e Souza' WHERE UPPER(TRIM(conferencista)) = 'FERNANDA';
UPDATE formalizacao SET conferencista = 'Thiago Almeida da Silva' WHERE UPPER(TRIM(conferencista)) = 'THIAGO';
UPDATE formalizacao SET conferencista = 'Marta Conceicao de Moura' WHERE UPPER(TRIM(conferencista)) = 'MARTA';
UPDATE formalizacao SET conferencista = 'Ronaldo Hilario dos Santos' WHERE UPPER(TRIM(conferencista)) = 'RONALDO';
UPDATE formalizacao SET conferencista = 'Arlete Shirley Pereira de Carvalho' WHERE UPPER(TRIM(conferencista)) = 'ARLETE';
UPDATE formalizacao SET conferencista = 'Renato Tatit' WHERE UPPER(TRIM(conferencista)) = 'RENATO';

-- ===== VERIFICAR RESULTADO =====

-- Verificar valores únicos de tecnico após atualização
SELECT tecnico, COUNT(*) as total FROM formalizacao WHERE tecnico IS NOT NULL AND TRIM(tecnico) != '' GROUP BY tecnico ORDER BY tecnico;

-- Verificar valores únicos de conferencista após atualização
SELECT conferencista, COUNT(*) as total FROM formalizacao WHERE conferencista IS NOT NULL AND TRIM(conferencista) != '' GROUP BY conferencista ORDER BY conferencista;

-- Verificar se ficou algum nome curto (em maiúsculas) que não foi convertido
SELECT DISTINCT tecnico FROM formalizacao WHERE tecnico = UPPER(tecnico) AND tecnico IS NOT NULL AND LENGTH(TRIM(tecnico)) > 0;
SELECT DISTINCT conferencista FROM formalizacao WHERE conferencista = UPPER(conferencista) AND conferencista IS NOT NULL AND LENGTH(TRIM(conferencista)) > 0;
