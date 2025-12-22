import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Medicamento {
  id: string;
  nome: string;
  marcas?: string[] | null;
  quantidade: string | null;
  pagina_pdf: string | null;
  posto_id: string;
}

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

  const normalize = (s: string) =>
    s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();

  const levenshtein = (a: string, b: string) => {
    if (a === b) return 0;
    if (!a) return b.length;
    if (!b) return a.length;

    const dp = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
    for (let i = 0; i <= a.length; i++) dp[i][0] = i;
    for (let j = 0; j <= b.length; j++) dp[0][j] = j;

    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,
          dp[i][j - 1] + 1,
          dp[i - 1][j - 1] + cost
        );
      }
    }

    return dp[a.length][b.length];
  };

  const resolveMedicamentoQuery = async (postoId: string, query: string): Promise<string> => {
    const normalizedQuery = normalize(query);
    const token = normalizedQuery.split(' ')[0];
    if (!token) return query;

    const { data, error } = await supabase
      .from('medicamentos')
      .select('nome, marcas')
      .eq('posto_id', postoId);

    if (error) throw error;

    const meds = (data || []) as Array<{ nome: string; marcas?: string[] | null }>;

    const matchByPrefixOrBrand = meds.filter((med) => {
      const nomeNorm = normalize(med.nome);
      const matchNome = token ? nomeNorm.startsWith(token) : false;

      const marcas = med.marcas || [];
      const matchMarca = marcas.some((marcaItem) => {
        const palavrasMarca = normalize(marcaItem).split(' ');
        return palavrasMarca.some((palavra) => palavra.startsWith(token) || token.startsWith(palavra));
      });

      return matchNome || matchMarca;
    });

    if (matchByPrefixOrBrand.length >= 2) return query;

    if (matchByPrefixOrBrand.length === 1) {
      const resolvedNome = matchByPrefixOrBrand[0].nome?.trim();
      const resolvedToken = resolvedNome ? normalize(resolvedNome).split(' ')[0] : '';
      const isBrandMapping = resolvedToken && !resolvedToken.startsWith(token);
      return isBrandMapping ? resolvedNome : query;
    }

    let best: { dist: number; nomeToken: string } | null = null;

    for (const med of meds) {
      const nomeToken = normalize(med.nome).split(' ')[0];
      if (!nomeToken) continue;

      const compareNome = nomeToken.slice(0, token.length) || nomeToken;
      const distNome = levenshtein(token, compareNome);

      if (!best || distNome < best.dist) best = { dist: distNome, nomeToken };

      for (const marcaItem of med.marcas || []) {
        const palavras = normalize(marcaItem).split(' ');
        for (const w of palavras) {
          if (!w) continue;
          const compareW = w.slice(0, token.length) || w;
          const distW = levenshtein(token, compareW);
          if (distW < (best?.dist ?? Number.POSITIVE_INFINITY)) best = { dist: distW, nomeToken };
        }
      }
    }

    const threshold = token.length <= 4 ? 1 : token.length <= 7 ? 2 : 3;
    if (!best || best.dist > threshold) return query;

    const suggested = token.length <= 6 ? best.nomeToken.slice(0, 4) || best.nomeToken : best.nomeToken;
    return suggested;
  };

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

  return { resolveMedicamentoQuery, searchMedicamentoWithAI, getPdfUrl, loading, error };
}