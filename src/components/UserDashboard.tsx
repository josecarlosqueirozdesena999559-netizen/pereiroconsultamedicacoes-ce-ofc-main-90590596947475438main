import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/useAuth'
import { Upload, Download, Calendar, FileText, AlertCircle, CheckCircle2, Info } from 'lucide-react'
import { UBS } from '@/types'
import { getUBS, savePDF, getUpdateChecks, saveUpdateCheck, getApprovedCorrectionsForUser, CorrecaoPDF } from '@/lib/storage'
import CorrectionRequestModal from './CorrectionRequestModal'
import DismissibleAlert from './DismissibleAlert'

const UserDashboard = () => {
  const [ubsList, setUbsList] = useState<UBS[]>([])
  const [uploadingUBS, setUploadingUBS] = useState<string | null>(null)
  const [updateChecks, setUpdateChecks] = useState<Record<string, { manha: boolean; tarde: boolean }>>({})
  const [approvedCorrections, setApprovedCorrections] = useState<CorrecaoPDF[]>([])
  const [showConsultMed, setShowConsultMed] = useState(false)
  const { user } = useAuth()
  const { toast } = useToast()

  const todayFormattedDate = useMemo(() => new Date().toLocaleDateString('pt-BR'), [])

  useEffect(() => { if (!user) return; loadAll() }, [user])

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

  const isPDFUpdatedToday = (ubs: UBS) => ubs.pdfUltimaAtualizacao?.startsWith(todayFormattedDate) || false
  const isComplete = (ubsId: string) => !!(updateChecks[ubsId]?.manha && updateChecks[ubsId]?.tarde)

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
    try {
      const newTimestamp = await savePDF(ubsId, file)
      if (newTimestamp) {
        const checks = await getUpdateChecks(user.id, ubsId)
        const periodToMark = !checks?.manha ? 'manha' : !checks?.tarde ? 'tarde' : null
        if (periodToMark) await saveUpdateCheck(user.id, ubsId, periodToMark)
        toast({ title: 'PDF atualizado com sucesso!', description: 'O envio foi registrado corretamente.' })
      }
    } catch (error) {
      toast({ title: 'Erro no upload', description: 'Não foi possível salvar o arquivo.', variant: 'destructive' })
    } finally {
      setUploadingUBS(null)
      await loadUserUBS()
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

  const staticAlerts = [
    { id: 'welcome', title: 'Bem-vindo ao ConsultMed', description: 'Olá ' + (user?.name || 'usuário') + '! Este é o seu painel personalizado.', variant: 'info' as const },
    { id: 'rules', title: 'Orientações Gerais', description: 'Atualize o PDF de medicações duas vezes ao dia (manhã e tarde). Arquivo máximo: 10MB.', variant: 'warning' as const }
  ]

  const correctionAlerts = approvedCorrections.map(c => {
    const ubs = ubsList.find(u => u.id === c.ubs_id)
    return { id: `correction-${c.id}`, title: 'Correção aprovada', description: `Sua solicitação para ${ubs?.nome || 'UBS'} foi aprovada. Novo envio liberado.`, variant: 'success' as const }
  })

  const allAlerts = [...staticAlerts, ...correctionAlerts]

  return (
    <div className="space-y-8">
      {/* Avisos Empilhados */}
      <div className="bg-background border-b py-4">
        <div className="max-w-6xl mx-auto px-4 space-y-3">
          {showConsultMed && (
            <Alert className="border-blue-400 bg-blue-50">
              <AlertTitle className="font-semibold text-blue-900">Atualização do ConsultMed</AlertTitle>
              <AlertDescription className="text-blue-800 text-sm">Novo layout aprimorado com visual mais moderno, cores destacadas e botões dinâmicos. Experiência mais clara e organizada.</AlertDescription>
            </Alert>
          )}
          {allAlerts.map(a => (
            <DismissibleAlert key={a.id} id={a.id} title={a.title} description={a.description} variant={a.variant} />
          ))}
        </div>
      </div>

      {/* Cabeçalho de Boas-vindas */}
      <div className="max-w-6xl mx-auto px-4">
        <h1 className="text-4xl font-bold tracking-tight text-primary">Olá, {user?.name || 'usuário'}!</h1>
        <p className="text-muted-foreground text-lg">Gerencie facilmente os PDFs de medicações da sua unidade.</p>
      </div>

      {/* Área Principal */}
      <div className="max-w-6xl mx-auto px-4 space-y-6">
        {ubsList.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhuma UBS vinculada</h3>
              <p className="text-muted-foreground max-w-md">Você não possui UBS vinculada ao seu usuário. Solicite o vínculo ao administrador do sistema.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {ubsList.map(ubs => {
              const updatedToday = isPDFUpdatedToday(ubs)
              const manhaChecked = updateChecks[ubs.id]?.manha || false
              const tardeChecked = updateChecks[ubs.id]?.tarde || false
              const completo = isComplete(ubs.id)

              return (
                <Card key={ubs.id} className="hover:shadow-xl border-primary/20">
                  <CardHeader className="pb-3 bg-primary/5 rounded-t-lg">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg font-semibold text-primary">{ubs.nome}</CardTitle>
                      {completo ? (
                        <Badge variant="success">Completo</Badge>
                      ) : updatedToday ? (
                        <Badge variant="outline">Parcial</Badge>
                      ) : (
                        <Badge variant="secondary">Pendente</Badge>
                      )}
                    </div>
                    <CardDescription className="text-sm text-muted-foreground">{ubs.localidade} • {ubs.horarios}</CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <div className="text-sm text-muted-foreground">
                      <p><strong>Responsável:</strong> {ubs.responsavel}</p>
                      {ubs.pdfUltimaAtualizacao && (
                        <div className="flex items-center mt-1">
                          <Calendar className="h-3 w-3 mr-1" />
                          <span>Última atualização: {ubs.pdfUltimaAtualizacao}</span>
                        </div>
                      )}
                    </div>

                    <div className="bg-muted/30 rounded-md p-3">
                      <p className="text-xs font-medium mb-2">Status de atualização</p>
                      <div className="flex items-center gap-2">
                        <Checkbox id={`${ubs.id}-manha`} checked={manhaChecked} disabled />
                        <label htmlFor={`${ubs.id}-manha`} className="text-sm">Atualizado Manhã</label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox id={`${ubs.id}-tarde`} checked={tardeChecked} disabled />
                        <label htmlFor={`${ubs.id}-tarde`} className="text-sm">Atualizado Tarde</label>
                      </div>
                      {completo && (
                        <div className="flex items-center gap-2 text-green-600 pt-1">
                          <CheckCircle2 className="h-4 w-4" />
                          <span className="text-xs font-medium">Atualização completa</span>
                        </div>
                      )}
                    </div>

                    <div className="pt-3 space-y-3 border-t">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium">Arquivo PDF</Label>
                        {ubs.pdfUrl && <FileText className="h-4 w-4 text-green-600" />}
                      </div>

                      <Button onClick={() => triggerFileInput(ubs.id)} disabled={uploadingUBS === ubs.id || completo} className="w-full h-11 text-base font-semibold" variant={ubs.pdfUrl ? 'outline' : 'default'}>
                        <Upload className="h-4 w-4 mr-2" />
                        {uploadingUBS === ubs.id ? 'Enviando...' : completo ? 'Atualização completa' : ubs.pdfUrl ? 'Atualizar PDF' : 'Enviar PDF'}
                      </Button>

                      {ubs.pdfUrl && (
                        <Button onClick={() => handleDownload(ubs)} variant="ghost" className="w-full h-11 text-base">
                          <Download className="h-4 w-4 mr-2" />
                          Baixar PDF atual
                        </Button>
                      )}

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
      </div>
    </div>
  )
}

export default UserDashboard
