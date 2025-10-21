-- Inserir dados de teste
INSERT INTO postos (nome, localidade, horario_funcionamento, status) VALUES 
('UBS Centro', 'Centro de Pereiro', '07:00 às 17:00', 'aberto'),
('UBS São José', 'Bairro São José', '08:00 às 16:00', 'aberto'),
('UBS Rural', 'Zona Rural', '08:00 às 12:00', 'fechado')
ON CONFLICT DO NOTHING;

-- Criar alguns vínculos de teste se existirem usuários
INSERT INTO usuario_posto (usuario_id, posto_id)
SELECT u.id, p.id 
FROM usuarios u, postos p 
WHERE u.email = 'responsavel@pereiro.ce.gov.br' 
AND p.nome = 'UBS Centro'
ON CONFLICT DO NOTHING;