import React, { useState, useEffect, useContext, createContext } from 'react';
import { User, AuthState } from '@/types';
import { authenticateUser, getCurrentUser, setCurrentUser, clearAuth, getUserById } from '@/lib/storage';

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  isLoading: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const initialUser = getCurrentUser();
  const [user, setUser] = useState<User | null>(initialUser);
  const [isLoading, setIsLoading] = useState(true); // Começa como true para revalidar

  useEffect(() => {
    const revalidateSession = async () => {
      if (initialUser) {
        // Se há um usuário no localStorage, tente buscar os dados mais recentes do BD
        const freshUser = await getUserById(initialUser.id);
        
        if (freshUser) {
          // Atualiza o estado e o localStorage com os dados frescos
          setUser(freshUser);
          setCurrentUser(freshUser);
        } else {
          // Se o usuário não for encontrado no BD (ex: deletado), limpa a sessão
          clearAuth();
          setUser(null);
        }
      }
      setIsLoading(false);
    };

    revalidateSession();
  }, []); // Executa apenas na montagem inicial

  const login = async (username: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const authenticatedUser = await authenticateUser(username, password);
      if (authenticatedUser) {
        setUser(authenticatedUser);
        setCurrentUser(authenticatedUser);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Erro no login:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    // Limpeza imediata do estado e do storage
    clearAuth();
    setUser(null);
    // Não precisamos de setIsLoading(false) aqui, pois o estado já foi limpo.
  };

  const isAuthenticated = !!user;
  const isAdmin = user?.tipo === 'admin';

  const value = {
    isAuthenticated,
    user,
    login,
    logout,
    isLoading,
    isAdmin,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};