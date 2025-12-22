import { UBS, User } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { formatDateTime } from '@/lib/utils';

const STORAGE_KEYS = {
  AUTH: 'pereiro_auth'
};

export const initializeStorage = () => {
  // Storage initialization no longer needed
};

// Tipagem para a nova tabela
export interface CorrecaoPDF {
  id: string;
  user_id: string;
  ubs_id: string;
  periodo: 'manha' | 'tarde';
  status: 'pendente' | 'aprovado' | 'rejeitado';
  solicitado_em: string;
  aprovado_em: string | null;
}

// Transform Supabase data to app format
const transformPostoToUBS = (posto: any, pdf?: any, responsavelNome?: string): UBS => ({
  id: posto.id,
  nome: posto.nome,
  localidade: posto.localidade,
  horarios: posto.horario_funcionamento,
  responsavel: responsavelNome || 'Não definido',
  contato: posto.contato || undefined,
  status: posto.status as 'aberto' | 'fechado',
  pdfUrl: pdf?.url,
  pdfUltimaAtualizacao: formatDateTime(pdf?.data_upload),
  createdAt: posto.atualizado_em || new Date().toISOString(),
  updatedAt: posto.atualizado_em || new Date().toISOString()
});

const transformUsuarioToUser = (usuario: any, vinculacoes: any[] = []): User => ({
  id: usuario.id,
  login: usuario.email,
  nome: usuario.nome,
  senha: usuario.senha,
  tipo: usuario.tipo,
  ubsVinculadas: vinculacoes.map(v => v.posto_id),
  createdAt: usuario.criado_em || new Date().toISOString(),
  updatedAt: usuario.criado_em || new Date().toISOString()
});

// UBS operations
export const getUBS = async (): Promise<UBS[]> => {
  try {
    console.log('Iniciando busca por UBS...');
    const { data: postos, error } = await supabase
      .from('postos')
      .select('*');

    if (error) {
      console.error('Erro ao buscar postos:', error);
      throw error;
    }
    console.log('Postos encontrados:', postos);

    const { data: pdfs, error: pdfError } = await supabase
      .from('arquivos_pdf')
      .select('*');
    if (pdfError) console.error('Erro ao buscar PDFs:', pdfError);

    const { data: usuarios, error: usuariosError } = await supabase
      .from('usuarios')
      .select('*');
    if (usuariosError) console.error('Erro ao buscar usuários:', usuariosError);

    const { data: vinculacoes, error: vinculacoesError } = await supabase
      .from('usuario_posto')
      .select('*');
    if (vinculacoesError) console.error('Erro ao buscar vinculações:', vinculacoesError);

    const result = (postos || []).map(posto => {
      const pdf = pdfs?.find(p => p.posto_id === posto.id);

      // Encontra todos os responsáveis vinculados a este posto
      const responsavelVinculos = vinculacoes?.filter(v => v.posto_id === posto.id) || [];
      
      let responsavelNomes: string[] = [];
      
      if (responsavelVinculos.length > 0) {
        responsavelNomes = responsavelVinculos // Corrigido de 'responsaveisNomes' para 'responsavelNomes'
          .map(vinc => usuarios?.find(u => u.id === vinc.user_id && u.tipo === 'responsavel')?.nome)
          .filter((name): name is string => !!name);
      }
      
      // Se houver múltiplos, lista os nomes. Se houver um, usa o nome. Se nenhum, 'Não definido'.
      const responsavelDisplay = responsavelNomes.length > 0 
        ? responsavelNomes.join(', ') 
        : 'Não definido';

      return {
        id: posto.id,
        nome: posto.nome,
        localidade: posto.localidade,
        horarios: posto.horario_funcionamento,
        responsavel: responsavelDisplay, // Agora pode ser uma lista de nomes
        status: posto.status as 'aberto' | 'fechado',
        pdfUrl: pdf?.url,
        pdfUltimaAtualizacao: formatDateTime(pdf?.data_upload),
        contato: posto.contato || undefined,
        createdAt: posto.atualizado_em || new Date().toISOString(),
        updatedAt: posto.atualizado_em || new Date().toISOString()
      };
    });
    console.log('UBS processadas:', result);
    return result;
  } catch (error) {
    console.error('Erro fatal ao buscar UBS:', error);
    return [];
  }
};

