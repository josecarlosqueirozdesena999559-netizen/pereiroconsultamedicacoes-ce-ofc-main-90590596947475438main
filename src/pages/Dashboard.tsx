import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import AdminDashboard from '@/components/AdminDashboard';
import UserDashboard from '@/components/UserDashboard';
import Header from '@/components/Header';
import { Badge } from '@/components/ui/badge';
import { useIsMobile } from '@/hooks/use-mobile';

const Dashboard = () => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  useEffect(() => {
    // Redireciona apenas se o carregamento terminou E o usuário não está autenticado
    if (!isLoading && !isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mb-3"></div>
          <p className="text-muted-foreground text-sm">Carregando dados do usuário...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Se não está autenticado e não está carregando, o useEffect já redirecionou.
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20">
      <Header />
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6">
        {/* Saudação e Status do Usuário (Visível apenas no Dashboard) */}
        <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-card rounded-lg shadow-sm border border-primary/10 flex flex-col sm:flex-row items-center justify-between gap-2">
          <h2 className="text-base sm:text-lg md:text-xl font-semibold text-foreground text-center sm:text-left">
            Olá, <span className="text-primary">{user?.nome}</span>
          </h2>
          <Badge 
            variant={user?.tipo === 'admin' ? 'default' : 'secondary'} 
            className="text-xs sm:text-sm"
          >
            {user?.tipo === 'admin' ? 'Administrador' : 'Responsável UBS'}
          </Badge>
        </div>
        {user?.tipo === 'admin' ? <AdminDashboard /> : <UserDashboard />}
      </div>
    </div>
  );
};

export default Dashboard;