-- Criar tabela para registrar atualizações diárias dos usuários
CREATE TABLE public.update_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  ubs_id UUID NOT NULL REFERENCES postos(id) ON DELETE CASCADE,
  manha BOOLEAN NOT NULL DEFAULT false,
  tarde BOOLEAN NOT NULL DEFAULT false,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, ubs_id, data)
);

-- Habilitar RLS
ALTER TABLE public.update_checks ENABLE ROW LEVEL SECURITY;

-- Política para usuários verem apenas seus próprios checks
CREATE POLICY "Usuários podem ver seus próprios checks"
  ON public.update_checks
  FOR SELECT
  USING (true);

-- Política para usuários inserirem seus próprios checks
CREATE POLICY "Usuários podem inserir seus próprios checks"
  ON public.update_checks
  FOR INSERT
  WITH CHECK (true);

-- Política para usuários atualizarem seus próprios checks (somente se ainda não marcado)
CREATE POLICY "Usuários podem atualizar seus próprios checks"
  ON public.update_checks
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Função para limpar checks antigos (executar diariamente às 00:00)
CREATE OR REPLACE FUNCTION public.cleanup_old_update_checks()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.update_checks
  WHERE data < CURRENT_DATE;
END;
$$;

-- Criar índice para melhorar performance
CREATE INDEX idx_update_checks_user_ubs_data ON public.update_checks(user_id, ubs_id, data);