export const addUBS = async (ubs: Omit<UBS, 'id' | 'createdAt' | 'updatedAt'>): Promise<UBS> => {
  try {
    const { data, error } = await supabase
      .from('postos')
      .insert({
        nome: ubs.nome,
        localidade: ubs.localidade,
        horario_funcionamento: ubs.horarios,
        contato: ubs.contato,
        status: ubs.status
      })
      .select()
      .single();

    if (error) throw error;

    return transformPostoToUBS(data);
  } catch (error) {
    console.error('Erro ao criar UBS:', error);
    throw error;
  }
};

export const updateUBS = async (id: string, updates: Partial<UBS>): Promise<UBS | null> => {
  try {
    const updateData: any = {};
    if (updates.nome) updateData.nome = updates.nome;
    if (updates.localidade) updateData.localidade = updates.localidade;
    if (updates.horarios) updateData.horario_funcionamento = updates.horarios;
    if (updates.contato !== undefined) updateData.contato = updates.contato;
    if (updates.status) updateData.status = updates.status;

    const { data, error } = await supabase
      .from('postos')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Nota: O campo 'responsavel' na UBS é apenas para exibição no frontend público, 
    // a lógica de vínculo real está em 'usuario_posto'.
    return transformPostoToUBS(data);
  } catch (error) {
    console.error('Erro ao atualizar UBS:', error);
    return null;
  }
};

export const deleteUBS = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('postos')
      .delete()
      .eq('id', id);

    return !error;
  } catch (error) {
    console.error('Erro ao deletar UBS:', error);
    return false;
  }
};

// Users operations
export const getUsers = async (): Promise<User[]> => {
  try {
    const { data: usuarios, error } = await supabase
      .from('usuarios')
      .select('*');

    if (error) throw error;

    const { data: vinculacoes } = await supabase
      .from('usuario_posto')
      .select('*');

    return (usuarios || []).map(usuario => {
      const userVinculacoes = vinculacoes?.filter(v => v.user_id === usuario.id) || [];
      return transformUsuarioToUser(usuario, userVinculacoes);
    });
  } catch (error) {
    console.error('Erro ao buscar usuários:', error);
    return [];
  }
};

export const getUserById = async (userId: string): Promise<User | null> => {
  try {
    const { data: fullUser, error: userError } = await supabase
      .from('usuarios')
      .select('*')
      .eq('id', userId)
      .maybeSingle(); 

    if (userError || !fullUser) {
      return null;
    }
    
    const { data: vinculacoes } = await supabase
      .from('usuario_posto')
      .select('posto_id')
      .eq('user_id', fullUser.id);

    return transformUsuarioToUser(fullUser, vinculacoes || []);
  } catch (error) {
    console.error('Erro ao buscar usuário por ID:', error);
    return null;
  }
};

export const addUser = async (user: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> => {
  try {
    // Inserindo senha em texto simples
    const { data, error } = await supabase
      .from('usuarios')
      .insert({
        email: user.login,
        senha: user.senha, 
        nome: user.nome,
        tipo: user.tipo
      })
      .select()
      .single();

    if (error) throw error;

    if (user.ubsVinculadas.length > 0) {
      const vinculacoes = user.ubsVinculadas.map(postoId => ({
        user_id: data.id,
        posto_id: postoId
      }));

      await supabase
        .from('usuario_posto')
        .insert(vinculacoes);
    }

    return transformUsuarioToUser(data, user.ubsVinculadas.map(id => ({ posto_id: id })));
  } catch (error) {
    console.error('Erro ao criar usuário:', error);
    throw error;
  }
};

export const updateUser = async (id: string, updates: Partial<User>): Promise<User | null> => {
  try {
    const updateData: any = {};
    if (updates.login) updateData.email = updates.login; // Adicionado para permitir a atualização do email
    if (updates.nome) updateData.nome = updates.nome;
    if (updates.senha) updateData.senha = updates.senha; // Atualizando senha em texto simples
    if (updates.tipo) updateData.tipo = updates.tipo;

    let userRow: any = null;

    if (Object.keys(updateData).length > 0) {
      const { data, error } = await supabase
        .from('usuarios')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      userRow = data;
    } else {
      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      userRow = data;
    }

    if (updates.ubsVinculadas) {
      // Limpa todos os vínculos existentes para este usuário
      await supabase
        .from('usuario_posto')
        .delete()
        .eq('user_id', id);

      // Insere os novos vínculos
      if (updates.ubsVinculadas.length > 0) {
        const vinculacoes = updates.ubsVinculadas.map(postoId => ({
          user_id: id,
          posto_id: postoId
        }));

        await supabase
          .from('usuario_posto')
          .insert(vinculacoes);
      }
    }

    return transformUsuarioToUser(userRow, updates.ubsVinculadas?.map(id => ({ posto_id: id })) || []);
  } catch (error) {
    console.error('Erro ao atualizar usuário:', error);
    return null;
  }
};

export const deleteUser = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('usuarios')
      .delete()
      .eq('id', id);

    return !error;
  } catch (error) {
    console.error('Erro ao deletar usuário:', error);
    return false;
  }
};

