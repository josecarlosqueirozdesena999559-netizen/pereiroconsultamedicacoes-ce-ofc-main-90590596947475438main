import { useState, useEffect, useMemo } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/hooks/useAuth";
import {
  Upload,
  Download,
  AlertCircle,
  CheckCircle2,
  Clock,
  MessageCircle,
} from "lucide-react";
import { UBS } from "@/types";
import {
  getUBS,
  savePDF,
  getUpdateChecks,
  saveUpdateCheck,
} from "@/lib/storage";
import CorrectionRequestModal from "./CorrectionRequestModal";

const UserDashboard = () => {
  const [ubsList, setUbsList] = useState<UBS[]>([]);
  const [uploadingUBS, setUploadingUBS] = useState<string | null>(null);
  const [updateChecks, setUpdateChecks] = useState<
    Record<string, { manha: boolean; tarde: boolean }>
  >({});
  const { user } = useAuth();

  const todayFormattedDate = useMemo(
    () => new Date().toLocaleDateString("pt-BR"),
    []
  );

  const getUploadScheduleInfo = useMemo(() => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const hour = now.getHours();
    
    const isFriday = dayOfWeek === 5;
    const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    
    let canUploadManha = false;
    let canUploadTarde = false;
    let currentPeriodLabel = "";
    let scheduleMessage = "";
    
    if (isWeekend) {
      scheduleMessage = "Uploads não disponíveis nos finais de semana.";
    } else if (isFriday) {
      const canUploadOnFriday = hour >= 7 && hour < 17;
      canUploadManha = canUploadOnFriday;
      canUploadTarde = canUploadOnFriday;
      if (canUploadOnFriday) {
        currentPeriodLabel = "Manhã + Tarde";
        scheduleMessage = "Sexta: Upload único conta como manhã e tarde (07h-17h)";
      } else {
        scheduleMessage = "Fora do horário (Sexta: 07h-17h)";
      }
    } else if (isWeekday) {
      canUploadManha = hour >= 7 && hour < 12;
      canUploadTarde = hour >= 12 && hour < 17;
      
      if (hour >= 7 && hour < 12) {
        currentPeriodLabel = "Manhã";
        scheduleMessage = "Período da manhã (07h-11h)";
      } else if (hour >= 12 && hour < 17) {
        currentPeriodLabel = "Tarde";
        scheduleMessage = "Período da tarde (12h-17h)";
      } else {
        scheduleMessage = "Fora do horário (07h-11h / 12h-17h)";
      }
    }
    
    return {
      isFriday,
      isWeekend,
      canUploadManha,
      canUploadTarde,
      canUpload: canUploadManha || canUploadTarde,
      currentPeriodLabel,
      scheduleMessage,
    };
  }, []);

  useEffect(() => {
    if (!user) return;
    loadAll();
  }, [user]);

  const loadAll = async () => {
    await loadUserUBS();
  };

  const loadUpdateChecksForUBS = async (ubsId: string) => {
    if (!user) return;
    const checks = await getUpdateChecks(user.id, ubsId);
    setUpdateChecks((prev) => ({
      ...prev,
      [ubsId]: checks ?? { manha: false, tarde: false },
    }));
  };

  const loadUserUBS = async () => {
    try {
      const allUBS = await getUBS();
      const userUBS = allUBS.filter((ubs) =>
        user?.ubsVinculadas.includes(ubs.id)
      );
      setUbsList(userUBS);
      await Promise.all(userUBS.map((ubs) => loadUpdateChecksForUBS(ubs.id)));
    } catch (error) {
      console.error("Erro ao carregar UBS do usuário:", error);
    }
  };

  const isComplete = (ubsId: string) => {
    const checks = updateChecks[ubsId];
    return !!(checks?.manha && checks?.tarde);
  };

  const handleFileUpload = async (ubsId: string, file: File) => {
    if (!file || !user) return;

    if (file.type !== "application/pdf") {
      console.error("Formato inválido - apenas PDF");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      console.error("Arquivo muito grande - máximo 10MB");
      return;
    }

    setUploadingUBS(ubsId);

    try {
      const newTimestamp = await savePDF(ubsId, file);

      if (newTimestamp) {
        const currentChecks = await getUpdateChecks(user.id, ubsId);
        const manhaChecked = currentChecks?.manha || false;
        const tardeChecked = currentChecks?.tarde || false;
        
        const { isFriday, canUploadManha, canUploadTarde } = getUploadScheduleInfo;
        
        if (isFriday) {
          if (!manhaChecked) await saveUpdateCheck(user.id, ubsId, "manha");
          if (!tardeChecked) await saveUpdateCheck(user.id, ubsId, "tarde");
        } else {
          if (canUploadManha && !manhaChecked) {
            await saveUpdateCheck(user.id, ubsId, "manha");
          } else if (canUploadTarde && !tardeChecked) {
            await saveUpdateCheck(user.id, ubsId, "tarde");
          }
        }
      }
    } catch (error) {
      console.error("Erro durante o upload:", error);
    } finally {
      setUploadingUBS(null);
      await loadUserUBS();
    }
  };

  const triggerFileInput = (ubsId: string) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".pdf";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) handleFileUpload(ubsId, file);
    };
    input.click();
  };

  const handleDownload = (ubs: UBS) => {
    if (!ubs.pdfUrl) return;
    const link = document.createElement("a");
    link.href = ubs.pdfUrl;
    link.download = `medicacoes_${ubs.nome.replace(/\s+/g, "_")}.pdf`;
    link.click();
  };

  const novidades = [
    {
      id: "1",
      date: "21/12/2024",
      title: "Consulta via Chat com IA",
      description: "A população pode consultar medicamentos pelo chat flutuante.",
    },
    {
      id: "2",
      date: "20/12/2024",
      title: "Novo Horário de Atualização",
      description: "Seg-Qui: Manhã (07h-11h) e Tarde (12h-17h). Sexta: Upload único (07h-17h).",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Conteúdo Principal */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        <Tabs defaultValue="management" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 h-12">
            <TabsTrigger value="management" className="text-sm font-medium">
              Gestão de PDF
            </TabsTrigger>
            <TabsTrigger value="novidades" className="text-sm font-medium">
              Novidades
            </TabsTrigger>
          </TabsList>

          {/* Tab: Gestão de PDF */}
          <TabsContent value="management" className="space-y-4">

            {/* Lista de UBS */}
            {ubsList.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <AlertCircle className="h-10 w-10 text-muted-foreground mb-3" />
                  <h3 className="text-lg font-medium mb-1">Nenhuma UBS vinculada</h3>
                  <p className="text-sm text-muted-foreground">
                    Solicite o vínculo ao administrador.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {ubsList.map((ubs) => {
                  const manhaChecked = updateChecks[ubs.id]?.manha || false;
                  const tardeChecked = updateChecks[ubs.id]?.tarde || false;
                  const complete = isComplete(ubs.id);
                  const { canUpload, currentPeriodLabel, scheduleMessage } = getUploadScheduleInfo;

                  return (
                    <Card key={ubs.id} className={complete ? "border-green-300 bg-green-50/50 dark:bg-green-950/10" : ""}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-base font-semibold">{ubs.nome}</CardTitle>
                            <p className="text-xs text-muted-foreground mt-0.5">{ubs.localidade}</p>
                          </div>
                          {complete && (
                            <span className="text-xs font-medium text-green-600 bg-green-100 px-2 py-1 rounded">
                              Completo
                            </span>
                          )}
                        </div>
                      </CardHeader>

                      <CardContent className="space-y-4">
                        {/* Horário */}
                        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                          <Clock className="h-3.5 w-3.5" />
                          <span>{scheduleMessage}</span>
                        </div>

                        {/* Última atualização */}
                        {ubs.pdfUltimaAtualizacao && (
                          <p className="text-xs text-muted-foreground">
                            Última atualização: {ubs.pdfUltimaAtualizacao}
                          </p>
                        )}

                        {/* Status do dia */}
                        <div className="grid grid-cols-2 gap-2">
                          <div className={`flex items-center gap-2 p-3 rounded border ${
                            manhaChecked 
                              ? "bg-green-50 border-green-300 dark:bg-green-950/30" 
                              : "bg-muted/30 border-border"
                          }`}>
                            <Checkbox checked={manhaChecked} disabled className="data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500" />
                            <div>
                              <p className={`text-sm font-medium ${manhaChecked ? "text-green-700 dark:text-green-300" : "text-muted-foreground"}`}>
                                Manhã
                              </p>
                              <p className="text-xs text-muted-foreground">07h - 11h</p>
                            </div>
                          </div>
                          
                          <div className={`flex items-center gap-2 p-3 rounded border ${
                            tardeChecked 
                              ? "bg-green-50 border-green-300 dark:bg-green-950/30" 
                              : "bg-muted/30 border-border"
                          }`}>
                            <Checkbox checked={tardeChecked} disabled className="data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500" />
                            <div>
                              <p className={`text-sm font-medium ${tardeChecked ? "text-green-700 dark:text-green-300" : "text-muted-foreground"}`}>
                                Tarde
                              </p>
                              <p className="text-xs text-muted-foreground">12h - 17h</p>
                            </div>
                          </div>
                        </div>

                        {/* Botões */}
                        <div className="flex flex-col gap-2">
                          <Button
                            onClick={() => triggerFileInput(ubs.id)}
                            disabled={uploadingUBS === ubs.id || complete || !canUpload}
                            className="w-full"
                            variant={complete ? "outline" : "default"}
                          >
                            <Upload className="h-4 w-4 mr-2" />
                            {uploadingUBS === ubs.id
                              ? "Enviando..."
                              : complete
                              ? "Atualização completa"
                              : !canUpload
                              ? "Fora do horário"
                              : `Enviar PDF${currentPeriodLabel ? ` (${currentPeriodLabel})` : ""}`}
                          </Button>

                          <div className="flex gap-2">
                            {ubs.pdfUrl && (
                              <Button
                                onClick={() => handleDownload(ubs)}
                                variant="outline"
                                size="sm"
                                className="flex-1"
                              >
                                <Download className="h-4 w-4 mr-1" />
                                Baixar
                              </Button>
                            )}
                            <div className="flex-1">
                              <CorrectionRequestModal
                                ubsId={ubs.id}
                                ubsName={ubs.nome}
                                onSuccess={loadUserUBS}
                              />
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Tab: Novidades */}
          <TabsContent value="novidades" className="space-y-4">
            {novidades.map((item) => (
              <Card key={item.id}>
                <CardContent className="pt-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-medium text-sm">{item.title}</h3>
                    <span className="text-xs text-muted-foreground">{item.date}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </CardContent>
              </Card>
            ))}

            <Card className="border-green-200 bg-green-50/50 dark:bg-green-950/10">
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  <MessageCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-sm mb-1">Como consultar medicamentos?</h3>
                    <p className="text-sm text-muted-foreground">
                      Use o chat flutuante no canto inferior direito para consultar disponibilidade.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default UserDashboard;
