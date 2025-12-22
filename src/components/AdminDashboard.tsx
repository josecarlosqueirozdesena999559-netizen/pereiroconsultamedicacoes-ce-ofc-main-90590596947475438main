import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit2, Trash2, Building2, Users, UserPlus, Link, Unlink, Calendar, CheckCircle2, Circle, AlertCircle, Clock, Check, X, Download, RefreshCw, Search, Pill } from 'lucide-react';
import { UBS, User } from '@/types';
import { getUBS, deleteUBS, getUsers, deleteUser, toggleUserUBSLink, getPendingCorrections, approvePDFCorrection, rejectPDFCorrection, CorrecaoPDF, getUpdateChecksHistory, UpdateCheckHistory } from '@/lib/storage';
import { supabase } from '@/integrations/supabase/client';
import UserExportPDF from './UserExportPDF';
import UBSFormModal from './UBSFormModal';
import UserFormModal from './UserFormModal';
import CorrectionConfirmationDialog from './CorrectionConfirmationDialog';
import GestaoAutoCusto from './GestaoAutoCusto';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, subDays, startOfDay, isBefore } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import UpdateReportPDF from './UpdateReportPDF';

interface UpdateStatus {
  ubs_id: string;
  user_id: string;
  manha: boolean;
  tarde: boolean;
  data: string;
}

// Data mínima para coleta de dados (20 de Outubro de 2025, 00:00:00)
const MIN_REPORT_DATE = startOfDay(new Date(2025, 9, 20)); // Mês é 0-indexado (Outubro é 9)

