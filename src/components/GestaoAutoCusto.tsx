import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit2, Trash2, User, Pill, Package, CheckCircle, Search, Calendar, FileText, Filter, X, AlertTriangle, Clock, RefreshCw, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format, isPast, isBefore, addDays, addMonths, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface LoteMedicamento {
  id: string;
  medicamento_id: string;
  lote: string;
  validade: string;
  quantidade: number;
}

interface Medicamento {
  id: string;
  nome: string;
  descricao: string | null;
  created_at: string;
  lotes?: LoteMedicamento[];
}

interface Paciente {
  id: string;
  nome_completo: string;
  cartao_sus: string;
  created_at: string;
}

interface PacienteMedicamento {
  id: string;
  paciente_id: string;
  medicamento_id: string;
  disponivel_retirada: boolean;
  data_autorizacao: string | null;
  duracao_meses: number | null;
  status_medicamento: string | null;
  dispensacoes_realizadas: number | null;
  paciente?: Paciente;
  medicamento?: Medicamento;
}

interface Entrega {
  id: string;
  paciente_medicamento_id: string;
  data_entrega: string;
  observacao: string | null;
}

interface LoteForm {
  lote: string;
  validade: string;
  quantidade: string;
}

const GestaoAutoCusto = () => {
  const [medicamentos, setMedicamentos] = useState<Medicamento[]>([]);
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [vinculos, setVinculos] = useState<PacienteMedicamento[]>([]);
  const [entregas, setEntregas] = useState<Entrega[]>([]);
  const [lotes, setLotes] = useState<LoteMedicamento[]>([]);
  
  // Filters
  const [searchPaciente, setSearchPaciente] = useState('');
  const [searchMedicamento, setSearchMedicamento] = useState('');
  const [filterCartaoSUS, setFilterCartaoSUS] = useState('');
  const [filterMedicamento, setFilterMedicamento] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [reportFilterNome, setReportFilterNome] = useState('');
  const [reportFilterCartao, setReportFilterCartao] = useState('');
  const [reportFilterMed, setReportFilterMed] = useState('');

  // Dialog states
  const [isMedDialogOpen, setIsMedDialogOpen] = useState(false);
  const [isPacDialogOpen, setIsPacDialogOpen] = useState(false);
  const [isVinculoDialogOpen, setIsVinculoDialogOpen] = useState(false);
  const [isEntregaDialogOpen, setIsEntregaDialogOpen] = useState(false);
  const [isLoteDialogOpen, setIsLoteDialogOpen] = useState(false);
  const [isEditVinculoDialogOpen, setIsEditVinculoDialogOpen] = useState(false);

  // Form states
  const [editingMed, setEditingMed] = useState<Medicamento | null>(null);
  const [editingPac, setEditingPac] = useState<Paciente | null>(null);
  const [selectedPacienteId, setSelectedPacienteId] = useState<string>('');
  const [selectedMedicamentoId, setSelectedMedicamentoId] = useState<string>('');
  const [selectedVinculo, setSelectedVinculo] = useState<PacienteMedicamento | null>(null);
  const [editingVinculo, setEditingVinculo] = useState<PacienteMedicamento | null>(null);
  const [entregaObs, setEntregaObs] = useState('');
  const [selectedMedForLote, setSelectedMedForLote] = useState<Medicamento | null>(null);

  const [medForm, setMedForm] = useState({ nome: '', descricao: '' });
  const [pacForm, setPacForm] = useState({ nome_completo: '', cartao_sus: '' });
  const [lotesForm, setLotesForm] = useState<LoteForm[]>([{ lote: '', validade: '', quantidade: '' }]);
  
  // Vinculo form with new fields
  const [vinculoForm, setVinculoForm] = useState({
    data_autorizacao: '',
    duracao_meses: '3',
    status_medicamento: 'aguardando'
  });

  const { toast } = useToast();

  const loadData = async () => {
    try {
      const [{ data: meds }, { data: pacs }, { data: vincs }, { data: entregs }, { data: lotesData }] = await Promise.all([
        supabase.from('medicamentos_auto_custo').select('*').order('nome'),
        supabase.from('pacientes_auto_custo').select('*').order('nome_completo'),
        supabase.from('paciente_medicamento').select('*'),
        supabase.from('entregas_medicamento').select('*').order('data_entrega', { ascending: false }).limit(500),
        supabase.from('lotes_medicamento').select('*').order('validade', { ascending: true }),
      ]);

      setMedicamentos(meds || []);
      setPacientes(pacs || []);
      setVinculos(vincs || []);
      setEntregas(entregs || []);
      setLotes(lotesData || []);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    }
  };

  useEffect(() => {
    loadData();

    const channel = supabase
      .channel('gestao_auto_custo')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'medicamentos_auto_custo' }, loadData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pacientes_auto_custo' }, loadData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'paciente_medicamento' }, loadData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'entregas_medicamento' }, loadData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lotes_medicamento' }, loadData)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Medicamento handlers
  const handleSaveMed = async () => {
    if (!medForm.nome.trim()) {
      toast({ title: "Erro", description: "Nome do medicamento é obrigatório.", variant: "destructive" });
      return;
    }

    try {
      let medicamentoId = editingMed?.id;

      if (editingMed) {
        await supabase.from('medicamentos_auto_custo').update({
          nome: medForm.nome,
          descricao: medForm.descricao || null,
        }).eq('id', editingMed.id);
      } else {
        const { data } = await supabase.from('medicamentos_auto_custo').insert({
          nome: medForm.nome,
          descricao: medForm.descricao || null,
        }).select().single();
        medicamentoId = data?.id;
      }

      // Salvar lotes se houver
      if (medicamentoId) {
        const validLotes = lotesForm.filter(l => l.lote.trim() && l.validade && l.quantidade);
        if (validLotes.length > 0) {
          const lotesToInsert = validLotes.map(l => ({
            medicamento_id: medicamentoId,
            lote: l.lote.trim(),
            validade: l.validade,
            quantidade: parseInt(l.quantidade) || 0,
          }));
          await supabase.from('lotes_medicamento').insert(lotesToInsert);
        }
      }

      toast({ title: "Sucesso", description: editingMed ? "Medicamento atualizado." : "Medicamento cadastrado." });
      setIsMedDialogOpen(false);
      setEditingMed(null);
      setMedForm({ nome: '', descricao: '' });
      setLotesForm([{ lote: '', validade: '', quantidade: '' }]);
      loadData();
    } catch (error) {
      console.error('Erro ao salvar medicamento:', error);
      toast({ title: "Erro", description: "Erro ao salvar medicamento.", variant: "destructive" });
    }
  };

  const handleDeleteMed = async (id: string) => {
    if (!confirm('Excluir este medicamento e todos os seus lotes?')) return;
    try {
      await supabase.from('medicamentos_auto_custo').delete().eq('id', id);
      toast({ title: "Excluído", description: "Medicamento removido." });
      loadData();
    } catch (error) {
      toast({ title: "Erro", description: "Erro ao excluir.", variant: "destructive" });
    }
  };

  // Lote handlers
  const handleAddLoteRow = () => {
    setLotesForm([...lotesForm, { lote: '', validade: '', quantidade: '' }]);
  };

  const handleRemoveLoteRow = (index: number) => {
    if (lotesForm.length > 1) {
      setLotesForm(lotesForm.filter((_, i) => i !== index));
    }
  };

  const handleLoteFormChange = (index: number, field: keyof LoteForm, value: string) => {
    const newLotes = [...lotesForm];
    newLotes[index][field] = value;
    setLotesForm(newLotes);
  };

  const handleSaveLotes = async () => {
    if (!selectedMedForLote) return;

    const validLotes = lotesForm.filter(l => l.lote.trim() && l.validade && l.quantidade);
    if (validLotes.length === 0) {
      toast({ title: "Erro", description: "Preencha pelo menos um lote completo.", variant: "destructive" });
      return;
    }

    try {
      const lotesToInsert = validLotes.map(l => ({
        medicamento_id: selectedMedForLote.id,
        lote: l.lote.trim(),
        validade: l.validade,
        quantidade: parseInt(l.quantidade) || 0,
      }));
      await supabase.from('lotes_medicamento').insert(lotesToInsert);
      
      toast({ title: "Sucesso", description: "Lotes cadastrados." });
      setIsLoteDialogOpen(false);
      setSelectedMedForLote(null);
      setLotesForm([{ lote: '', validade: '', quantidade: '' }]);
      loadData();
    } catch (error) {
      toast({ title: "Erro", description: "Erro ao salvar lotes.", variant: "destructive" });
    }
  };

  const handleDeleteLote = async (loteId: string) => {
    if (!confirm('Excluir este lote?')) return;
    try {
      await supabase.from('lotes_medicamento').delete().eq('id', loteId);
      toast({ title: "Excluído", description: "Lote removido." });
      loadData();
    } catch (error) {
      toast({ title: "Erro", description: "Erro ao excluir lote.", variant: "destructive" });
    }
  };

  // Paciente handlers
  const handleSavePac = async () => {
    if (!pacForm.nome_completo.trim() || !pacForm.cartao_sus.trim()) {
      toast({ title: "Erro", description: "Nome e Cartão SUS são obrigatórios.", variant: "destructive" });
      return;
    }

    try {
      if (editingPac) {
        await supabase.from('pacientes_auto_custo').update({
          nome_completo: pacForm.nome_completo,
          cartao_sus: pacForm.cartao_sus,
        }).eq('id', editingPac.id);
        toast({ title: "Sucesso", description: "Paciente atualizado." });
      } else {
        await supabase.from('pacientes_auto_custo').insert({
          nome_completo: pacForm.nome_completo,
          cartao_sus: pacForm.cartao_sus,
        });
        toast({ title: "Sucesso", description: "Paciente cadastrado." });
      }

      setIsPacDialogOpen(false);
      setEditingPac(null);
      setPacForm({ nome_completo: '', cartao_sus: '' });
      loadData();
    } catch (error) {
      console.error('Erro ao salvar paciente:', error);
      toast({ title: "Erro", description: "Erro ao salvar paciente.", variant: "destructive" });
    }
  };

  const handleDeletePac = async (id: string) => {
    if (!confirm('Excluir este paciente?')) return;
    try {
      await supabase.from('pacientes_auto_custo').delete().eq('id', id);
      toast({ title: "Excluído", description: "Paciente removido." });
      loadData();
    } catch (error) {
      toast({ title: "Erro", description: "Erro ao excluir.", variant: "destructive" });
    }
  };

  // Vínculo handlers
  const handleCreateVinculo = async () => {
    if (!selectedPacienteId || !selectedMedicamentoId) {
      toast({ title: "Erro", description: "Selecione paciente e medicamento.", variant: "destructive" });
      return;
    }

    if (!vinculoForm.data_autorizacao) {
      toast({ title: "Erro", description: "Data de autorização é obrigatória.", variant: "destructive" });
      return;
    }

    const exists = vinculos.find(v => v.paciente_id === selectedPacienteId && v.medicamento_id === selectedMedicamentoId);
    if (exists) {
      toast({ title: "Atenção", description: "Este vínculo já existe.", variant: "destructive" });
      return;
    }

    try {
      await supabase.from('paciente_medicamento').insert({
        paciente_id: selectedPacienteId,
        medicamento_id: selectedMedicamentoId,
        disponivel_retirada: false,
        data_autorizacao: vinculoForm.data_autorizacao,
        duracao_meses: parseInt(vinculoForm.duracao_meses),
        status_medicamento: vinculoForm.status_medicamento,
        dispensacoes_realizadas: 0,
      });
      toast({ title: "Sucesso", description: "Medicamento vinculado ao paciente." });
      setIsVinculoDialogOpen(false);
      setSelectedPacienteId('');
      setSelectedMedicamentoId('');
      setVinculoForm({ data_autorizacao: '', duracao_meses: '3', status_medicamento: 'aguardando' });
      loadData();
    } catch (error) {
      toast({ title: "Erro", description: "Erro ao criar vínculo.", variant: "destructive" });
    }
  };

  const handleUpdateVinculo = async () => {
    if (!editingVinculo) return;

    try {
      await supabase.from('paciente_medicamento').update({
        data_autorizacao: vinculoForm.data_autorizacao || null,
        duracao_meses: parseInt(vinculoForm.duracao_meses),
        status_medicamento: vinculoForm.status_medicamento,
      }).eq('id', editingVinculo.id);
      
      toast({ title: "Sucesso", description: "Vínculo atualizado." });
      setIsEditVinculoDialogOpen(false);
      setEditingVinculo(null);
      setVinculoForm({ data_autorizacao: '', duracao_meses: '3', status_medicamento: 'aguardando' });
      loadData();
    } catch (error) {
      toast({ title: "Erro", description: "Erro ao atualizar vínculo.", variant: "destructive" });
    }
  };

  const handleToggleStatus = async (vinculoId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'disponivel' ? 'aguardando' : 
                      currentStatus === 'em_falta' ? 'disponivel' : 
                      currentStatus === 'aguardando' ? 'disponivel' : 'aguardando';
    try {
      await supabase.from('paciente_medicamento').update({
        status_medicamento: newStatus,
        disponivel_retirada: newStatus === 'disponivel',
      }).eq('id', vinculoId);
      loadData();
    } catch (error) {
      toast({ title: "Erro", description: "Erro ao atualizar status.", variant: "destructive" });
    }
  };

  const handleSetEmFalta = async (vinculoId: string) => {
    try {
      await supabase.from('paciente_medicamento').update({
        status_medicamento: 'em_falta',
        disponivel_retirada: false,
      }).eq('id', vinculoId);
      toast({ title: "Status atualizado", description: "Medicamento marcado como em falta." });
      loadData();
    } catch (error) {
      toast({ title: "Erro", description: "Erro ao atualizar status.", variant: "destructive" });
    }
  };

  const handleRenovarAutorizacao = async (vinculoId: string, duracaoMeses: number) => {
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      await supabase.from('paciente_medicamento').update({
        data_autorizacao: today,
        dispensacoes_realizadas: 0,
      }).eq('id', vinculoId);
      toast({ title: "Renovado", description: `Autorização renovada por ${duracaoMeses} meses.` });
      loadData();
    } catch (error) {
      toast({ title: "Erro", description: "Erro ao renovar autorização.", variant: "destructive" });
    }
  };

  const handleDeleteVinculo = async (id: string) => {
    if (!confirm('Remover este vínculo?')) return;
    try {
      await supabase.from('paciente_medicamento').delete().eq('id', id);
      toast({ title: "Removido", description: "Vínculo removido." });
      loadData();
    } catch (error) {
      toast({ title: "Erro", description: "Erro ao remover.", variant: "destructive" });
    }
  };

  // Entrega handlers
  const handleRegistrarEntrega = async () => {
    if (!selectedVinculo) return;

    try {
      await supabase.from('entregas_medicamento').insert({
        paciente_medicamento_id: selectedVinculo.id,
        observacao: entregaObs || null,
      });

      // Incrementar dispensações realizadas
      const novasDispensacoes = (selectedVinculo.dispensacoes_realizadas || 0) + 1;
      
      await supabase.from('paciente_medicamento').update({
        disponivel_retirada: false,
        status_medicamento: 'aguardando',
        dispensacoes_realizadas: novasDispensacoes,
      }).eq('id', selectedVinculo.id);

      toast({ title: "Entrega Registrada", description: `Dispensação ${novasDispensacoes} registrada.` });
      setIsEntregaDialogOpen(false);
      setSelectedVinculo(null);
      setEntregaObs('');
      loadData();
    } catch (error) {
      toast({ title: "Erro", description: "Erro ao registrar entrega.", variant: "destructive" });
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd/MM/yyyy HH:mm", { locale: ptBR });
    } catch {
      return dateString;
    }
  };

  const formatDateOnly = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd/MM/yyyy", { locale: ptBR });
    } catch {
      return dateString;
    }
  };

  const isExpiringSoon = (validade: string) => {
    const date = new Date(validade);
    const thirtyDaysFromNow = addDays(new Date(), 30);
    return isBefore(date, thirtyDaysFromNow);
  };

  const isExpired = (validade: string) => {
    return isPast(new Date(validade));
  };

  // Calcula se autorização está vencida ou próxima de vencer
  const getAuthorizationStatus = (dataAutorizacao: string | null, duracaoMeses: number | null) => {
    if (!dataAutorizacao || !duracaoMeses) return { status: 'indefinido', daysLeft: null };
    
    const authDate = new Date(dataAutorizacao);
    const expirationDate = addMonths(authDate, duracaoMeses);
    const today = new Date();
    const daysLeft = differenceInDays(expirationDate, today);
    
    if (daysLeft < 0) return { status: 'vencida', daysLeft };
    if (daysLeft <= 15) return { status: 'vence_em_breve', daysLeft };
    return { status: 'ativa', daysLeft };
  };

  // Verifica dispensações restantes
  const getDispensationInfo = (duracaoMeses: number | null, dispensacoesRealizadas: number | null) => {
    const totalDispensacoes = duracaoMeses === 6 ? 6 : 3;
    const realizadas = dispensacoesRealizadas || 0;
    const restantes = totalDispensacoes - realizadas;
    return { total: totalDispensacoes, realizadas, restantes };
  };

  // Filtros
  const filteredPacientes = pacientes.filter(p => {
    const matchNome = p.nome_completo.toLowerCase().includes(searchPaciente.toLowerCase());
    const matchCartao = p.cartao_sus.includes(searchPaciente);
    const matchFilterCartao = !filterCartaoSUS || p.cartao_sus.includes(filterCartaoSUS);
    return (matchNome || matchCartao) && matchFilterCartao;
  });

  const filteredMedicamentos = medicamentos.filter(m =>
    m.nome.toLowerCase().includes(searchMedicamento.toLowerCase())
  );

  const getVinculosForPaciente = (pacienteId: string) => {
    return vinculos.filter(v => v.paciente_id === pacienteId).map(v => ({
      ...v,
      medicamento: medicamentos.find(m => m.id === v.medicamento_id),
    }));
  };

  const getLotesForMedicamento = (medicamentoId: string) => {
    return lotes.filter(l => l.medicamento_id === medicamentoId);
  };

  // Filtrar entregas para relatório
  const filteredEntregas = entregas.filter(entrega => {
    const vinculo = vinculos.find(v => v.id === entrega.paciente_medicamento_id);
    const paciente = pacientes.find(p => p.id === vinculo?.paciente_id);
    const medicamento = medicamentos.find(m => m.id === vinculo?.medicamento_id);

    const matchNome = !reportFilterNome || paciente?.nome_completo.toLowerCase().includes(reportFilterNome.toLowerCase());
    const matchCartao = !reportFilterCartao || paciente?.cartao_sus.includes(reportFilterCartao);
    const matchMed = !reportFilterMed || medicamento?.id === reportFilterMed;

    return matchNome && matchCartao && matchMed;
  });

  const clearReportFilters = () => {
    setReportFilterNome('');
    setReportFilterCartao('');
    setReportFilterMed('');
  };

  // Conta alertas de renovação
  const alertasRenovacao = vinculos.filter(v => {
    const authStatus = getAuthorizationStatus(v.data_autorizacao, v.duracao_meses);
    return authStatus.status === 'vencida' || authStatus.status === 'vence_em_breve';
  }).length;

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'disponivel':
        return <Badge className="bg-green-500 hover:bg-green-600">Disponível</Badge>;
      case 'em_falta':
        return <Badge variant="destructive">Em Falta</Badge>;
      default:
        return <Badge variant="secondary">Aguardando</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Alerta de Renovações Pendentes */}
      {alertasRenovacao > 0 && (
        <Card className="border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              <p className="text-yellow-800 dark:text-yellow-200 font-medium">
                {alertasRenovacao} autorização(ões) precisa(m) de renovação!
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="pacientes" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="pacientes" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Pacientes
          </TabsTrigger>
          <TabsTrigger value="medicamentos" className="flex items-center gap-2">
            <Pill className="h-4 w-4" />
            Medicamentos
          </TabsTrigger>
          <TabsTrigger value="dispensacao" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Dispensação
          </TabsTrigger>
          <TabsTrigger value="relatorio" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Relatório
          </TabsTrigger>
        </TabsList>

        {/* Tab Pacientes */}
        <TabsContent value="pacientes" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filtros de Busca
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="relative">
                  <Label className="text-xs text-muted-foreground mb-1 block">Nome ou Cartão SUS</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar paciente..."
                      value={searchPaciente}
                      onChange={(e) => setSearchPaciente(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Filtrar por Cartão SUS</Label>
                  <Input
                    placeholder="Ex: 123456789012345"
                    value={filterCartaoSUS}
                    onChange={(e) => setFilterCartaoSUS(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Filtrar por Medicamento</Label>
                  <Select value={filterMedicamento} onValueChange={setFilterMedicamento}>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Todos os medicamentos" />
                    </SelectTrigger>
                    <SelectContent className="bg-background border shadow-lg z-50">
                      <SelectItem value="all">Todos</SelectItem>
                      {medicamentos.map(m => (
                        <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Filtrar por Status</Label>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Todos os status" />
                    </SelectTrigger>
                    <SelectContent className="bg-background border shadow-lg z-50">
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="disponivel">Disponível</SelectItem>
                      <SelectItem value="aguardando">Aguardando</SelectItem>
                      <SelectItem value="em_falta">Em Falta</SelectItem>
                      <SelectItem value="renovar">Precisa Renovar</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2">
            <Dialog open={isPacDialogOpen} onOpenChange={setIsPacDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => { setEditingPac(null); setPacForm({ nome_completo: '', cartao_sus: '' }); }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Paciente
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingPac ? 'Editar' : 'Novo'} Paciente</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Nome Completo</Label>
                    <Input
                      value={pacForm.nome_completo}
                      onChange={(e) => setPacForm({ ...pacForm, nome_completo: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Cartão SUS</Label>
                    <Input
                      value={pacForm.cartao_sus}
                      onChange={(e) => setPacForm({ ...pacForm, cartao_sus: e.target.value })}
                      maxLength={20}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsPacDialogOpen(false)}>Cancelar</Button>
                  <Button onClick={handleSavePac}>Salvar</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={isVinculoDialogOpen} onOpenChange={setIsVinculoDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" onClick={() => {
                  setVinculoForm({ data_autorizacao: '', duracao_meses: '3', status_medicamento: 'aguardando' });
                }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Vincular Medicamento
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Vincular Medicamento a Paciente</DialogTitle>
                  <DialogDescription>Configure a autorização do medicamento para o paciente.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Paciente</Label>
                    <Select value={selectedPacienteId} onValueChange={setSelectedPacienteId}>
                      <SelectTrigger className="bg-background">
                        <SelectValue placeholder="Selecione um paciente" />
                      </SelectTrigger>
                      <SelectContent className="bg-background border shadow-lg z-50">
                        {pacientes.map(p => (
                          <SelectItem key={p.id} value={p.id}>{p.nome_completo}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Medicamento</Label>
                    <Select value={selectedMedicamentoId} onValueChange={setSelectedMedicamentoId}>
                      <SelectTrigger className="bg-background">
                        <SelectValue placeholder="Selecione um medicamento" />
                      </SelectTrigger>
                      <SelectContent className="bg-background border shadow-lg z-50">
                        {medicamentos.map(m => (
                          <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Data da Autorização</Label>
                      <Input
                        type="date"
                        value={vinculoForm.data_autorizacao}
                        onChange={(e) => setVinculoForm({ ...vinculoForm, data_autorizacao: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Duração (meses)</Label>
                      <Select value={vinculoForm.duracao_meses} onValueChange={(v) => setVinculoForm({ ...vinculoForm, duracao_meses: v })}>
                        <SelectTrigger className="bg-background">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-background border shadow-lg z-50">
                          <SelectItem value="3">3 meses</SelectItem>
                          <SelectItem value="6">6 meses</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label>Status Inicial</Label>
                    <Select value={vinculoForm.status_medicamento} onValueChange={(v) => setVinculoForm({ ...vinculoForm, status_medicamento: v })}>
                      <SelectTrigger className="bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-background border shadow-lg z-50">
                        <SelectItem value="aguardando">Aguardando</SelectItem>
                        <SelectItem value="disponivel">Disponível</SelectItem>
                        <SelectItem value="em_falta">Em Falta</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsVinculoDialogOpen(false)}>Cancelar</Button>
                  <Button onClick={handleCreateVinculo}>Vincular</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4">
            {filteredPacientes.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-8 text-center">
                  <User className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">Nenhum paciente encontrado.</p>
                </CardContent>
              </Card>
            ) : (
              filteredPacientes
                .filter(p => {
                  if (!filterMedicamento || filterMedicamento === 'all') {
                    if (!filterStatus || filterStatus === 'all') return true;
                  }
                  const pacVinculos = getVinculosForPaciente(p.id);
                  
                  let matchMed = !filterMedicamento || filterMedicamento === 'all' || pacVinculos.some(v => v.medicamento_id === filterMedicamento);
                  
                  if (filterStatus && filterStatus !== 'all') {
                    if (filterStatus === 'renovar') {
                      return pacVinculos.some(v => {
                        const authStatus = getAuthorizationStatus(v.data_autorizacao, v.duracao_meses);
                        return authStatus.status === 'vencida' || authStatus.status === 'vence_em_breve';
                      }) && matchMed;
                    }
                    return pacVinculos.some(v => v.status_medicamento === filterStatus) && matchMed;
                  }
                  
                  return matchMed;
                })
                .map((paciente) => {
                  const pacVinculos = getVinculosForPaciente(paciente.id);
                  return (
                    <Card key={paciente.id}>
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-lg">{paciente.nome_completo}</CardTitle>
                            <CardDescription className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="font-mono">{paciente.cartao_sus}</Badge>
                            </CardDescription>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => {
                              setEditingPac(paciente);
                              setPacForm({ nome_completo: paciente.nome_completo, cartao_sus: paciente.cartao_sus });
                              setIsPacDialogOpen(true);
                            }}>
                              <Edit2 className="h-3 w-3" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleDeletePac(paciente.id)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {pacVinculos.length === 0 ? (
                          <p className="text-sm text-muted-foreground">Nenhum medicamento vinculado.</p>
                        ) : (
                          <div className="space-y-3">
                            {pacVinculos.map((v) => {
                              const authStatus = getAuthorizationStatus(v.data_autorizacao, v.duracao_meses);
                              const dispInfo = getDispensationInfo(v.duracao_meses, v.dispensacoes_realizadas);
                              
                              return (
                                <div key={v.id} className="p-4 bg-muted/50 rounded-lg space-y-3">
                                  {/* Header do medicamento */}
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                      <Pill className="h-4 w-4 text-primary" />
                                      <span className="font-medium">{v.medicamento?.nome}</span>
                                      {getStatusBadge(v.status_medicamento)}
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <Button 
                                        size="sm" 
                                        variant="ghost"
                                        onClick={() => {
                                          setEditingVinculo(v);
                                          setVinculoForm({
                                            data_autorizacao: v.data_autorizacao || '',
                                            duracao_meses: String(v.duracao_meses || 3),
                                            status_medicamento: v.status_medicamento || 'aguardando'
                                          });
                                          setIsEditVinculoDialogOpen(true);
                                        }}
                                      >
                                        <Edit2 className="h-3 w-3" />
                                      </Button>
                                      <Button size="sm" variant="ghost" onClick={() => handleDeleteVinculo(v.id)}>
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  </div>

                                  {/* Info de autorização */}
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                                    <div className="flex items-center gap-1 text-muted-foreground">
                                      <Calendar className="h-3 w-3" />
                                      <span>Autorizado: {v.data_autorizacao ? formatDateOnly(v.data_autorizacao) : 'N/D'}</span>
                                    </div>
                                    <div className="flex items-center gap-1 text-muted-foreground">
                                      <Clock className="h-3 w-3" />
                                      <span>Duração: {v.duracao_meses || 3} meses</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <Package className="h-3 w-3" />
                                      <span>Dispensações: {dispInfo.realizadas}/{dispInfo.total}</span>
                                    </div>
                                    {authStatus.status === 'vencida' && (
                                      <Badge variant="destructive" className="text-xs">
                                        <AlertTriangle className="h-3 w-3 mr-1" />
                                        Autorização Vencida
                                      </Badge>
                                    )}
                                    {authStatus.status === 'vence_em_breve' && (
                                      <Badge className="bg-yellow-500 text-xs">
                                        <AlertTriangle className="h-3 w-3 mr-1" />
                                        Vence em {authStatus.daysLeft} dias
                                      </Badge>
                                    )}
                                  </div>

                                  {/* Ações */}
                                  <div className="flex flex-wrap gap-2 pt-2 border-t">
                                    <Button 
                                      size="sm" 
                                      variant={v.status_medicamento === 'disponivel' ? "default" : "outline"}
                                      onClick={() => handleToggleStatus(v.id, v.status_medicamento || 'aguardando')}
                                    >
                                      <CheckCircle className="h-3 w-3 mr-1" />
                                      {v.status_medicamento === 'disponivel' ? 'Disponível' : 'Marcar Disponível'}
                                    </Button>
                                    <Button 
                                      size="sm" 
                                      variant={v.status_medicamento === 'em_falta' ? "destructive" : "outline"}
                                      onClick={() => handleSetEmFalta(v.id)}
                                    >
                                      <XCircle className="h-3 w-3 mr-1" />
                                      Em Falta
                                    </Button>
                                    <Button 
                                      size="sm" 
                                      variant="outline"
                                      disabled={v.status_medicamento !== 'disponivel'}
                                      onClick={() => {
                                        setSelectedVinculo(v);
                                        setIsEntregaDialogOpen(true);
                                      }}
                                    >
                                      <Package className="h-3 w-3 mr-1" />
                                      Registrar Entrega
                                    </Button>
                                    {(authStatus.status === 'vencida' || authStatus.status === 'vence_em_breve') && (
                                      <Button 
                                        size="sm" 
                                        variant="outline"
                                        className="border-yellow-500 text-yellow-600 hover:bg-yellow-50"
                                        onClick={() => handleRenovarAutorizacao(v.id, v.duracao_meses || 3)}
                                      >
                                        <RefreshCw className="h-3 w-3 mr-1" />
                                        Renovar Autorização
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })
            )}
          </div>
        </TabsContent>

        {/* Tab Medicamentos */}
        <TabsContent value="medicamentos" className="space-y-4">
          <div className="flex justify-between items-center gap-4 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar medicamento..."
                value={searchMedicamento}
                onChange={(e) => setSearchMedicamento(e.target.value)}
                className="pl-10"
              />
            </div>
            <Dialog open={isMedDialogOpen} onOpenChange={setIsMedDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => { 
                  setEditingMed(null); 
                  setMedForm({ nome: '', descricao: '' }); 
                  setLotesForm([{ lote: '', validade: '', quantidade: '' }]);
                }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Medicamento
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingMed ? 'Editar' : 'Novo'} Medicamento</DialogTitle>
                  <DialogDescription>Cadastre o medicamento com seus lotes e validades.</DialogDescription>
                </DialogHeader>
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <Label>Nome do Medicamento</Label>
                      <Input
                        value={medForm.nome}
                        onChange={(e) => setMedForm({ ...medForm, nome: e.target.value })}
                        placeholder="Ex: Insulina NPH 100UI/ml"
                      />
                    </div>
                    <div className="col-span-2">
                      <Label>Descrição (opcional)</Label>
                      <Input
                        value={medForm.descricao}
                        onChange={(e) => setMedForm({ ...medForm, descricao: e.target.value })}
                        placeholder="Descrição adicional"
                      />
                    </div>
                  </div>

                  {!editingMed && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-base font-semibold">Lotes</Label>
                        <Button type="button" variant="outline" size="sm" onClick={handleAddLoteRow}>
                          <Plus className="h-3 w-3 mr-1" />
                          Adicionar Lote
                        </Button>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground px-1">
                          <div className="col-span-4">Lote</div>
                          <div className="col-span-4">Validade</div>
                          <div className="col-span-3">Qtd</div>
                          <div className="col-span-1"></div>
                        </div>
                        {lotesForm.map((lote, index) => (
                          <div key={index} className="grid grid-cols-12 gap-2 items-center">
                            <Input
                              className="col-span-4"
                              placeholder="Nº do lote"
                              value={lote.lote}
                              onChange={(e) => handleLoteFormChange(index, 'lote', e.target.value)}
                            />
                            <Input
                              className="col-span-4"
                              type="date"
                              value={lote.validade}
                              onChange={(e) => handleLoteFormChange(index, 'validade', e.target.value)}
                            />
                            <Input
                              className="col-span-3"
                              type="number"
                              placeholder="Qtd"
                              value={lote.quantidade}
                              onChange={(e) => handleLoteFormChange(index, 'quantidade', e.target.value)}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="col-span-1 p-0 h-8 w-8"
                              onClick={() => handleRemoveLoteRow(index)}
                              disabled={lotesForm.length === 1}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsMedDialogOpen(false)}>Cancelar</Button>
                  <Button onClick={handleSaveMed}>Salvar</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {filteredMedicamentos.map((med) => {
              const medLotes = getLotesForMedicamento(med.id);
              const totalQuantidade = medLotes.reduce((acc, l) => acc + l.quantidade, 0);
              
              return (
                <Card key={med.id}>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Pill className="h-5 w-5 text-primary" />
                          {med.nome}
                        </CardTitle>
                        {med.descricao && (
                          <CardDescription>{med.descricao}</CardDescription>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" onClick={() => {
                          setSelectedMedForLote(med);
                          setLotesForm([{ lote: '', validade: '', quantidade: '' }]);
                          setIsLoteDialogOpen(true);
                        }}>
                          <Plus className="h-3 w-3 mr-1" />
                          Lote
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => {
                          setEditingMed(med);
                          setMedForm({ nome: med.nome, descricao: med.descricao || '' });
                          setIsMedDialogOpen(true);
                        }}>
                          <Edit2 className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDeleteMed(med.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {medLotes.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Nenhum lote cadastrado.</p>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium">Total em estoque: {totalQuantidade} unidades</span>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b">
                                <th className="text-left py-2 font-medium">Lote</th>
                                <th className="text-left py-2 font-medium">Validade</th>
                                <th className="text-right py-2 font-medium">Qtd</th>
                                <th className="text-right py-2 font-medium">Status</th>
                                <th className="text-right py-2 font-medium"></th>
                              </tr>
                            </thead>
                            <tbody>
                              {medLotes.map((lote) => (
                                <tr key={lote.id} className="border-b last:border-0">
                                  <td className="py-2 font-mono text-xs">{lote.lote}</td>
                                  <td className="py-2">{formatDateOnly(lote.validade)}</td>
                                  <td className="py-2 text-right">{lote.quantidade}</td>
                                  <td className="py-2 text-right">
                                    {isExpired(lote.validade) ? (
                                      <Badge variant="destructive" className="text-xs">
                                        <AlertTriangle className="h-3 w-3 mr-1" />
                                        Vencido
                                      </Badge>
                                    ) : isExpiringSoon(lote.validade) ? (
                                      <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 text-xs">
                                        <AlertTriangle className="h-3 w-3 mr-1" />
                                        Vence em breve
                                      </Badge>
                                    ) : (
                                      <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600 border-green-500/20">
                                        OK
                                      </Badge>
                                    )}
                                  </td>
                                  <td className="py-2 text-right">
                                    <Button size="sm" variant="ghost" onClick={() => handleDeleteLote(lote.id)}>
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Tab Dispensação */}
        <TabsContent value="dispensacao" className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Package className="h-5 w-5" />
            Dispensações Realizadas
          </h3>
          
          <div className="space-y-2">
            {entregas.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-8 text-center">
                  <Package className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">Nenhuma entrega registrada.</p>
                </CardContent>
              </Card>
            ) : (
              entregas.slice(0, 20).map((entrega) => {
                const vinculo = vinculos.find(v => v.id === entrega.paciente_medicamento_id);
                const paciente = pacientes.find(p => p.id === vinculo?.paciente_id);
                const medicamento = medicamentos.find(m => m.id === vinculo?.medicamento_id);

                return (
                  <Card key={entrega.id} className="p-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium">{paciente?.nome_completo || 'Paciente desconhecido'}</p>
                        <p className="text-sm text-muted-foreground">
                          {medicamento?.nome || 'Medicamento'} • {formatDate(entrega.data_entrega)}
                        </p>
                        {entrega.observacao && (
                          <p className="text-xs text-muted-foreground mt-1">Obs: {entrega.observacao}</p>
                        )}
                      </div>
                      <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Entregue
                      </Badge>
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        </TabsContent>

        {/* Tab Relatório */}
        <TabsContent value="relatorio" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Relatório de Entregas
              </CardTitle>
              <CardDescription>Filtre e visualize o histórico completo de entregas.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Nome do Paciente</Label>
                  <Input
                    placeholder="Buscar por nome..."
                    value={reportFilterNome}
                    onChange={(e) => setReportFilterNome(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Cartão SUS</Label>
                  <Input
                    placeholder="Nº do cartão..."
                    value={reportFilterCartao}
                    onChange={(e) => setReportFilterCartao(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Medicamento</Label>
                  <Select value={reportFilterMed} onValueChange={setReportFilterMed}>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent className="bg-background border shadow-lg z-50">
                      <SelectItem value="all">Todos</SelectItem>
                      {medicamentos.map(m => (
                        <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button variant="outline" onClick={clearReportFilters} className="w-full">
                    <X className="h-4 w-4 mr-2" />
                    Limpar Filtros
                  </Button>
                </div>
              </div>

              <div className="text-sm text-muted-foreground">
                {filteredEntregas.length} entrega(s) encontrada(s)
              </div>

              <div className="overflow-x-auto border rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-3 font-medium">Data/Hora</th>
                      <th className="text-left p-3 font-medium">Paciente</th>
                      <th className="text-left p-3 font-medium">Cartão SUS</th>
                      <th className="text-left p-3 font-medium">Medicamento</th>
                      <th className="text-left p-3 font-medium">Vencimento</th>
                      <th className="text-left p-3 font-medium">Status Prazo</th>
                      <th className="text-left p-3 font-medium">Observação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEntregas.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-muted-foreground">
                          Nenhuma entrega encontrada com os filtros selecionados.
                        </td>
                      </tr>
                    ) : (
                      filteredEntregas.map((entrega) => {
                        const vinculo = vinculos.find(v => v.id === entrega.paciente_medicamento_id);
                        const paciente = pacientes.find(p => p.id === vinculo?.paciente_id);
                        const medicamento = medicamentos.find(m => m.id === vinculo?.medicamento_id);
                        const authStatus = vinculo ? getAuthorizationStatus(vinculo.data_autorizacao, vinculo.duracao_meses) : null;
                        const dataVencimento = vinculo?.data_autorizacao && vinculo?.duracao_meses 
                          ? formatDateOnly(addMonths(new Date(vinculo.data_autorizacao), vinculo.duracao_meses).toISOString())
                          : '-';

                        return (
                          <tr key={entrega.id} className="border-t hover:bg-muted/30">
                            <td className="p-3">{formatDate(entrega.data_entrega)}</td>
                            <td className="p-3 font-medium">{paciente?.nome_completo || '-'}</td>
                            <td className="p-3 font-mono text-xs">{paciente?.cartao_sus || '-'}</td>
                            <td className="p-3">{medicamento?.nome || '-'}</td>
                            <td className="p-3">{dataVencimento}</td>
                            <td className="p-3">
                              {authStatus?.status === 'valida' && (
                                <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
                                  No Prazo
                                </Badge>
                              )}
                              {authStatus?.status === 'vence_em_breve' && (
                                <Badge className="bg-yellow-500">
                                  Vence em {authStatus.daysLeft} dias
                                </Badge>
                              )}
                              {authStatus?.status === 'vencida' && (
                                <Badge variant="destructive">
                                  Vencida
                                </Badge>
                              )}
                              {!authStatus && <span className="text-muted-foreground">-</span>}
                            </td>
                            <td className="p-3 text-muted-foreground">{entrega.observacao || '-'}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog de Entrega */}
      <Dialog open={isEntregaDialogOpen} onOpenChange={setIsEntregaDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Entrega</DialogTitle>
            <DialogDescription>
              Confirme a entrega do medicamento ao paciente.
              {selectedVinculo && (
                <div className="mt-2 p-2 bg-muted rounded text-sm">
                  Dispensação {(selectedVinculo.dispensacoes_realizadas || 0) + 1} de {selectedVinculo.duracao_meses === 6 ? 6 : 3}
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Observação (opcional)</Label>
              <Input
                value={entregaObs}
                onChange={(e) => setEntregaObs(e.target.value)}
                placeholder="Ex: Entregue pelo(a)..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsEntregaDialogOpen(false);
              setSelectedVinculo(null);
              setEntregaObs('');
            }}>Cancelar</Button>
            <Button onClick={handleRegistrarEntrega} className="bg-green-600 hover:bg-green-700">
              <CheckCircle className="h-4 w-4 mr-2" />
              Confirmar Entrega
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Editar Vínculo */}
      <Dialog open={isEditVinculoDialogOpen} onOpenChange={setIsEditVinculoDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Autorização</DialogTitle>
            <DialogDescription>Atualize os dados da autorização do medicamento.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Data da Autorização</Label>
                <Input
                  type="date"
                  value={vinculoForm.data_autorizacao}
                  onChange={(e) => setVinculoForm({ ...vinculoForm, data_autorizacao: e.target.value })}
                />
              </div>
              <div>
                <Label>Duração (meses)</Label>
                <Select value={vinculoForm.duracao_meses} onValueChange={(v) => setVinculoForm({ ...vinculoForm, duracao_meses: v })}>
                  <SelectTrigger className="bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-background border shadow-lg z-50">
                    <SelectItem value="3">3 meses</SelectItem>
                    <SelectItem value="6">6 meses</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Status do Medicamento</Label>
              <Select value={vinculoForm.status_medicamento} onValueChange={(v) => setVinculoForm({ ...vinculoForm, status_medicamento: v })}>
                <SelectTrigger className="bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background border shadow-lg z-50">
                  <SelectItem value="aguardando">Aguardando</SelectItem>
                  <SelectItem value="disponivel">Disponível</SelectItem>
                  <SelectItem value="em_falta">Em Falta</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsEditVinculoDialogOpen(false);
              setEditingVinculo(null);
            }}>Cancelar</Button>
            <Button onClick={handleUpdateVinculo}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Lotes */}
      <Dialog open={isLoteDialogOpen} onOpenChange={setIsLoteDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Adicionar Lotes - {selectedMedForLote?.nome}</DialogTitle>
            <DialogDescription>Cadastre os lotes com suas respectivas validades e quantidades.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Lotes</Label>
              <Button type="button" variant="outline" size="sm" onClick={handleAddLoteRow}>
                <Plus className="h-3 w-3 mr-1" />
                Adicionar Linha
              </Button>
            </div>
            
            <div className="space-y-2">
              <div className="grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground px-1">
                <div className="col-span-4">Lote</div>
                <div className="col-span-4">Validade</div>
                <div className="col-span-3">Qtd</div>
                <div className="col-span-1"></div>
              </div>
              {lotesForm.map((lote, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 items-center">
                  <Input
                    className="col-span-4"
                    placeholder="Nº do lote"
                    value={lote.lote}
                    onChange={(e) => handleLoteFormChange(index, 'lote', e.target.value)}
                  />
                  <Input
                    className="col-span-4"
                    type="date"
                    value={lote.validade}
                    onChange={(e) => handleLoteFormChange(index, 'validade', e.target.value)}
                  />
                  <Input
                    className="col-span-3"
                    type="number"
                    placeholder="Qtd"
                    value={lote.quantidade}
                    onChange={(e) => handleLoteFormChange(index, 'quantidade', e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="col-span-1 p-0 h-8 w-8"
                    onClick={() => handleRemoveLoteRow(index)}
                    disabled={lotesForm.length === 1}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsLoteDialogOpen(false);
              setSelectedMedForLote(null);
              setLotesForm([{ lote: '', validade: '', quantidade: '' }]);
            }}>Cancelar</Button>
            <Button onClick={handleSaveLotes}>Salvar Lotes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GestaoAutoCusto;