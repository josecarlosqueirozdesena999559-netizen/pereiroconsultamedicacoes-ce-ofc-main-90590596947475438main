-- Criar tabela de lotes para controle de validade
CREATE TABLE public.lotes_medicamento (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  medicamento_id UUID NOT NULL REFERENCES public.medicamentos_auto_custo(id) ON DELETE CASCADE,
  lote TEXT NOT NULL,
  validade DATE NOT NULL,
  quantidade INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.lotes_medicamento ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Lotes: acesso público leitura" 
ON public.lotes_medicamento 
FOR SELECT 
USING (true);

CREATE POLICY "Lotes: admin pode gerenciar" 
ON public.lotes_medicamento 
FOR ALL 
USING (true)
WITH CHECK (true);