const AdminDashboard = () => {
  const [ubsList, setUbsList] = useState<UBS[]>([]);
  const [usersList, setUsersList] = useState<User[]>([]);
  const [updateStatuses, setUpdateStatuses] = useState<UpdateStatus[]>([]);
  const [pendingCorrections, setPendingCorrections] = useState<CorrecaoPDF[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [reportPeriod, setReportPeriod] = useState<'week' | 'month'>('week');
  const [reportHistory, setReportHistory] = useState<UpdateCheckHistory[]>([]);
  const [isCorrectionLoading, setIsCorrectionLoading] = useState(false);
  const [consultaSUSAtiva, setConsultaSUSAtiva] = useState(false);
  const [showAutoCusto, setShowAutoCusto] = useState(false);
  
  // Modal States
  const [isUBSDialogOpen, setIsUBSDialogOpen] = useState(false);
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
  const [editingUBS, setEditingUBS] = useState<UBS | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  
  const { toast } = useToast();

  const loadPendingCorrectionsData = async () => {
    setIsCorrectionLoading(true);
    try {
      const correctionsData = await getPendingCorrections();
      setPendingCorrections(correctionsData);
    } catch (error) {
      console.error('Erro ao carregar correções pendentes:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar correções pendentes.",
        variant: "destructive",
      });
    } finally {
      setIsCorrectionLoading(false);
    }
  };

  const loadData = async () => {
    try {
      const [ubsData, usersData] = await Promise.all([
        getUBS(),
        getUsers(),
      ]);
      setUbsList(ubsData);
      setUsersList(usersData);
      await loadPendingCorrectionsData(); 
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar dados do sistema.",
        variant: "destructive",
      });
    }
  };

  const loadUpdateStatuses = async (date: Date) => {
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const selectedDateString = format(date, 'yyyy-MM-dd');

      if (selectedDateString === today) {
        await supabase.rpc('cleanup_old_update_checks');
      }
      
      const { data, error } = await supabase
        .from('update_checks')
        .select('*')
        .eq('data', selectedDateString);

      if (error) throw error;
      setUpdateStatuses(data || []);
    } catch (error) {
      console.error('Erro ao carregar status de atualizações:', error);
    }
  };

  const loadReportHistory = async (period: 'week' | 'month') => {
    const reportEndDate = startOfDay(new Date());
    let calculatedStartDate: Date;

    if (period === 'week') {
      calculatedStartDate = subDays(reportEndDate, 6);
    } else {
      calculatedStartDate = subDays(reportEndDate, 29);
    }
    
    const startDate = isBefore(calculatedStartDate, MIN_REPORT_DATE) ? MIN_REPORT_DATE : calculatedStartDate;
    
    const startString = format(startDate, 'yyyy-MM-dd');
    const endString = format(reportEndDate, 'yyyy-MM-dd');

    try {
      const history = await getUpdateChecksHistory(startString, endString);
      setReportHistory(history);
      
    } catch (error) {
      toast({
        title: "Erro ao carregar histórico",
        description: "Não foi possível carregar os dados para o relatório.",
        variant: "destructive",
      });
      setReportHistory([]);
    }
  };

  // CONSOLIDATED EFFECT FOR INITIAL LOAD AND REALTIME
  useEffect(() => {
    // Initial Load
    loadData();
    loadReportHistory(reportPeriod);
    
    // Load today's status immediately
    const today = startOfDay(new Date());
    loadUpdateStatuses(today);

    // Load consulta SUS config
    const loadConfig = async () => {
      const { data } = await supabase
        .from('config_sistema')
        .select('valor')
        .eq('chave', 'consulta_sus_ativa')
        .maybeSingle();
      setConsultaSUSAtiva(data?.valor === 'true');
    };
    loadConfig();

    // 1. Realtime Subscriptions Setup
    
    // --- A. Core Data (UBS, Users, Links) ---
    const coreDataChannel = supabase
      .channel('core_data_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'postos' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'usuarios' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'usuario_posto' }, () => loadData())
      .subscribe();

    // --- B. Corrections ---
    // Mantemos o realtime, mas o botão manual é um fallback/melhoria de UX
    const correctionsChannel = supabase
      .channel('correcoes_pdf_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'correcoes_pdf' }, () => loadPendingCorrectionsData())
      .subscribe();

    // --- C. Daily Updates (update_checks) ---
    const updatesChannel = supabase
      .channel('update_checks_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'update_checks' }, () => {
          // Reload today's status when a check is inserted/updated
          loadUpdateStatuses(today);
      })
      .subscribe();
      
    // --- D. Cleanup Interval (Runs every minute to check for midnight) ---
    const checkDateChange = setInterval(() => {
      const now = new Date();
      if (now.getHours() === 0 && now.getMinutes() === 0) {
        // If it's midnight, force reload status for the new day
        loadUpdateStatuses(new Date());
      }
    }, 60000); 

    // Cleanup
    return () => {
      clearInterval(checkDateChange);
      supabase.removeChannel(coreDataChannel);
      supabase.removeChannel(correctionsChannel);
      supabase.removeChannel(updatesChannel);
    };
  }, []); // Empty dependency array for initial setup

  // EFFECT FOR REPORT HISTORY (Depends on reportPeriod state)
  useEffect(() => {
    loadReportHistory(reportPeriod);
  }, [reportPeriod]);


  const handleUBSModalOpen = (ubs: UBS | null = null) => {
    setEditingUBS(ubs);
    setIsUBSDialogOpen(true);
  };

  const handleUserModalOpen = (user: User | null = null) => {
    setEditingUser(user);
    setIsUserDialogOpen(true);
  };

  const handleDeleteUBS = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta UBS?')) {
      await deleteUBS(id);
      await loadData();
      toast({
        title: "UBS excluída",
        description: "A UBS foi removida do sistema.",
      });
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este usuário?')) {
      await deleteUser(id);
      await loadData();
      toast({
        title: "Usuário excluído",
        description: "O usuário foi removido do sistema.",
      });
    }
  };

  const toggleUBSLink = async (userId: string, ubsId: string) => {
    const user = usersList.find(u => u.id === userId);
    if (!user) return;

    try {
      // Verifica se o vínculo existe na lista de UBS vinculadas do usuário
      const isLinked = user.ubsVinculadas.includes(ubsId);

      // Alterna o vínculo usando a nova função N:M
      const ok = await toggleUserUBSLink(userId, ubsId, isLinked);
      if (!ok) throw new Error('Falha ao atualizar vínculo');

      // Recarregar dados para refletir a mudança (Realtime fará isso, mas chamamos loadData para garantir)
      await loadData();

      const ubs = ubsList.find(u => u.id === ubsId);
      toast({
        title: isLinked ? 'Vinculação removida' : 'Vinculação criada',
        description: isLinked
          ? `Vínculo removido entre ${user.nome} e ${ubs?.nome ?? 'UBS'}.`
          : `${user.nome} vinculado a ${ubs?.nome ?? 'UBS'}.`,
      });
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao atualizar vinculação.',
        variant: 'destructive',
      });
    }
  };

  const getUpdateStatus = (ubsId: string, userId: string) => {
    const status = updateStatuses.find(s => s.ubs_id === ubsId && s.user_id === userId);
    if (!status) return 'none';
    if (status.manha && status.tarde) return 'complete';
    if (status.manha || status.tarde) return 'partial';
    return 'none';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'complete':
        return 'bg-success text-success-foreground';
      case 'partial':
        return 'bg-success/50 text-success-foreground';
      case 'none':
        return 'bg-destructive text-destructive-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'complete':
        return <CheckCircle2 className="h-4 w-4" />;
      case 'partial':
        return <Circle className="h-4 w-4" />;
      case 'none':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Circle className="h-4 w-4" />;
    }
  };

  const getStatusText = (status: string, ubsId: string, userId: string) => {
    const check = updateStatuses.find(s => s.ubs_id === ubsId && s.user_id === userId);
    switch (status) {
      case 'complete':
        return 'Atualizado (Manhã e Tarde)';
      case 'partial':
        return check?.manha ? 'Atualizado (Manhã)' : 'Atualizado (Tarde)';
      case 'none':
        return 'Não atualizado';
      default:
        return 'Sem dados';
    }
  };
  
  const handleApproveCorrection = async (correction: CorrecaoPDF) => {
    const ubs = ubsList.find(u => u.id === correction.ubs_id);
    const user = usersList.find(u => u.id === correction.user_id);

    if (!ubs || !user) {
      toast({ title: "Erro", description: "UBS ou Usuário não encontrado.", variant: "destructive" });
      return;
    }
    
    const success = await approvePDFCorrection(correction.id, correction.ubs_id, correction.user_id, correction.periodo);
    
    if (success) {
      toast({
        title: "Correção Aprovada",
        description: `O check de ${correction.periodo} foi liberado para ${user.nome} na UBS ${ubs.nome}.`,
      });
      // Recarrega manualmente para garantir feedback imediato
      loadPendingCorrectionsData();
    } else {
      toast({
        title: "Erro na Aprovação",
        description: "Não foi possível aprovar a correção.",
        variant: "destructive",
      });
    }
  };

  const handleRejectCorrection = async (correction: CorrecaoPDF) => {
    const ubs = ubsList.find(u => u.id === correction.ubs_id);
    const user = usersList.find(u => u.id === correction.user_id);

    if (!ubs || !user) {
      toast({ title: "Erro", description: "UBS ou Usuário não encontrado.", variant: "destructive" });
      return;
    }
    
    const success = await rejectPDFCorrection(correction.id);
    
    if (success) {
      toast({
        title: "Correção Rejeitada",
        description: `A solicitação de correção para a UBS ${ubs.nome} foi rejeitada.`,
      });
      // Recarrega manualmente para garantir feedback imediato
      loadPendingCorrectionsData();
    } else {
      toast({
        title: "Erro na Rejeição",
        description: "Não foi possível rejeitar a correção.",
        variant: "destructive",
      });
    }
  };

  const getCorrectionDetails = (correction: CorrecaoPDF) => {
    const ubs = ubsList.find(u => u.id === correction.ubs_id);
    const user = usersList.find(u => u.id === correction.user_id);
    return { ubs, user };
  };

  // Calcula as datas para o relatório
  const reportEndDate = startOfDay(new Date());
  let calculatedStartDate = reportPeriod === 'week' ? subDays(reportEndDate, 6) : subDays(reportEndDate, 29);
  
  // Aplica a regra de data mínima
  const reportStartDate = isBefore(calculatedStartDate, MIN_REPORT_DATE) ? MIN_REPORT_DATE : calculatedStartDate;


  const toggleConsultaSUS = async (value: boolean) => {
    try {
      const { data: existing } = await supabase
        .from('config_sistema')
        .select('id')
        .eq('chave', 'consulta_sus_ativa')
        .maybeSingle();

      if (existing) {
        await supabase.from('config_sistema').update({ valor: value ? 'true' : 'false' }).eq('id', existing.id);
      } else {
        await supabase.from('config_sistema').insert({ chave: 'consulta_sus_ativa', valor: value ? 'true' : 'false' });
      }

      setConsultaSUSAtiva(value);
      toast({
        title: value ? "Consulta SUS Ativada" : "Consulta SUS Desativada",
        description: value ? "O botão de consulta está visível na página inicial." : "O botão foi removido da página inicial.",
      });
    } catch (error) {
      toast({ title: "Erro", description: "Erro ao alterar configuração.", variant: "destructive" });
    }
  };

  // Se showAutoCusto está ativo, renderiza tela cheia do Alto Custo
  if (showAutoCusto) {
    return (
      <div className="fixed inset-0 z-50 bg-background overflow-auto">
        <div className="sticky top-0 z-10 bg-background border-b border-border p-3 sm:p-4 flex items-center justify-between">
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-primary flex items-center gap-2">
            <Pill className="h-5 w-5 sm:h-6 sm:w-6" />
            Gestão de Medicamentos Alto Custo
          </h1>
          <Button 
            variant="outline" 
            size="icon"
            onClick={() => setShowAutoCusto(false)}
            className="h-9 w-9 sm:h-10 sm:w-10"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
        <div className="p-3 sm:p-4 md:p-6">
          <GestaoAutoCusto />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:gap-4">
        <div className="text-center sm:text-left">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-primary">Dashboard Administrativo</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">Gerencie UBS, usuários e vinculações</p>
        </div>
        <div className="flex items-center justify-center sm:justify-start gap-2 sm:gap-3 p-2 sm:p-3 bg-primary/5 rounded-lg border border-primary/20">
          <Search className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
          <Label htmlFor="consulta-sus-toggle" className="text-xs sm:text-sm font-medium">Consulta SUS</Label>
          <Switch id="consulta-sus-toggle" checked={consultaSUSAtiva} onCheckedChange={toggleConsultaSUS} />
        </div>
      </div>

      <Tabs defaultValue="updates" className="space-y-4 sm:space-y-6">
        <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6 h-auto p-1 gap-1">
          <TabsTrigger value="ubs" className="flex items-center justify-center gap-1 sm:gap-2 py-1.5 sm:py-2 text-xs sm:text-sm">
            <Building2 className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden xs:inline sm:inline">UBS</span>
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center justify-center gap-1 sm:gap-2 py-1.5 sm:py-2 text-xs sm:text-sm">
            <Users className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden xs:inline sm:inline">Usuários</span>
          </TabsTrigger>
          <TabsTrigger value="links" className="flex items-center justify-center gap-1 sm:gap-2 py-1.5 sm:py-2 text-xs sm:text-sm">
            <Link className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden xs:inline sm:inline">Vínculos</span>
          </TabsTrigger>
          <TabsTrigger value="updates" className="flex items-center justify-center gap-1 sm:gap-2 py-1.5 sm:py-2 text-xs sm:text-sm">
            <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden xs:inline sm:inline">Atualizações</span>
          </TabsTrigger>
          <TabsTrigger value="corrections" className="flex items-center justify-center gap-1 sm:gap-2 py-1.5 sm:py-2 text-xs sm:text-sm relative">
            <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden xs:inline sm:inline">Correções</span>
            {pendingCorrections.length > 0 && (
              <Badge variant="destructive" className="absolute -top-1 -right-1 h-4 w-4 sm:h-5 sm:w-5 p-0 flex items-center justify-center rounded-full text-[10px] sm:text-xs">
                {pendingCorrections.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger 
            value="gestao-auto-custo" 
            className="flex items-center justify-center gap-1 sm:gap-2 py-1.5 sm:py-2 text-xs sm:text-sm"
            onClick={(e) => {
              e.preventDefault();
              setShowAutoCusto(true);
            }}
          >
            <Pill className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden xs:inline sm:inline">Alto Custo</span>
          </TabsTrigger>
        </TabsList>

        {/* --- ABA: UBS --- */}
        <TabsContent value="ubs" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-semibold">Unidades Básicas de Saúde</h2>
            <Dialog open={isUBSDialogOpen} onOpenChange={setIsUBSDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => handleUBSModalOpen()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nova UBS
                </Button>
              </DialogTrigger>
              <UBSFormModal 
                isOpen={isUBSDialogOpen}
                setIsOpen={setIsUBSDialogOpen}
                editingUBS={editingUBS}
                onSave={loadData}
              />
            </Dialog>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {ubsList.map((ubs) => (
              <Card key={ubs.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">{ubs.nome}</CardTitle>
                    <Badge variant={ubs.status === 'aberto' ? 'default' : 'secondary'}>
                      {ubs.status === 'aberto' ? 'Aberto' : 'Fechado'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p><strong>Local:</strong> {ubs.localidade}</p>
                    <p><strong>Horários:</strong> {ubs.horarios}</p>
                    <p><strong>Responsável(is):</strong> {ubs.responsavel}</p>
                    {ubs.contato && <p><strong>Contato:</strong> {ubs.contato}</p>}
                  </div>
                  <div className="flex justify-end space-x-2 mt-4">
                    <Button size="sm" variant="outline" onClick={() => handleUBSModalOpen(ubs)}>
                      <Edit2 className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleDeleteUBS(ubs.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* --- ABA: USUÁRIOS --- */}
        <TabsContent value="users" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-semibold">Usuários do Sistema</h2>
            <div className="flex gap-3">
              <UserExportPDF users={usersList} />
              <Dialog open={isUserDialogOpen} onOpenChange={setIsUserDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => handleUserModalOpen()}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Novo Usuário
                  </Button>
                </DialogTrigger>
                <UserFormModal 
                  isOpen={isUserDialogOpen}
                  setIsOpen={setIsUserDialogOpen}
                  editingUser={editingUser}
                  onSave={loadData}
                />
              </Dialog>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {usersList.map((user) => (
              <Card key={user.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">{user.nome}</CardTitle>
                    <Badge variant={user.tipo === 'admin' ? 'default' : 'secondary'}>
                      {user.tipo === 'admin' ? 'Admin' : 'Responsável'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      <strong>Email:</strong> {user.login}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      <strong>UBS Vinculadas:</strong> {user.ubsVinculadas.length}
                    </p>
                    {user.ubsVinculadas.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {user.ubsVinculadas.map(ubsId => {
                          const ubs = ubsList.find(u => u.id === ubsId);
                          return ubs ? (
                            <Badge key={ubsId} variant="outline" className="text-xs">
                              {ubs.nome}
                            </Badge>
                          ) : null;
                        })}
                      </div>
                    )}
                  </div>
                  <div className="flex justify-end space-x-2 mt-4">
                    <Button size="sm" variant="outline" onClick={() => handleUserModalOpen(user)}>
                      <Edit2 className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleDeleteUser(user.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* --- ABA: VINCULAÇÕES --- */}
        <TabsContent value="links" className="space-y-4">
          <h2 className="text-2xl font-semibold">Gerenciar Vinculações (N:M)</h2>
          <p className="text-muted-foreground text-sm">
            Clique no nome da UBS para vincular ou desvincular o responsável. Um responsável pode gerenciar múltiplas UBS.
          </p>
          
          {/* Removendo ScrollArea */}
          <div className="grid gap-4 pr-4">
            {usersList.filter(user => user.tipo === 'responsavel').map((user) => (
              <Card key={user.id}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between text-lg">
                    <span>{user.nome}</span>
                    <Badge variant="outline">
                      {user.ubsVinculadas.length} UBS vinculada(s)
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    {ubsList.map((ubs) => {
                      // Verifica se o vínculo existe na lista de UBS vinculadas do usuário
                      const isLinked = user.ubsVinculadas.includes(ubs.id);
                      return (
                        <Button
                          key={ubs.id}
                          variant={isLinked ? "default" : "outline"}
                          size="sm"
                          onClick={() => toggleUBSLink(user.id, ubs.id)}
                          className={`justify-between transition-all duration-200 ${
                            isLinked 
                              ? "bg-success hover:bg-success/90 text-white border-success" 
                              : "border-gray-300 hover:border-success/50 hover:bg-success/5 text-foreground"
                          }`}
                        >
                          <span className="truncate">{ubs.nome}</span>
                          {isLinked ? (
                            <Unlink className="h-3 w-3 ml-2 flex-shrink-0" />
                          ) : (
                            <Link className="h-3 w-3 ml-2 flex-shrink-0" />
                          )}
                        </Button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* --- ABA: ATUALIZAÇÕES --- */}
        <TabsContent value="updates" className="space-y-4 animate-fade-in">
          <Card className="bg-gradient-to-r from-primary/5 to-primary/10 rounded-xl p-4 border border-primary/10">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <h2 className="text-xl md:text-2xl font-bold text-primary mb-1">Status de Atualizações</h2>
                <p className="text-xs text-muted-foreground">Acompanhe as atualizações dos PDFs por data.</p>
              </div>
              
              {/* Seletor de Data (Mantido desabilitado conforme a lógica atual) */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-[280px] justify-start text-left font-normal",
                      !selectedDate && "text-muted-foreground"
                    )}
                    // Desabilita o PopoverTrigger para que o calendário não abra
                    disabled
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {selectedDate ? (
                      format(selectedDate, "PPP", { locale: ptBR })
                    ) : (
                      <span>Selecione uma data</span>
                    )}
                  </Button>
                </PopoverTrigger>
                {/* Removendo o PopoverContent para garantir que o calendário não seja exibido */}
              </Popover>
            </div>
          </Card>

          {/* Exportação de Relatório */}
          <Card className="border-primary/20 shadow-card">
            <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent py-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Download className="h-4 w-4 text-primary" />
                Exportar Relatório de Período
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 pb-4 flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <Select
                  value={reportPeriod}
                  onValueChange={(value: 'week' | 'month') => setReportPeriod(value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o Período" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="week">Últimos 7 Dias</SelectItem>
                    <SelectItem value="month">Últimos 30 Dias</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-shrink-0 w-full sm:w-auto">
                <UpdateReportPDF 
                  history={reportHistory}
                  ubsList={ubsList}
                  usersList={usersList}
                  startDate={reportStartDate}
                  endDate={reportEndDate}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-primary/20 shadow-card">
            <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent py-3">
              <CardTitle className="text-base flex items-center gap-2">
                <div className="h-6 w-1 bg-primary rounded-full"></div>
                Legenda de Status
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 pb-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="flex items-center gap-2 p-2 rounded-lg bg-success/10 border border-success/20 text-sm">
                  <div className="w-5 h-5 rounded-full bg-success shadow-sm flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="h-3 w-3 text-success-foreground" />
                  </div>
                  <div>
                    <p className="font-medium text-xs">Completo</p>
                    <p className="text-xs text-muted-foreground hidden sm:block">Manhã e Tarde</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-lg bg-success/5 border border-success/10 text-sm">
                  <div className="w-5 h-5 rounded-full bg-success/50 shadow-sm flex items-center justify-center flex-shrink-0">
                    <Circle className="h-3 w-3 text-success-foreground" />
                  </div>
                  <div>
                    <p className="font-medium text-xs">Parcial</p>
                    <p className="text-xs text-muted-foreground hidden sm:block">Manhã ou Tarde</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-lg bg-destructive/10 border border-destructive/20 text-sm">
                  <div className="w-5 h-5 rounded-full bg-destructive shadow-sm flex items-center justify-center flex-shrink-0">
                    <AlertCircle className="h-3 w-3 text-destructive-foreground" />
                  </div>
                  <div>
                    <p className="font-medium text-xs">Pendente</p>
                    <p className="text-xs text-muted-foreground hidden sm:block">Não atualizado</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Lista de UBS (Agora sem ScrollArea) */}
          <div className="space-y-3">
            {ubsList.map((ubs, index) => {
              // Encontra todos os usuários que têm esta UBS vinculada
              const responsaveis = usersList.filter(u => u.ubsVinculadas.includes(ubs.id));
              
              return (
                <Card 
                  key={ubs.id} 
                  className="overflow-hidden border-l-4 border-l-primary shadow-card transition-all duration-300 animate-fade-in"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent py-2 px-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base font-bold truncate">{ubs.nome}</CardTitle>
                        <CardDescription className="flex items-center gap-1 text-xs truncate">
                          <Building2 className="h-3 w-3" />
                          {ubs.localidade}
                        </CardDescription>
                      </div>
                      <Badge variant="outline" className="ml-2 text-xs flex-shrink-0">
                        {responsaveis.length} {responsaveis.length === 1 ? 'resp.' : 'resp.'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-3 pb-3 px-4">
                    {responsaveis.length === 0 ? (
                      <div className="text-center py-3 px-2 bg-muted/30 rounded-lg border border-dashed">
                        <p className="text-xs font-medium text-muted-foreground">Nenhum responsável vinculado</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {responsaveis.map((user, userIndex) => {
                          const status = getUpdateStatus(ubs.id, user.id);
                          return (
                            <div
                              key={user.id}
                              className={`group relative overflow-hidden rounded-lg p-3 transition-all duration-300 ${getStatusColor(status)}`}
                            >
                              <div className="flex items-center justify-between relative z-10">
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                  <div className="flex-shrink-0">
                                    {getStatusIcon(status)}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-sm truncate">{user.nome}</p>
                                    <p className="text-xs opacity-90 truncate">{user.login}</p>
                                  </div>
                                </div>
                                <Badge 
                                  variant="outline" 
                                  className="bg-white/20 border-white/30 backdrop-blur-sm flex-shrink-0 ml-2 text-xs"
                                >
                                  {getStatusText(status, ubs.id, user.id)}
                                </Badge>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {ubsList.length === 0 && (
            <Card className="border-dashed animate-fade-in">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <div className="rounded-full bg-muted p-6 mb-4">
                  <AlertCircle className="h-12 w-12 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-bold mb-2">Nenhuma UBS cadastrada</h3>
                <p className="text-muted-foreground text-center max-w-sm">
                  Cadastre UBS na aba correspondente para começar a monitorar as atualizações dos PDFs.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        {/* --- ABA: CORREÇÕES --- */}
        <TabsContent value="corrections" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-semibold flex items-center gap-2">
              Solicitações de Correção
              {pendingCorrections.length > 0 && (
                <Badge variant="destructive">{pendingCorrections.length} Pendente(s)</Badge>
              )}
            </h2>
            <Button 
              onClick={loadPendingCorrectionsData} 
              variant="outline" 
              size="sm"
              disabled={isCorrectionLoading}
            >
              <RefreshCw className={cn("h-4 w-4 mr-2", isCorrectionLoading && "animate-spin")} />
              Atualizar
            </Button>
          </div>
          <p className="text-muted-foreground">Aprove ou rejeite solicitações de responsáveis que enviaram o PDF errado.</p>

          {pendingCorrections.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <CheckCircle2 className="h-12 w-12 text-success/50 mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhuma correção pendente</h3>
                <p className="text-muted-foreground text-center">
                  Todas as solicitações foram processadas ou não há solicitações ativas.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {pendingCorrections.map((correction) => {
                const { ubs, user } = getCorrectionDetails(correction);
                
                if (!ubs || !user) return null;

                return (
                  <Card key={correction.id} className="border-l-4 border-l-destructive/80 shadow-md">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg text-destructive flex items-center justify-between">
                        Solicitação de Correção ({correction.periodo === 'manha' ? 'Manhã' : 'Tarde'})
                        <Badge variant="destructive">Pendente</Badge>
                      </CardTitle>
                      <CardDescription>
                        Solicitado por: <strong>{user.nome}</strong> ({user.login})
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-primary" />
                          <strong>UBS:</strong> {ubs.nome} ({ubs.localidade})
                        </p>
                        <p className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <strong>Data/Hora:</strong> {new Date(correction.solicitado_em).toLocaleString('pt-BR')}
                        </p>
                      </div>
                      
                      <div className="flex justify-end gap-3 pt-2">
                        <CorrectionConfirmationDialog
                          correction={correction}
                          ubs={ubs}
                          user={user}
                          actionType="reject"
                          onConfirm={() => handleRejectCorrection(correction)}
                        />
                        <CorrectionConfirmationDialog
                          correction={correction}
                          ubs={ubs}
                          user={user}
                          actionType="approve"
                          onConfirm={() => handleApproveCorrection(correction)}
                        />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* --- ABA: GESTÃO AUTO CUSTO --- */}
        <TabsContent value="gestao-auto-custo" className="space-y-4">
          <GestaoAutoCusto />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminDashboard;
