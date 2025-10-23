import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/useAuth'
import { Upload, Download, Calendar, FileText, AlertCircle, CheckCircle2, Info } from 'lucide-react'
import { UBS } from '@/types'
import { getUBS, savePDF, getUpdateChecks, saveUpdateCheck, getApprovedCorrectionsForUser, CorrecaoPDF } from '@/lib/storage'
import CorrectionRequestModal from './CorrectionRequestModal'
import DismissibleAlert from './DismissibleAlert'

/**
 * USER DASHBOARD – CLEAN LAYOUT
 * - Sticky notice bar at the top (Avisos).
 * - Single "Gestão de PDFs" tab kept for future extensibility.
 * - Search + quick filters row.
 * - Clean, consistent UBS cards grid.
 * - Clear status chips (Manhã/Tarde) and concise banner inside each card.
 * - Removes duplicate alert IDs and repetitive texts.
 */

const UserDashboard = () => {
  const [ubsList, setUbsList] = useState<UBS[]>([])
  const [uploadingUBS, setUploadingUBS] = useState<string | null>(null)
  const [updateChecks, setUpdateChecks] = useState<Record<string, { manha: boolean; tarde: boolean }>>({})
  const [approvedCorrections, setApprovedCorrections] = useState<CorrecaoPDF[]>([])
  const [showConsultMed, setShowConsultMed] = useState(false)
      const { user } = useAuth()
  const { toast } = useToast()

  // Data format (DD/MM/AAAA) used to compare only the date portion
  const todayFormattedDate = useMemo(() => new Date().toLocaleDateString('pt-BR'), [])

  useEffect(() => { if (!user) return; loadAll() }, [user])

  // Aviso "Atualização do ConsultMed" – dura 23h, sem botão de fechar
  useEffect(() => {
    try {
      const key = 'consultmed_notice_shownAt'
      const now = Date.now()
      const shownAt = Number(localStorage.getItem(key) || 0)
      const TTL = 23 * 60 * 60 * 1000
      if (!shownAt || now - shownAt > TTL) {
        setShowConsultMed(true)
        localStorage.setItem(key, String(now))
        setTimeout(() => setShowConsultMed(false), TTL)
      }
    } catch (_) {
      setShowConsultMed(true)
    }
  }, [])

  const loadAll = async () => {
    await Promise.all([loadUserUBS(), loadApprovedCorrections()])
  }

  const loadApprovedCorrections = async () => {
    if (!user) return
    try {
      const corrections = await getApprovedCorrectionsForUser(user.id)
      setApprovedCorrections(corrections)
    } catch (error) {
      console.error('Erro ao carregar correções aprovadas:', error)
    }
  }

  const loadUpdateChecksForUBS = async (ubsId: string) => {
    if (!user) return
    const checks = await getUpdateChecks(user.id, ubsId)
    setUpdateChecks(prev => ({ ...prev, [ubsId]: checks ?? { manha: false, tarde: false } }))
  }

  const loadUserUBS = async () => {
    try {
      const allUBS = await getUBS()
      const userUBS = allUBS.filter(ubs => user?.ubsVinculadas.includes(ubs.id))
      setUbsList(userUBS)
      await Promise.all(userUBS.map(ubs => loadUpdateChecksForUBS(ubs.id)))
    } catch (error) {
      console.error('Erro ao carregar UBS do usuário:', error)
    }
  }

  const isPDFUpdatedToday = (ubs: UBS) => {
    return ubs.pdfUltimaAtualizacao?.startsWith(todayFormattedDate) || false
  }

  const isComplete = (ubsId: string) => {
    const checks = updateChecks[ubsId]
    return !!(checks?.manha && checks?.tarde)
  }

  const pendingStatus = (ubsId: string, updatedToday: boolean) => {
    const checks = updateChecks[ubsId]
    if (!updatedToday) return 'Falta subir Manhã'
    if (checks?.manha && !checks?.tarde) return 'Falta subir Tarde'
    if (!checks?.manha && !checks?.tarde) return 'Falta subir Manhã'
    return 'Concluído'
  }

  const blockedToggle = () => {
    toast({
      title: 'Ação bloqueada',
      description: 'A marcação é automática após o upload do PDF.',
      variant: 'destructive',
    })
  }

  const handleFileUpload = async (ubsId: string, file: File) => {
    if (!file || !user) return

    if (file.type !== 'application/pdf') {
      toast({ title: 'Formato inválido', description: 'Selecione apenas arquivos PDF.', variant: 'destructive' })
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: 'Arquivo muito grande', description: 'Tamanho máximo: 10MB.', variant: 'destructive' })
      return
    }

    setUploadingUBS(ubsId)
    let uploadSuccess = false
    let periodMarked: 'manha' | 'tarde' | null = null

    try {
      const newTimestamp = await savePDF(ubsId, file)
      uploadSuccess = !!newTimestamp

      if (uploadSuccess) {
        const currentChecks = await getUpdateChecks(user.id, ubsId)
        const manhaChecked = currentChecks?.manha || false
        const tardeChecked = currentChecks?.tarde || false
        let periodToMark: 'manha' | 'tarde' | null = null
        if (!manhaChecked) periodToMark = 'manha'
        else if (!tardeChecked) periodToMark = 'tarde'

        if (periodToMark) {
          const success = await saveUpdateCheck(user.id, ubsId, periodToMark)
          if (success) periodMarked = periodToMark
        }
      }
    } catch (error) {
      console.error('Erro durante o upload ou registro:', error)
      toast({ title: 'Erro no upload', description: 'Não foi possível salvar o arquivo.', variant: 'destructive' })
    } finally {
      setUploadingUBS(null)
      await loadUserUBS()
      if (uploadSuccess) {
        const msg = periodMarked
          ? `Arquivo atualizado. Marcação de ${periodMarked === 'manha' ? 'Manhã' : 'Tarde'} registrada.`
          : isComplete(ubsId)
          ? 'Arquivo atualizado. Manhã e Tarde já estavam completos.'
          : 'Arquivo atualizado. Não foi possível registrar o check diário.'
        toast({ title: 'PDF atualizado com sucesso!', description: msg })
      }
    }
  }

  const triggerFileInput = (ubsId: string) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.pdf'
    input.onchange = e => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) handleFileUpload(ubsId, file)
    }
    input.click()
  }

  const handleDownload = (ubs: UBS) => {
    if (!ubs.pdfUrl) return
    const link = document.createElement('a')
    link.href = ubs.pdfUrl
    link.download = `medicacoes_${ubs.nome.replace(/\s+/g, '_')}.pdf`
    link.click()
  }

  // STATIC ALERTS (IDs MUST BE UNIQUE)
  const staticAlerts = [
    {
      id: 'welcome-guide',
      title: 'Bem-vindo ao Painel do Usuário',
      description: 'Mantenha o PDF de medicações atualizado duas vezes ao dia (manhã e tarde).',
      variant: 'info' as const,
    },
    {
      id: 'upload-rule',
      title: 'Regras de Envio',
      description: 'São aceitos apenas arquivos PDF com até 10MB. Verifique o conteúdo antes de enviar.',
      variant: 'warning' as const,
    },
    {
      id: 'wrong-pdf-tip',
      title: 'Correção de envio',
      description: 'Utilize o botão “Solicitar correção” no cartão da UBS para liberar um novo envio.',
      variant: 'warning' as const,
    },
  ]

  // DYNAMIC ALERTS (Correções aprovadas)
  const correctionAlerts = approvedCorrections.map(c => {
    const ubs = ubsList.find(u => u.id === c.ubs_id)
    const ubsName = ubs?.nome || 'UBS Desconhecida'
    const periodo = c.periodo === 'manha' ? 'Manhã' : 'Tarde'
    return {
      id: `correction-approved-${c.id}`,
      title: 'Correção aprovada',
      description: `Solicitação para ${ubsName} (${periodo}) aprovada. Novo upload liberado.`,
      variant: 'success' as const,
    }
  })

  const allAlerts = [...staticAlerts, ...correctionAlerts]

      )
    if (!showOnlyPending) return base
    return base.filter(ubs => !isComplete(ubs.id))
  }, [ubsList, query, showOnlyPending])

  return (
    <div className="space-y-6">
      {/* Sticky notice bar */}
      <div className="sticky top-0 z-20 -mx-2 sm:mx-0 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        {allAlerts.length === 0 ? (
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-2 text-muted-foreground">
            <Info className="h-4 w-4" />
            <span className="text-sm">Nenhum comunicado ativo no momento.</span>
          </div>
        ) : (
          <div className="max-w-6xl mx-auto px-4 py-3 flex gap-3 overflow-x-auto snap-x">
            {showConsultMed && (
              <div className="min-w-[320px] snap-start">
                <Alert className="border-primary/20 bg-primary/5">
                  <AlertTitle className="font-semibold text-sm">Atualização do ConsultMed</AlertTitle>
                  <AlertDescription className="text-xs">Novo visual da tela do usuário, botões mais dinâmicos, textos mais explicativos e fluxo simplificado sem desconfigurar o código.</AlertDescription>
                </Alert>
              </div>
            )}
            {allAlerts.map(alert => (
              <div key={alert.id} className="min-w-[320px] snap-start">
                <DismissibleAlert id={alert.id} title={alert.title} description={alert.description} variant={alert.variant} />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="max-w-6xl mx-auto px-4 space-y-6">
        {/* Page header */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Meu Dashboard</h1>
            <p className="text-muted-foreground">Gerencie os PDFs de medicações das suas UBS</p>
          </div>
        </div>

        {<Tabs defaultValue="management" className="space-y-6">
          <TabsList className="grid w-full grid-cols-1 h-auto p-1">
            <TabsTrigger value="management" className="flex items-center gap-2 py-2">
              <Upload className="h-4 w-4" />
              Gestão de PDFs
            </TabsTrigger>
          </TabsList>

          <TabsContent value="management" className="space-y-6">
            {ubsList.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Nenhuma UBS encontrada</h3>
                  <p className="text-muted-foreground max-w-md">Verifique os filtros ou solicite ao administrador o vínculo com sua UBS.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {ubsList.map(ubs =>) {
                  const updatedToday = isPDFUpdatedToday(ubs)
                  const manhaChecked = updateChecks[ubs.id]?.manha || false
                  const tardeChecked = updateChecks[ubs.id]?.tarde || false

                  const statusText = pendingStatus(ubs.id, updatedToday)
                  const statusVariant = isComplete(ubs.id) ? 'success' : updatedToday ? 'default' : 'secondary'

                  return (
                    <Card key={ubs.id} className="hover:shadow-lg transition-all duration-300">
                      <CardHeader className="pb-4">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <CardTitle className="text-lg font-semibold">{ubs.nome}</CardTitle>
                            <CardDescription className="text-sm">{ubs.localidade} • {ubs.horarios}</CardDescription>
                          </div>
                          <Badge variant={statusVariant as any}>{statusText}</Badge>
                        </div>
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
                          <Alert className={updatedToday ? 'border-primary/20 bg-primary/5' : 'border-amber-500/20 bg-amber-500/5'}>
                            <AlertTitle className={`font-semibold text-sm ${updatedToday ? 'text-primary' : 'text-amber-700'}`}>
                              {statusText}
                            </AlertTitle>
                            <AlertDescription className={`text-xs ${updatedToday ? 'text-primary/90' : 'text-amber-600/90'}`}>
                              {updatedToday
                                ? manhaChecked && !tardeChecked
                                  ? 'Atualizado pela manhã. Envie novo PDF para registrar a tarde.'
                                : 'Envie o PDF para registrar a atualização da manhã.'
                                : 'Envie o PDF para registrar a atualização da manhã.'}
                            </AlertDescription>
                          </Alert>
                        )}

                        <div className="rounded-lg p-3 bg-muted/30 space-y-2">
                          <p className="text-xs font-medium text-muted-foreground mb-2">Status de atualização diária</p>
                          <div className="flex items-center space-x-2">
                            <Checkbox id={`${ubs.id}-manha`} checked={manhaChecked} onCheckedChange={blockedToggle} disabled />
                            <label htmlFor={`${ubs.id}-manha`} className="text-sm font-medium leading-none">Atualizado pela manhã</label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox id={`${ubs.id}-tarde`} checked={tardeChecked} onCheckedChange={blockedToggle} disabled />
                            <label htmlFor={`${ubs.id}-tarde`} className="text-sm font-medium leading-none">Atualizado pela tarde</label>
                          </div>
                          {isComplete(ubs.id) && (
                            <div className="flex items-center gap-2 text-green-600 pt-1">
                              <CheckCircle2 className="h-4 w-4" />
                              <span className="text-xs font-medium">Atualização completa</span>
                            </div>
                          )}
                        </div>

                        <div className="border-t pt-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <Label className="text-sm font-medium">Arquivo PDF</Label>
                            {ubs.pdfUrl && <FileText className="h-4 w-4 text-green-600" />}
                          </div>

                          <div className="space-y-2">
                            <Button onClick={() => triggerFileInput(ubs.id)} disabled={uploadingUBS === ubs.id || isComplete(ubs.id)} className="w-full" variant={ubs.pdfUrl ? 'outline' : 'default'}>
                              <Upload className="h-4 w-4 mr-2" />
                              {uploadingUBS === ubs.id ? 'Enviando...' : isComplete(ubs.id) ? 'Atualização diária completa' : ubs.pdfUrl ? 'Atualizar PDF' : 'Enviar PDF'}
                            </Button>
                            {ubs.pdfUrl && (
                              <Button onClick={() => handleDownload(ubs)} variant="ghost" className="w-full">
                                <Download className="h-4 w-4 mr-2" />
                                Baixar PDF atual
                              </Button>
                            )}
                          </div>

                          <CorrectionRequestModal ubsId={ubs.id} ubsName={ubs.nome} onSuccess={loadUserUBS} />

                          <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                            <p><strong>Requisitos:</strong></p>
                            <p>• Formato: PDF</p>
                            <p>• Tamanho máximo: 10MB</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

export default UserDashboard
