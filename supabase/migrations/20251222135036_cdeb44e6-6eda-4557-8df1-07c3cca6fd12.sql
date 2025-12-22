-- Adicionar campos para controle de autorização e dispensação na tabela paciente_medicamento
ALTER TABLE public.paciente_medicamento 
ADD COLUMN IF NOT EXISTS data_autorizacao date,
ADD COLUMN IF NOT EXISTS duracao_meses integer DEFAULT 3,
ADD COLUMN IF NOT EXISTS status_medicamento text DEFAULT 'aguardando',
ADD COLUMN IF NOT EXISTS dispensacoes_realizadas integer DEFAULT 0;

-- Comentários para documentar os campos
COMMENT ON COLUMN public.paciente_medicamento.data_autorizacao IS 'Data em que a autorização foi concedida';
COMMENT ON COLUMN public.paciente_medicamento.duracao_meses IS 'Duração da autorização em meses (3 ou 6)';
COMMENT ON COLUMN public.paciente_medicamento.status_medicamento IS 'Status: aguardando, disponivel, em_falta';
COMMENT ON COLUMN public.paciente_medicamento.dispensacoes_realizadas IS 'Número de dispensações já realizadas';