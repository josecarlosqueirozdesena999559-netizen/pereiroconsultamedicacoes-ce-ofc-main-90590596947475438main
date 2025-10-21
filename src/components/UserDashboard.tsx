import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Upload, Download, Calendar, FileText, AlertCircle, CheckCircle2, Info, MessageSquare } from 'lucide-react';
import { UBS } from '@/types';
import { getUBS, savePDF, getUpdateChecks, saveUpdateCheck, getApprovedCorrectionsForUser, CorrecaoPDF } from '@/lib/storage';
import { formatDateTime } from '@/lib/utils';
import CorrectionRequestModal from './CorrectionRequestModal';
import DismissibleAlert from './DismissibleAlert'; // Importando o novo componente

const UserDashboard = () => {
  const [ubsList, setUbsList] = useState<UBS[]>([]);
  const [uploadingUBS, setUploadingUBS] = useState<string | null>(null);
  const [updateChecks, setUpdateChecks] = useState<Record<string, { manha: boolean; tarde: boolean }>>({});
  const [approvedCorrections, setApprovedCorrections] = useState<CorrecaoPDF[]>([]);
  const { user } = useAuth();
  const { toast } = useToast();

  // Usamos a data de hoje no formato DD/MM/AAAA para comparação de atualização
  const todayFormattedDate = new Date().toLocaleDateString('pt-BR');

  useEffect(() => {
    if (user) {
      loadUserUBS();
      loadApprovedCorrections();
    }
  }, [user]);

  const loadApprovedCorrections = async () => {
    if (!user) return;
    try {
      const corrections = await getApprovedCorrectionsForUser(user.id);
      setApprovedCorrections(corrections);
    } catch (error) {
      console.error('Erro ao carregar correções aprovadas:', error);
    }
  };

  const loadUpdateChecksForUBS = async (ubsId: string) => {
    if (!user) return;

    const checks = await getUpdateChecks(user.id, ubsId);
    if (checks) {
      setUpdateChecks(prev => ({
        ...prev,
        [ubsId]: checks
      }));
    } else {
      // Garante que o estado seja limpo se não houver check para hoje
      setUpdateChecks(prev => ({
        ...prev,
        [ubsId]: { manha: false, tarde: false }
      }));
    }
  };

  const loadUserUBS = async () => {
    try {
      const allUBS = await getUBS();
      const userUBS = allUBS.filter(ubs => user?.ubsVinculadas.includes(ubs.id));
      setUbsList(userUBS);

      // Carregar checks para cada UBS
      userUBS.forEach(ubs => {
        loadUpdateChecksForUBS(ubs.id);
      });
    } catch (error) {
      console.error('Erro ao carregar UBS do usuário:', error);
    }
  };

  const isPDFUpdatedToday = (ubs: UBS) => {
    // Compara apenas a parte da data (DD/MM/AAAA) da string formatada
    return ubs.pdfUltimaAtualizacao?.startsWith(todayFormattedDate) || false;
  };

  // Esta função agora é apenas para fins de visualização, pois a marcação é feita no upload
  const toggleCheck = async (ubsId: string, period: 'manha' | 'tarde') => {
    // A marcação manual é desabilitada, pois o check é feito automaticamente após o upload.
    // Se o usuário tentar clicar, ele recebe um aviso.
    toast({
      title: "Ação Bloqueada",
      description: "A marcação de atualização é feita automaticamente após o upload do PDF.",
      variant: "destructive",
    });
  };

  const isComplete = (ubsId: string) => {
    const checks = updateChecks[ubsId];
    return checks?.manha && checks?.tarde;
  };

  const handleFileUpload = async (ubsId: string, file: File) => {
    if (!file || !user) return;

    // Validar se é PDF
    if (file.type !== 'application/pdf') {
      toast({
        title: "Formato inválido",
        description: "Por favor, selecione apenas arquivos PDF.",
        variant: "destructive",
      });
      return;
    }

    // Validar tamanho (máximo 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "Arquivo muito grande",
        description: "O arquivo deve ter no máximo 10MB.",
        variant: "destructive",
      });
      return;
    }

    setUploadingUBS(ubsId);
    let uploadSuccess = false;
    let periodMarked: 'manha' | 'tarde' | null = null;

    try {
      // 1. Salva o PDF e atualiza a data de upload no banco
      const newTimestamp = await savePDF(ubsId, file);
      uploadSuccess = !!newTimestamp;

      if (uploadSuccess) {
        // 2. Recarrega os checks atuais para decidir qual período marcar
        const currentChecks = await getUpdateChecks(user.id, ubsId);
        const manhaChecked = currentChecks?.manha || false;
        const tardeChecked = currentChecks?.tarde || false;
        
        let periodToMark: 'manha' | 'tarde' | null = null;

        if (!manhaChecked) {
          periodToMark = 'manha';
        } else if (manhaChecked && !tardeChecked) {
          periodToMark = 'tarde';
        }

        if (periodToMark) {
          // 3. Marca o check correspondente no banco de dados
          const success = await saveUpdateCheck(user.id, ubsId, periodToMark);
          
          if (success) {
            periodMarked = periodToMark;
          }
        }
      }
      
    } catch (error) {
      // Se houver um erro no upload ou na inserção do registro, ele cai aqui.
      console.error("Erro durante o upload ou registro:", error);
      toast({
        title: "Erro no upload",
        description: "Ocorreu um erro ao salvar o arquivo. Verifique o console para detalhes.",
        variant: "destructive",
      });
      uploadSuccess = false; // Garante que a mensagem de sucesso não seja exibida se cair no catch
    } finally {
      setUploadingUBS(null);
      
      // 4. Recarrega todos os dados para refletir as mudanças na UI
      await loadUserUBS();

      // 5. Exibe a mensagem de sucesso após recarregar
      if (uploadSuccess) {
        let description = "O arquivo foi atualizado com sucesso.";
        if (periodMarked) {
          description = `O arquivo de medicações foi atualizado e a marcação de ${periodMarked === 'manha' ? 'Manhã' : 'Tarde'} foi registrada.`;
        } else if (isComplete(ubsId)) {
          description = "O arquivo foi atualizado, mas os checks de Manhã e Tarde já estavam completos.";
        } else {
          description = "O arquivo foi atualizado, mas não foi possível registrar o check diário. Verifique o status.";
        }
        
        toast({
          title: "PDF atualizado com sucesso!",
          description: description,
          // O toast agora permanece na tela por 10 minutos, forçando o clique para sair.
        });
      }
    }
  };

  const triggerFileInput = (ubsId: string) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        handleFileUpload(ubsId, file);
      }
    };
    input.click();
  };

  const handleDownload = (ubs: UBS) => {
    if (ubs.pdfUrl) {
      const link = document.createElement('a');
      link.href = ubs.pdfUrl;
      link.download = `medicacoes_${ubs.nome.replace(/\s+/g, '_')}.pdf`;
      link.click();
    }
  };

  // Avisos estáticos
  const staticAlerts = [
    {
      id: 'welcome_guide',
      title: 'Bem-vindo ao Dashboard!',
      description: 'Aqui você gerencia os PDFs de medicações das UBS vinculadas ao seu perfil. Lembre-se de atualizar o PDF duas vezes ao dia (manhã e tarde).',
      variant: 'info' as const,
    },
    {
      id: 'upload_rule',
      title: 'Regra de Upload',
      description: 'O sistema só permite o upload de arquivos PDF com tamanho máximo de 10MB. Certifique-se de que o arquivo está correto antes de enviar.',
      variant: 'warning' as const,
    },
  ];

  // Avisos dinâmicos (Correções Aprovadas)
  const correctionAlerts = approvedCorrections.map(correction => {
    const ubs = ubsList.find(u => u.id === correction.ubs_id);
    const ubsName = ubs?.nome || 'UBS Desconhecida';
    const periodo = correction.periodo === 'manha' ? 'Manhã' : 'Tarde';
    
    return {
      id: `correction_approved_${correction.id}`,
      title: 'Correção Aprovada: Novo Upload Liberado!',
      description: (
        <>
          O administrador aprovou sua solicitação de correção para a UBS <strong>{ubsName}</strong>, período da <strong>{periodo}</strong>.
          <br />
          Você já pode realizar um novo upload para registrar a atualização correta.
        </>
      ),
      variant: 'success' as const,
    };
  });

  const allAlerts = [...staticAlerts, ...correctionAlerts];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary">Meu Dashboard</h1>
          <p className="text-muted-foreground">
            Gerencie os PDFs de medicações das suas UBS
          </p>
        </div>
      </div>

      <Tabs defaultValue="management" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 h-auto p-1">
          <TabsTrigger value="management" className="flex items-center gap-2 py-2">
            <Upload className="h-4 w-4" />
            Gestão de PDFs
          </TabsTrigger>
          <TabsTrigger value="alerts" className="flex items-center gap-2 py-2 relative">
            <MessageSquare className="h-4 w-4" />
            Comunicados
            {allAlerts.filter(alert => localStorage.getItem(`dismissed_alert_${alert.id}`) !== 'true').length > 0 && (
              <span className="absolute top-1 right-1 block h-2 w-2 rounded-full bg-destructive ring-2 ring-background" />
            )}
          </TabsTrigger>
        </TabsList>

        {/* --- ABA: GESTÃO DE PDFS --- */}
        <TabsContent value="management" className="space-y-6">
          {/* Aviso informativo */}
          <Card className="border-l-4 border-primary bg-primary/5">
            <CardHeader className="flex flex-row items-center gap-2">
              <Info className="h-5 w-5 text-primary" />
              <div>
                <CardTitle className="text-primary">Como Atualizar o PDF</CardTitle>
                <CardDescription>Orientações formais para evitar erros</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <ol className="list-decimal list-inside space-y-1">
                <li>
                  Clique no botão <strong>“Atualizar PDF”</strong> e selecione o PDF atualizado do seu estoque.
                </li>
                <li>
                  Ao atualizar, <strong>aguarde a notificação</strong> com a mensagem <em>“PDF atualizado com sucesso”</em>.
                </li>
                <li>
                  Utilize o botão <strong>“Baixar PDF Atual”</strong> para confirmar se o arquivo está correto, verificando a <strong>data e hora do envio</strong>.
                </li>
                <li>
                  A marcação de <strong>“Atualizado pela manhã”</strong> ou <strong>“Atualizado pela tarde”</strong> será feita <u>automaticamente após o upload</u>. O primeiro upload marca a manhã, o segundo marca a tarde.
                </li>
                <li>
                  Após seguir esses passos, o sistema estará devidamente atualizado e funcionando corretamente.
                </li>
              </ol>
            </CardContent>
          </Card>
          {/* Fim do aviso */}

          {ubsList.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhuma UBS vinculada</h3>
                <p className="text-muted-foreground text-center">
                  Você não possui UBS vinculadas ao seu usuário. 
                  Entre em contato com o administrador para solicitar acesso.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {ubsList.map((ubs) => {
                const pdfUpdatedToday = isPDFUpdatedToday(ubs);
                const manhaChecked = updateChecks[ubs.id]?.manha || false;
                const tardeChecked = updateChecks[ubs.id]?.tarde || false;

                return (
                  <Card key={ubs.id} className="hover:shadow-lg transition-all duration-300">
                    <CardHeader className="pb-4">
                      <CardTitle className="text-lg font-semibold text-primary">
                        {ubs.nome}
                      </CardTitle>
                      <CardDescription className="text-sm">
                        {ubs.localidade} • {ubs.horarios}
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      <div className="text-sm text-muted-foreground">
                        <p><strong>Responsável:</strong> {ubs.responsavel}</p>
                        {ubs.pdfUltimaAtualizacao && (
                          <div className="flex items-center mt-2">
                            <Calendar className="h-3 w-3 mr-1" />
                            <span>Última atualização: {ubs.pdfUltimaAtualizacao}</span>
                          </div>
                        )}
                      </div>

                      {!isComplete(ubs.id) && (
                        <Alert className={pdfUpdatedToday ? "border-primary/20 bg-primary/5" : "border-amber-500/20 bg-amber-500/5"}>
                          <AlertCircle className={`h-4 w-4 ${pdfUpdatedToday ? 'text-primary' : 'text-amber-600'}`} />
                          <AlertTitle className={`font-semibold text-sm ${pdfUpdatedToday ? 'text-primary' : 'text-amber-700'}`}>
                            {pdfUpdatedToday ? 'Pronto para Próxima Atualização' : 'Atenção'}
                          </AlertTitle>
                          <AlertDescription className={`text-xs ${pdfUpdatedToday ? 'text-primary/90' : 'text-amber-600/90'}`}>
                            {pdfUpdatedToday 
                              ? manhaChecked && !tardeChecked
                                ? 'O PDF foi atualizado hoje pela manhã. Faça um novo upload para registrar a atualização da tarde.'
                                : 'O PDF ainda não foi atualizado hoje. Faça o upload para registrar a atualização da manhã.'
                              : 'O PDF ainda não foi atualizado hoje. Faça o upload para registrar a atualização da manhã.'
                            }
                          </AlertDescription>
                        </Alert>
                      )}

                      <div className="bg-muted/30 rounded-lg p-3 space-y-2">
                        <p className="text-xs font-medium text-muted-foreground mb-2">Status de Atualização Diária</p>

                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={`${ubs.id}-manha`}
                            checked={manhaChecked}
                            onCheckedChange={() => toggleCheck(ubs.id, 'manha')}
                            disabled={true}
                          />
                          <label
                            htmlFor={`${ubs.id}-manha`}
                            className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed`}
                          >
                            Atualizado pela manhã (via upload)
                          </label>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={`${ubs.id}-tarde`}
                            checked={tardeChecked}
                            onCheckedChange={() => toggleCheck(ubs.id, 'tarde')}
                            disabled={true}
                          />
                          <label
                            htmlFor={`${ubs.id}-tarde`}
                            className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed`}
                          >
                            Atualizado pela tarde (via upload)
                          </label>
                        </div>

                        {isComplete(ubs.id) && (
                          <div className="flex items-center gap-2 text-green-600 pt-1">
                            <CheckCircle2 className="h-4 w-4" />
                            <span className="text-xs font-medium">Atualização completa!</span>
                          </div>
                        )}
                      </div>

                      <div className="border-t pt-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-medium">Arquivo PDF</Label>
                          {ubs.pdfUrl && (
                            <FileText className="h-4 w-4 text-success" />
                          )}
                        </div>

                        <div className="space-y-2">
                          <Button
                            onClick={() => triggerFileInput(ubs.id)}
                            disabled={uploadingUBS === ubs.id || isComplete(ubs.id)}
                            className="w-full"
                            variant={ubs.pdfUrl ? "outline" : "default"}
                          >
                            <Upload className="h-4 w-4 mr-2" />
                            {uploadingUBS === ubs.id 
                              ? 'Enviando...' 
                              : isComplete(ubs.id)
                                ? 'Atualização Diária Completa'
                                : ubs.pdfUrl 
                                  ? 'Atualizar PDF' 
                                  : 'Enviar PDF'
                            }
                          </Button>

                          {ubs.pdfUrl && (
                            <Button
                              onClick={() => handleDownload(ubs)}
                              variant="ghost"
                              className="w-full"
                            >
                              <Download className="h-4 w-4 mr-2" />
                              Baixar PDF Atual
                            </Button>
                          )}
                        </div>
                        
                        {/* Botão de Solicitação de Correção */}
                        <CorrectionRequestModal 
                          ubsId={ubs.id} 
                          ubsName={ubs.nome} 
                          onSuccess={loadUserUBS} // Recarrega os dados após a solicitação
                        />

                        <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                          <p><strong>Requisitos:</strong></p>
                          <p>• Formato: PDF apenas</p>
                          <p>• Tamanho máximo: 10MB</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* --- ABA: COMUNICADOS --- */}
        <TabsContent value="alerts" className="space-y-4">
          <h2 className="text-2xl font-semibold flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-primary" />
            Avisos e Comunicados
          </h2>
          <p className="text-muted-foreground text-sm">
            Avisos importantes do administrador. Clique no 'X' para dispensar permanentemente.
          </p>

          <div className="space-y-4">
            {allAlerts.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-8">
                  <Info className="h-8 w-8 text-muted-foreground mb-3" />
                  <p className="text-muted-foreground text-center">Nenhum comunicado ativo no momento.</p>
                </CardContent>
              </Card>
            ) : (
              allAlerts.map(alert => (
                <DismissibleAlert
                  key={alert.id}
                  id={alert.id}
                  title={alert.title}
                  description={alert.description}
                  variant={alert.variant}
                />
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default UserDashboard;