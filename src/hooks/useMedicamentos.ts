import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface LoteInfo {
  lote: string;
  validade: string;
  quantidade: string;
}

interface MedicamentoAI {
  nome: string;
  codigo: string;
  unidade?: string;
  lotes: LoteInfo[];
  quantidadeTotal: string;
}

interface AIResponse {
  encontrado: boolean;
  mensagem: string;
  medicamentos: MedicamentoAI[];
}

export type { LoteInfo, MedicamentoAI };

export function useMedicamentos() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchMedicamentoWithAI = async (
    postoNome: string,
    postoLocalidade: string,
    medicamentoQuery: string,
    pdfUrl: string | null
  ): Promise<AIResponse> => {
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.functions.invoke('search-medicamento', {
        body: {
          postoNome,
          postoLocalidade,
          medicamentoQuery,
          pdfUrl,
        },
      });

      if (error) throw error;
      return data as AIResponse;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao consultar PDF');
      return {
        encontrado: false,
        mensagem: 'Desculpe, não foi possível ler o PDF deste posto no momento. Por favor, tente novamente.',
        medicamentos: []
      };
    } finally {
      setLoading(false);
    }
  };

  const getPdfUrl = async (postoId: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase
        .from('arquivos_pdf')
        .select('url')
        .eq('posto_id', postoId)
        .order('data_upload', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data?.url || null;
    } catch {
      return null;
    }
  };

  return { searchMedicamentoWithAI, getPdfUrl, loading, error };
}