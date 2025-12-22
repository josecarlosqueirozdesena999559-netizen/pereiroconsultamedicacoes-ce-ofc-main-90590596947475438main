import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Pill, CheckCircle, Clock, AlertCircle, User, MapPin, X } from 'lucide-react';
import Header from '@/components/Header';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Lote {
  id: string;
  lote: string;
  validade: string;
  quantidade: number;
}

interface Medicamento {
  id: string;
  nome: string;
  descricao: string | null;
}

interface PacienteMedicamento {
  id: string;
  medicamento: Medicamento;
  disponivel_retirada: boolean;
  lotes: Lote[];
}

interface Paciente {
  id: string;
  nome_completo: string;
  cartao_sus: string;
  medicamentos: PacienteMedicamento[];
}

const ConsultaSUS = () => {
  const [cartaoSUS, setCartaoSUS] = useState('');
  const [paciente, setPaciente] = useState<Paciente | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const { toast } = useToast();

  const handleSearch = async () => {
    if (!cartaoSUS.trim()) {
      toast({
        title: "Atenção",
        description: "Digite o número do Cartão SUS para consultar.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setSearched(true);
    setNotFound(false);

    try {
      const { data: pacienteData, error: pacienteError } = await supabase
        .from('pacientes_auto_custo')
        .select('*')
        .eq('cartao_sus', cartaoSUS.trim())
        .maybeSingle();

      if (pacienteError) throw pacienteError;

      if (!pacienteData) {
        setPaciente(null);
        setNotFound(true);
        return;
      }

      const { data: pacienteMeds, error: medsError } = await supabase
        .from('paciente_medicamento')
        .select(`
          id,
          disponivel_retirada,
          medicamento:medicamentos_auto_custo(id, nome, descricao)
        `)
        .eq('paciente_id', pacienteData.id);

      if (medsError) throw medsError;

      const medicamentosComLotes: PacienteMedicamento[] = [];

      for (const pm of pacienteMeds || []) {
        const medicamento = pm.medicamento as unknown as Medicamento;
        
        const { data: lotes } = await supabase
          .from('lotes_medicamento')
          .select('id, lote, validade, quantidade')
          .eq('medicamento_id', medicamento.id)
          .gt('quantidade', 0)
          .order('validade', { ascending: true });

        medicamentosComLotes.push({
          id: pm.id,
          medicamento: medicamento,
          disponivel_retirada: pm.disponivel_retirada,
          lotes: lotes || [],
        });
      }

      setPaciente({
        id: pacienteData.id,
        nome_completo: pacienteData.nome_completo,
        cartao_sus: pacienteData.cartao_sus,
        medicamentos: medicamentosComLotes,
      });

    } catch (error) {
      console.error('Erro na consulta:', error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao buscar os dados. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSearched(false);
    setPaciente(null);
    setNotFound(false);
    setCartaoSUS('');
  };

  const formatValidade = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd/MM/yyyy", { locale: ptBR });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20">
      <Header />
      
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-primary via-[hsl(120_75%_25%)] to-primary text-primary-foreground py-6 sm:py-8 md:py-12">
        <div className="container mx-auto px-4 text-center">
          <Search className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 mx-auto mb-3 sm:mb-4 opacity-90" />
          <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold mb-2 sm:mb-3">
            Consulta por Cartão SUS
          </h1>
          <p className="text-xs sm:text-sm md:text-base opacity-95 max-w-2xl mx-auto">
            <strong>Atenção:</strong> Esta consulta está disponível apenas para pessoas que já recebem medicamentos do programa de Alto Custo.
            {' '}Caso não saiba o que é ou precise de mais informações,{' '}
            <a 
              href="/medicacoes-auto-custo" 
              className="underline font-semibold hover:opacity-80 transition-opacity"
            >
              clique aqui
            </a>{' '}
            ou procure a Farmácia Municipal.
          </p>
        </div>
      </section>

      <section className="py-6 sm:py-8">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto">
            
            {/* Search Card - Only shows when not searched */}
            {!searched && (
              <Card className="shadow-lg border border-primary/10">
                <CardContent className="pt-6 space-y-4">
                  <div className="text-center mb-4">
                    <h2 className="text-lg sm:text-xl font-semibold text-primary">
                      Digite seu Cartão SUS
                    </h2>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Informe o número completo do seu Cartão Nacional de Saúde
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      placeholder="Ex: 123456789012345"
                      value={cartaoSUS}
                      onChange={(e) => setCartaoSUS(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                      className="text-center text-base sm:text-lg tracking-wider"
                      maxLength={20}
                    />
                    <Button onClick={handleSearch} disabled={loading} className="px-6">
                      {loading ? (
                        <Clock className="h-4 w-4 animate-spin" />
                      ) : (
                        <Search className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Results - Shows when searched */}
            {searched && (
              <Card className="shadow-lg border border-primary/10 overflow-hidden">
                {/* Header with close button */}
                <div className="bg-primary/5 border-b border-primary/10 px-4 py-3 flex items-center justify-between">
                  <h2 className="text-sm font-medium text-primary">
                    Resultado da Consulta
                  </h2>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleClose}
                    className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <CardContent className="p-0">
                  {notFound ? (
                    <div className="flex flex-col items-center justify-center py-12 px-4">
                      <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold mb-2">Nenhum registro encontrado</h3>
                      <p className="text-muted-foreground text-center text-sm">
                        Não foi encontrado nenhum paciente com o Cartão SUS informado.
                        <br />
                        Verifique o número e tente novamente.
                      </p>
                    </div>
                  ) : paciente && (
                    <div className="divide-y divide-border">
                      {/* Paciente Info */}
                      <div className="p-4 sm:p-6 bg-gradient-to-r from-primary/5 to-primary/10">
                        <div className="flex items-center gap-4">
                          <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                            <User className="h-6 w-6 text-primary" />
                          </div>
                          <div>
                            <h3 className="text-lg sm:text-xl font-bold text-primary">
                              {paciente.nome_completo}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              Cartão SUS: <span className="font-mono">{paciente.cartao_sus}</span>
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Medicamentos Section */}
                      <div className="p-4 sm:p-6">
                        <div className="flex items-center gap-2 mb-4">
                          <Pill className="h-5 w-5 text-primary" />
                          <h4 className="text-base font-semibold text-primary">
                            Medicamentos
                          </h4>
                        </div>

                        {paciente.medicamentos.length === 0 ? (
                          <p className="text-muted-foreground text-sm text-center py-4">
                            Nenhum medicamento cadastrado.
                          </p>
                        ) : (
                          <div className="space-y-4">
                            {paciente.medicamentos.map((pm, index) => (
                              <div 
                                key={pm.id} 
                                className={`${index !== 0 ? 'pt-4 border-t border-dashed border-border' : ''}`}
                              >
                                {/* Medication Name */}
                                <div className="mb-3">
                                  <h5 className="font-semibold text-foreground">
                                    {pm.medicamento.nome}
                                  </h5>
                                  {pm.medicamento.descricao && (
                                    <p className="text-xs text-muted-foreground">
                                      {pm.medicamento.descricao}
                                    </p>
                                  )}
                                </div>

                                {/* Lotes */}
                                {pm.lotes.length > 0 && (
                                  <div className="mb-3">
                                    <p className="text-xs font-medium text-muted-foreground mb-2">
                                      Lotes disponíveis:
                                    </p>
                                    <div className="space-y-1.5">
                                      {pm.lotes.map((lote) => (
                                        <div 
                                          key={lote.id} 
                                          className="text-xs bg-muted/50 rounded px-3 py-2 flex flex-wrap justify-between items-center gap-2"
                                        >
                                          <div className="flex items-center gap-3 flex-wrap">
                                            <span>
                                              <strong>Lote:</strong> {lote.lote}
                                            </span>
                                            <span>
                                              <strong>Validade:</strong> {formatValidade(lote.validade)}
                                            </span>
                                          </div>
                                          <Badge variant="outline" className="text-xs">
                                            Qtd: {lote.quantidade}
                                          </Badge>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Status */}
                                {pm.disponivel_retirada ? (
                                  <div className="bg-success/10 border border-success/20 rounded-lg p-3">
                                    <div className="flex items-center gap-2 text-success">
                                      <CheckCircle className="h-4 w-4" />
                                      <span className="font-semibold text-sm">
                                        Disponível para retirada!
                                      </span>
                                    </div>
                                    <div className="flex items-start gap-2 mt-2 text-xs text-muted-foreground">
                                      <MapPin className="h-3 w-3 mt-0.5 flex-shrink-0" />
                                      <span>
                                        Compareça à Farmácia Municipal para retirar seu medicamento.
                                      </span>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="bg-muted/30 border border-border rounded-lg p-3">
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                      <Clock className="h-4 w-4" />
                                      <span className="font-medium text-sm">
                                        Aguardando disponibilidade
                                      </span>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">
                                      O medicamento ainda não está disponível para retirada.
                                    </p>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default ConsultaSUS;
