// src/pages/AvaliacoesPage.tsx
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient'; // ajuste o caminho se o seu client estiver em outro local
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Star, Send, Loader2 } from 'lucide-react';

type Avaliacao = {
  id: string;
  nome_usuario: string;
  rating: number;
  comentario: string;
  created_at: string;
};

const MAX_LEN = { nome: 60, comentario: 1000 };

export default function AvaliacoesPage() {
  // estados do formulário
  const [nome, setNome] = useState('');
  const [rating, setRating] = useState(0);
  const [comentario, setComentario] = useState('');

  // estados de UI
  const [submitting, setSubmitting] = useState(false);
  const [listLoading, setListLoading] = useState(true);
  const [avaliacoes, setAvaliacoes] = useState<Avaliacao[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  // valida se pode enviar
  const canSubmit = useMemo(
    () =>
      nome.trim().length >= 2 &&
      nome.trim().length <= MAX_LEN.nome &&
      comentario.trim().length >= 5 &&
      comentario.trim().length <= MAX_LEN.comentario &&
      rating >= 1 &&
      rating <= 5,
    [nome, comentario, rating]
  );

  // carrega lista inicial
  const fetchAvaliacoes = async () => {
    setListLoading(true);
    setErrorMsg(null);

    const { data, error } = await supabase
      .from('avaliacoes')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      setErrorMsg('Não foi possível carregar as avaliações.');
    } else if (data) {
      setAvaliacoes(data as Avaliacao[]);
    }
    setListLoading(false);
  };

  useEffect(() => {
    fetchAvaliacoes();
  }, []);

  // realtime: novos INSERTs aparecem sem recarregar
  useEffect(() => {
    const channel = supabase
      .channel('avaliacoes-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'avaliacoes' },
        (payload) => {
          setAvaliacoes((curr) => [payload.new as Avaliacao, ...curr]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // submit do formulário
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || submitting) return;

    setErrorMsg(null);
    setOkMsg(null);
    setSubmitting(true);

    try {
      const { error } = await supabase.from('avaliacoes').insert({
        nome_usuario: nome.trim(),
        rating,
        comentario: comentario.trim(),
      });

      if (error) throw error;

      setOkMsg('Avaliação enviada com sucesso! Obrigado 🙌');
      setNome('');
      setRating(0);
      setComentario('');
      // garante atualização imediata (além do realtime)
      await fetchAvaliacoes();
    } catch {
      setErrorMsg('Erro ao enviar sua avaliação. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-3xl">
      {/* Formulário */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-xl">Avalie o ConsultMed</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label className="text-sm font-medium">Seu nome</label>
              <Input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex.: Maria S."
                maxLength={MAX_LEN.nome}
                aria-label="Seu nome"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Mín. 2 e máx. {MAX_LEN.nome} caracteres.
              </p>
            </div>

            <div>
              <label className="text-sm font-medium">Sua nota</label>
              <div className="flex items-center gap-1 mt-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setRating(n)}
                    className="p-1"
                    aria-label={`Dar nota ${n}`}
                  >
                    <Star
                      className={`h-6 w-6 ${
                        n <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'
                      }`}
                    />
                  </button>
                ))}
                <span className="text-sm ml-2">{rating || '-'}/5</span>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Comentário</label>
              <Textarea
                value={comentario}
                onChange={(e) => setComentario(e.target.value)}
                placeholder="Como foi sua experiência? Sugestões?"
                rows={4}
                maxLength={MAX_LEN.comentario}
                aria-label="Comentário"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Mín. 5 e máx. {MAX_LEN.comentario} caracteres.
              </p>
            </div>

            {errorMsg && <p className="text-sm text-red-600">{errorMsg}</p>}
            {okMsg && <p className="text-sm text-green-700">{okMsg}</p>}

            <div className="flex justify-end">
              <Button type="submit" disabled={!canSubmit || submitting} className="min-w-32">
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Enviar
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Lista de avaliações */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Avaliações recentes</CardTitle>
        </CardHeader>
        <CardContent>
          {listLoading ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : errorMsg && avaliacoes.length === 0 ? (
            <p className="text-sm text-red-600">{errorMsg}</p>
          ) : avaliacoes.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma avaliação ainda.</p>
          ) : (
            <ul className="space-y-4">
              {avaliacoes.map((a) => (
                <li key={a.id} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{a.nome_usuario}</div>
                    <div className="flex items-center">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Star
                          key={n}
                          className={`h-4 w-4 ${
                            n <= a.rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap">{a.comentario}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {new Date(a.created_at).toLocaleString('pt-BR')}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
