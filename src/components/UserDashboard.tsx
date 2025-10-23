import { useState, useEffect, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import {
  Upload,
  Download,
  Calendar,
  FileText,
  AlertCircle,
  CheckCircle2,
  Info,
} from "lucide-react";
import { UBS } from "@/types";
import {
  getUBS,
  savePDF,
  getUpdateChecks,
  saveUpdateCheck,
  getApprovedCorrectionsForUser,
  CorrecaoPDF,
} from "@/lib/storage";
import CorrectionRequestModal from "./CorrectionRequestModal";
import DismissibleAlert from "./DismissibleAlert";

const UserDashboard = () => {
  const [ubsList, setUbsList] = useState<UBS[]>([]);
  const [uploadingUBS, setUploadingUBS] = useState<string | null>(null);
  const [updateChecks, setUpdateChecks] = useState<
    Record<string, { manha: boolean; tarde: boolean }>
  >({});
  const [approvedCorrections, setApprovedCorrections] = useState<
    CorrecaoPDF[]
  >([]);
  const [showConsultMed, setShowConsultMed] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const todayFormattedDate = useMemo(
    () => new Date().toLocaleDateString("pt-BR"),
    []
  );

  useEffect(() => {
    if (!user) return;
    loadAll();
  }, [user]);

  // Aviso “Atualização do ConsultMed” — dura 23h, sem botão de fechar
  useEffect(() => {
    try {
      const key = "consultmed_notice_shownAt";
      const now = Date.now();
      const shownAt = Number(localStorage.getItem(key) || 0);
      const TTL = 23 * 60 * 60 * 1000;
      if (!shownAt || now - shownAt > TTL) {
        setShowConsultMed(true);
        localStorage.setItem(key, String(now));
        setTimeout(() => setShowConsultMed(false), TTL);
      }
    } catch (_) {
      setShowConsultMed(true);
    }
  }, []);

  const loadAll = async () => {
    await Promise.all([loadUserUBS(), loadApprovedCorrections()]);
  };

  const loadApprovedCorrections = async () => {
    if (!user) return;
    try {
      const corrections = await getApprovedCorrectionsForUser(user.id);
      setApprovedCorrections(corrections);
    } catch (error) {
      console.error("Erro ao carregar correções aprovadas:", error);
    }
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

  const isPDFUpdatedToday = (ubs: UBS) => {
    return ubs.pdfUltimaAtualizacao?.startsWith(todayFormattedDate) || false;
  };

  const isComplete = (ubsId: string) => {
    const checks = updateChecks[ubsId];
    return !!(checks?.manha && checks?.tarde);
  };

  const blockedToggle = () => {
    toast({
      title: "Ação bloqueada",
      description: "A marcação é automática após o upload do PDF.",
      variant: "destructive",
    });
  };

  const handleFileUpload = async (ubsId: string, file: File) => {
    if (!file || !user) return;

    if (file.type !== "application/pdf") {
      toast({
        title: "Formato inválido",
        description: "Selecione apenas arquivos PDF.",
        variant: "destructive",
      });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "Arquivo muito grande",
        description: "Tamanho máximo permitido: 10MB.",
        variant: "destructive",
      });
      return;
    }

    setUploadingUBS(ubsId);
    let uploadSuccess = false;
    let periodMarked: "manha" | "tarde" | null = null;

    try {
      const newTimestamp = await savePDF(ubsId, file);
      uploadSuccess = !!newTimestamp;

      if (uploadSuccess) {
        const currentChecks = await getUpdateChecks(user.id, ubsId);
        const manhaChecked = currentChecks?.manha || false;
        const tardeChecked = currentChecks?.tarde || false;
        let periodToMark: "manha" | "tarde" | null = null;
        if (!manhaChecked) periodToMark = "manha";
        else if (!tardeChecked) periodToMark = "tarde";

        if (periodToMark) {
          const success = await saveUpdateCheck(user.id, ubsId, periodToMark);
          if (success) periodMarked = periodToMark;
        }
      }
    } catch (error) {
      console.error("Erro durante o upload:", error);
      toast({
        title: "Erro no upload",
        description: "Não foi possível salvar o arquivo.",
        variant: "destructive",
      });
    } finally {
      setUploadingUBS(null);
      await loadUserUBS();
      if (uploadSuccess) {
        const msg = periodMarked
          ? `Arquivo atualizado. Marcação de ${periodMarked === "manha" ? "Manhã" : "Tarde"} registrada.`
          : isComplete(ubsId)
          ? "Arquivo atualizado. Atualizações de Manhã e Tarde já estavam completas."
          : "Arquivo atualizado. Verifique se o registro diário foi marcado.";
        toast({
          title: "PDF atualizado com sucesso!",
          description: msg,
        });
      }
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

  const staticAlerts = [
    {
      id: "welcome-guide",
      title: "Bem-vindo ao Painel do Usuário",
      description:
        "Mantenha o PDF de medicações atualizado duas vezes ao dia (manhã e tarde).",
      variant: "info" as const,
    },
    {
      id: "upload-rule",
      title: "Regras de Envio",
      description:
        "São aceitos apenas arquivos PDF com até 10MB. Verifique o conteúdo antes de enviar.",
      variant: "warning" as const,
    },
    {
      id: "wrong-pdf",
      title: "Correção de Envio",
      description:
        "Utilize o botão “Solicitar correção” no cartão da UBS para liberar um novo envio.",
      variant: "warning" as const,
    },
  ];

  const correctionAlerts = approvedCorrections.map((c) => {
    const ubs = ubsList.find((u) => u.id === c.ubs_id);
    const ubsName = ubs?.nome || "UBS Desconhecida";
    const periodo = c.periodo === "manha" ? "Manhã" : "Tarde";
    return {
      id: `correction-${c.id}`,
      title: "Correção aprovada",
      description: `Solicitação para ${ubsName} (${periodo}) aprovada. Novo upload liberado.`,
      variant: "success" as const,
    };
  });

  const allAlerts = [...staticAlerts, ...correctionAlerts];

  return (
    <div className="space-y-6">
      {/* Comunicados empilhados (apenas o topo alterado) */}
      <div className="bg-background/80 border-b">
        <div className="max-w-6xl mx-auto px-4 py-4 space-y-3">
          {/* Aviso especial: Atualização do ConsultMed (colorido) */}
          {showConsultMed && (
            <Alert className="border-indigo-300 bg-indigo-50">
              <AlertTitle className="font-semibold text-sm text-indigo-900">
                Atualização do ConsultMed
              </AlertTitle>
              <AlertDescription className="text-xs text-indigo-800">
                Novo visual da tela do usuário, botões mais dinâmicos, textos
                mais explicativos e fluxo simplificado — tudo isso sem
                desconfigurar o código existente. Esta notificação expira
                automaticamente em 23 horas.
              </AlertDescription>
            </Alert>
          )}

          {/* Demais avisos, empilhados */}
          {allAlerts.length === 0 && !showConsultMed ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Info className="h-4 w-4" />
              <span className="text-sm">Nenhum comunicado ativo no momento.</span>
            </div>
          ) : (
            <div className="space-y-3">
              {allAlerts.map((alert) => (
                <DismissibleAlert
                  key={alert.id}
                  id={alert.id}
                  title={alert.title}
                  description={alert.description}
                  variant={alert.variant}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Cabeçalho e conteúdo principal preservados */}
      <div className="max-w-6xl mx-auto px-4 space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Meu Dashboard</h1>
          <p className="text-muted-foreground">
            Gerencie o PDF de medicações da sua UBS
          </p>
        </div>

        <Tabs defaultValue="management" className="space-y-6">
          <TabsList className="grid w-full grid-cols-1 h-auto p-1">
            <TabsTrigger
              value="management"
              className="flex items-center gap-2 py-2"
            >
              <Upload className="h-4 w-4" />
              Gestão de PDF
            </TabsTrigger>
          </TabsList>

          <TabsContent value="management" className="space-y-6">
            {ubsList.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    Nenhuma UBS vinculada
                  </h3>
                  <p className="text-muted-foreground max-w-md">
                    Você não possui UBS vinculada ao seu usuário. Solicite o
                    vínculo ao administrador do sistema.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div
                className={
                  ubsList.length === 1
                    ? "grid grid-cols-1 gap-6 max-w-5xl mx-auto"
                    : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                }
              >
                {ubsList.map((ubs) => {
                  const updatedToday = isPDFUpdatedToday(ubs);
                  const manhaChecked = updateChecks[ubs.id]?.manha || false;
                  const tardeChecked = updateChecks[ubs.id]?.tarde || false;

                  return (
                    <Card
                      key={ubs.id}
                      className="hover:shadow-lg transition-all duration-300"
                    >
                      <CardHeader className="pb-4">
                        <CardTitle className="text-lg font-semibold">
                          {ubs.nome}
                        </CardTitle>
                        <CardDescription className="text-sm">
                          {ubs.localidade} • {ubs.horarios}
                        </CardDescription>
                      </CardHeader>

                      <CardContent className="space-y-4">
                        <div className="text-sm text-muted-foreground">
                          <p>
                            <strong>Responsável:</strong> {ubs.responsavel}
                          </p>
                          {ubs.pdfUltimaAtualizacao && (
                            <div className="flex items-center mt-2">
                              <Calendar className="h-3 w-3 mr-1" />
                              <span>
                                Última atualização: {ubs.pdfUltimaAtualizacao}
                              </span>
                            </div>
                          )}
                        </div>

                        {!isComplete(ubs.id) && (
                          <Alert className="border-amber-500/20 bg-amber-500/5">
                            <AlertTitle className="font-semibold text-sm text-amber-700">
                              Atualização pendente
                            </AlertTitle>
                            <AlertDescription className="text-xs text-amber-600/90">
                              {updatedToday
                                ? manhaChecked && !tardeChecked
                                  ? "Atualizado pela manhã. Envie novo PDF para registrar a tarde."
                                  : "Envie o PDF para registrar a atualização da manhã."
                                : "Envie o PDF para registrar a atualização da manhã."}
                            </AlertDescription>
                          </Alert>
                        )}

                        <div className="rounded-lg p-3 bg-muted/30 space-y-2">
                          <p className="text-xs font-medium text-muted-foreground mb-2">
                            Status de atualização diária
                          </p>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id={`${ubs.id}-manha`}
                              checked={manhaChecked}
                              onCheckedChange={blockedToggle}
                              disabled
                            />
                            <label
                              htmlFor={`${ubs.id}-manha`}
                              className="text-sm font-medium leading-none"
                            >
                              Atualizado pela manhã
                            </label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id={`${ubs.id}-tarde`}
                              checked={tardeChecked}
                              onCheckedChange={blockedToggle}
                              disabled
                            />
                            <label
                              htmlFor={`${ubs.id}-tarde`}
                              className="text-sm font-medium leading-none"
                            >
                              Atualizado pela tarde
                            </label>
                          </div>
                          {isComplete(ubs.id) && (
                            <div className="flex items-center gap-2 text-green-600 pt-1">
                              <CheckCircle2 className="h-4 w-4" />
                              <span className="text-xs font-medium">
                                Atualização completa
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="border-t pt-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <Label className="text-sm font-medium">
                              Arquivo PDF
                            </Label>
                            {ubs.pdfUrl && (
                              <FileText className="h-4 w-4 text-green-600" />
                            )}
                          </div>

                          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                            <Button
                              onClick={() => triggerFileInput(ubs.id)}
                              disabled={
                                uploadingUBS === ubs.id || isComplete(ubs.id)
                              }
                              className="w-full sm:w-auto h-11"
                              size="lg"
                              variant={ubs.pdfUrl ? "outline" : "default"}
                            >
                              <Upload className="h-4 w-4 mr-2" />
                              {uploadingUBS === ubs.id
                                ? "Enviando..."
                                : isComplete(ubs.id)
                                ? "Atualização diária completa"
                                : ubs.pdfUrl
                                ? "Atualizar PDF"
                                : "Enviar PDF"}
                            </Button>

                            {ubs.pdfUrl && (
                              <Button
                                onClick={() => handleDownload(ubs)}
                                variant="ghost"
                                className="w-full sm:w-auto h-11"
                                size="lg"
                              >
                                <Download className="h-4 w-4 mr-2" />
                                Baixar PDF atual
                              </Button>
                            )}

                            <div className="w-full sm:w-auto">
                              <CorrectionRequestModal
                                ubsId={ubs.id}
                                ubsName={ubs.nome}
                                onSuccess={loadUserUBS}
                              />
                            </div>
                          </div>

                          <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                            <p>
                              <strong>Requisitos:</strong>
                            </p>
                            <p>• Formato: PDF</p>
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
        </Tabs>
      </div>
    </div>
  );
};

export default UserDashboard;