// Define vínculo N:M entre posto e responsável (Adiciona ou remove um único vínculo)
export const toggleUserUBSLink = async (userId: string, ubsId: string, isLinked: boolean): Promise<boolean> => {
  try {
    if (isLinked) {
      // Remover vínculo
      const { error } = await supabase
        .from('usuario_posto')
        .delete()
        .eq('user_id', userId)
        .eq('posto_id', ubsId);
      
      if (error) throw error;
    } else {
      // Adicionar vínculo
      const { error } = await supabase
        .from('usuario_posto')
        .insert({ user_id: userId, posto_id: ubsId });
      
      if (error) throw error;
    }

    return true;
  } catch (error) {
    console.error('Erro ao alternar vínculo do posto:', error);
    return false;
  }
};

// Função obsoleta (mantida para evitar quebra de código, mas não usada no AdminDashboard N:M)
export const setPostoResponsavel = async (postoId: string, userId: string | null): Promise<boolean> => {
  console.warn("setPostoResponsavel está obsoleto. Use toggleUserUBSLink para N:M.");
  return true;
};


// Auth operations (Custom)
export const authenticateUser = async (login: string, senha: string): Promise<User | null> => {
  try {
    console.log('Tentando login para:', login);
    
    // 1. Usar a função RPC fn_login para autenticar (ignora RLS)
    const { data: loginData, error: loginError } = await supabase.rpc('fn_login', {
      p_email: login,
      p_senha: senha,
    });

    if (loginError) {
      console.error('Erro ao chamar fn_login:', loginError);
      return null;
    }
    
    console.log('Dados retornados por fn_login:', loginData);

    if (!loginData || loginData.length === 0) {
      // Usuário não encontrado ou senha incorreta
      return null;
    }
    
    const fullUser = loginData[0]; // fn_login retorna um array, pegamos o primeiro elemento

    // 2. Buscar vinculações (RLS deve permitir SELECT em usuario_posto se a política for 'true')
    const { data: vinculacoes, error: vinculacaoError } = await supabase
      .from('usuario_posto')
      .select('posto_id')
      .eq('user_id', fullUser.id);
      
    if (vinculacaoError) {
        console.error('Erro ao buscar vinculações:', vinculacaoError);
        // Continuamos, mas com vinculações vazias
    }

    // 3. Transformar o resultado da função em objeto User
    const userResult: User = {
      id: fullUser.id,
      login: fullUser.email,
      nome: fullUser.nome,
      senha: senha, // A senha não é retornada pelo RPC, mas a mantemos no objeto User para consistência local (embora não seja usada)
      tipo: fullUser.tipo as 'admin' | 'responsavel',
      ubsVinculadas: vinculacoes?.map(v => v.posto_id) || [],
      createdAt: new Date().toISOString(), // Placeholder, pois o RPC não retorna
      updatedAt: new Date().toISOString(), // Placeholder, pois o RPC não retorna
    };
    
    console.log('Usuário autenticado com sucesso:', userResult);

    return userResult;
  } catch (error) {
    console.error('Erro na autenticação (catch geral):', error);
    return null;
  }
};

export const getCurrentUser = (): User | null => {
  const data = localStorage.getItem(STORAGE_KEYS.AUTH);
  return data ? JSON.parse(data) : null;
};

