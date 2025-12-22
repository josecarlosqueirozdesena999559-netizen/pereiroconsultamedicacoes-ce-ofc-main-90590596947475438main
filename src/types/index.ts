export interface UBS {
  id: string;
  nome: string;
  localidade: string;
  horarios: string;
  responsavel: string;
  contato?: string;
  status: 'aberto' | 'fechado';
  pdfUrl?: string;
  pdfUltimaAtualizacao?: string;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  login: string;
  nome: string;
  senha: string;
  tipo: 'admin' | 'responsavel';
  ubsVinculadas: string[];
  createdAt: string;
  updatedAt: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
}