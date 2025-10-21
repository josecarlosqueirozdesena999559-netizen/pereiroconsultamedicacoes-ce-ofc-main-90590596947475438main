-- Criar política para permitir login (autenticação)
-- Esta política permite que qualquer usuário consulte a tabela usuarios para autenticação
DROP POLICY IF EXISTS "Usuarios: Select only own" ON usuarios;

CREATE POLICY "Usuarios: Login permitido" 
ON usuarios 
FOR SELECT 
USING (true);

-- Atualizar senha do admin para texto simples para testes
UPDATE usuarios 
SET senha = 'admin123' 
WHERE email = 'admin@pereiro.ce.gov.br';

-- Criar alguns usuários de teste adicionais
INSERT INTO usuarios (email, nome, senha, tipo) VALUES 
('responsavel@pereiro.ce.gov.br', 'Responsável Teste', 'resp123', 'responsavel'),
('user@teste.com', 'Usuário Teste', 'user123', 'responsavel')
ON CONFLICT (email) DO NOTHING;