export const setCurrentUser = (user: User): void => {
  localStorage.setItem(STORAGE_KEYS.AUTH, JSON.stringify(user));
};

export const clearAuth = (): void => {
  localStorage.removeItem(STORAGE_KEYS.AUTH);
};

// PDF operations
export const savePDF = async (ubsId: string, file: File): Promise<string> => {
  try {
    const fileName = `${ubsId}/${Date.now()}-${file.name}`;

    // 1. Limpar arquivos antigos
    const { data: existingFiles } = await supabase.storage
      .from('medicacoes_ubs')
      .list(ubsId);

    if (existingFiles && existingFiles.length > 0) {
      const filesToRemove = existingFiles.map(f => `${ubsId}/${f.name}`);
      await supabase.storage
        .from('medicacoes_ubs')
        .remove(filesToRemove);
    }

    // 2. Upload do novo arquivo
    const { error: uploadError } = await supabase.storage
      .from('medicacoes_ubs')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true
      });

    if (uploadError) {
      console.error('Erro no upload do Storage:', uploadError);
      throw uploadError;
    }

    // 3. Obter URL pública
    const { data: urlData } = supabase.storage
      .from('medicacoes_ubs')
      .getPublicUrl(fileName);

    // 4. Remover registro antigo na tabela arquivos_pdf
    await supabase
      .from('arquivos_pdf')
      .delete()
      .eq('posto_id', ubsId);

    // 5. Salvar novo registro na tabela arquivos_pdf
    const { error: insertError, data: insertData } = await supabase
      .from('arquivos_pdf')
      .insert({
        posto_id: ubsId,
        url: urlData.publicUrl
      })
      .select('data_upload')
      .single();

    if (insertError) {
      console.error('Erro ao salvar no BD (arquivos_pdf):', insertError);
      throw insertError;
    }

    // Retorna o timestamp do banco de dados para ser usado no frontend
    return insertData.data_upload;
  } catch (error) {
    console.error('Erro fatal em savePDF:', error);
    throw error;
  }
};

export const getPDF = async (ubsId: string): Promise<any> => {
  try {
    const { data, error } = await supabase
      .from('arquivos_pdf')
      .select('*')
      .eq('posto_id', ubsId)
      .single();

    return error ? null : data;
  } catch (error) {
    console.error('Erro ao buscar PDF:', error);
    return null;
  }
};

// Update Checks operations (mantidas)
export const getUpdateChecks = async (userId: string, ubsId: string): Promise<{ manha: boolean; tarde: boolean } | null> => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // Verificar se o cleanup_old_update_checks já rodou hoje
    // Não é necessário rodar aqui, pois o AdminDashboard já faz isso no useEffect.

    const { data, error } = await supabase
      .from('update_checks')
      .select('*')
      .eq('user_id', userId)
      .eq('ubs_id', ubsId)
      .eq('data', today)
      .maybeSingle();

    if (error) throw error;

    return data ? { manha: data.manha, tarde: data.tarde } : null;
  } catch (error) {
    console.error('Erro ao buscar checks:', error);
    return null;
  }
};

export const saveUpdateCheck = async (userId: string, ubsId: string, period: 'manha' | 'tarde'): Promise<boolean> => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // Verificar se já existe um registro para hoje
    const { data: existing } = await supabase
      .from('update_checks')
      .select('*')
      .eq('user_id', userId)
      .eq('ubs_id', ubsId)
      .eq('data', today)
      .maybeSingle();

    if (existing) {
      // Se já está marcado, não permite alterar
      if (existing[period]) {
        return false;
      }
      
      // Atualizar o período específico
      const { error } = await supabase
        .from('update_checks')
        .update({ [period]: true })
        .eq('id', existing.id);

      if (error) throw error;
    } else {
      // Criar novo registro
      const { error } = await supabase
        .from('update_checks')
        .insert({
          user_id: userId,
          ubs_id: ubsId,
          data: today,
          manha: period === 'manha',
          tarde: period === 'tarde'
        });

      if (error) throw error;
    }

    return true;
  } catch (error) {
    console.error('Erro ao salvar check:', error);
    return false;
  }
};

// Nova função para buscar histórico de checks em um período
export interface UpdateCheckHistory {
  ubs_id: string;
  user_id: string;
  manha: boolean;
  tarde: boolean;
  data: string;
  created_at: string;
}

export const getUpdateChecksHistory = async (startDate: string, endDate: string): Promise<UpdateCheckHistory[]> => {
  try {
    const { data, error } = await supabase
      .from('update_checks')
      .select('*')
      .gte('data', startDate) // Greater than or equal to start date
      .lte('data', endDate)   // Less than or equal to end date
      .order('data', { ascending: true });

    if (error) throw error;

    return data as UpdateCheckHistory[];
  } catch (error) {
    console.error('Erro ao buscar histórico de checks:', error);
    return [];
  }
};


// --- Funções para Correção de PDF ---

export const requestPDFCorrection = async (userId: string, ubsId: string, periodo: 'manha' | 'tarde'): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('correcoes_pdf')
      .insert({
        user_id: userId,
        ubs_id: ubsId,
        periodo: periodo,
        status: 'pendente'
      });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Erro ao solicitar correção de PDF:', error);
    return false;
  }
};

export const getPendingCorrections = async (): Promise<CorrecaoPDF[]> => {
  try {
    const { data, error } = await supabase
      .from('correcoes_pdf')
      .select('*')
      .eq('status', 'pendente')
      .order('solicitado_em', { ascending: true });

    if (error) throw error;
    return data as CorrecaoPDF[];
  } catch (error) {
    console.error('Erro ao buscar correções pendentes:', error);
    return [];
  }
};

export const approvePDFCorrection = async (correctionId: string, ubsId: string, userId: string, periodo: 'manha' | 'tarde'): Promise<boolean> => {
  try {
    const today = new Date().toISOString().split('T')[0];

    // 1. Atualizar o status da solicitação para 'aprovado'
    const { error: updateError } = await supabase
      .from('correcoes_pdf')
      .update({ status: 'aprovado', aprovado_em: new Date().toISOString() })
      .eq('id', correctionId);

    if (updateError) throw updateError;

    // 2. Limpar o check de atualização diária para o período específico
    const { data: existingCheck } = await supabase
      .from('update_checks')
      .select('id, manha, tarde')
      .eq('user_id', userId)
      .eq('ubs_id', ubsId)
      .eq('data', today)
      .maybeSingle();

    if (existingCheck) {
      const updateData: Partial<{ manha: boolean; tarde: boolean }> = {};
      updateData[periodo] = false; // Define o período solicitado como não atualizado

      const { error: checkUpdateError } = await supabase
        .from('update_checks')
        .update(updateData)
        .eq('id', existingCheck.id);

      if (checkUpdateError) throw checkUpdateError;
    }
    
    // Se não houver check existente, não há o que limpar, mas a correção foi aprovada.

    return true;
  } catch (error) {
    console.error('Erro ao aprovar correção:', error);
    return false;
  }
};

export const rejectPDFCorrection = async (correctionId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('correcoes_pdf')
      .update({ status: 'rejeitado', aprovado_em: new Date().toISOString() })
      .eq('id', correctionId);

    return !error;
  } catch (error) {
    console.error('Erro ao rejeitar correção:', error);
    return false;
  }
};

/**
 * Busca correções aprovadas que o usuário ainda não visualizou (status 'aprovado').
 * @param userId ID do usuário logado.
 * @returns Lista de correções aprovadas.
 */
export const getApprovedCorrectionsForUser = async (userId: string): Promise<CorrecaoPDF[]> => {
  try {
    const { data, error } = await supabase
      .from('correcoes_pdf')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'aprovado')
      .order('aprovado_em', { ascending: false });

    if (error) throw error;
    return data as CorrecaoPDF[];
  } catch (error) {
    console.error('Erro ao buscar correções aprovadas:', error);
    return [];
  }
};

/**
 * Marca uma correção aprovada como visualizada (muda o status para 'visualizado').
 * Nota: Precisamos de um novo status 'visualizado' ou usar o localStorage.
 * Como o requisito é que o aviso suma permanentemente, vamos usar o localStorage
 * para o frontend e manter o status 'aprovado' no banco para fins de auditoria.
 * 
 * Para o aviso de erro, vamos usar o localStorage no frontend para dispensar.
 */


// Update types
export type CorrectionPeriod = 'manha' | 'tarde';