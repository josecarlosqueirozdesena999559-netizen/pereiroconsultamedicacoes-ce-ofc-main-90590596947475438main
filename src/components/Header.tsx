// src/components/Header.tsx
import { LogOut, Home, Settings, Pill, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate, useLocation } from 'react-router-dom';
import logoPereiro from '@/assets/logo-pereiro.png';

const Header = () => {
  const { logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // Flags de página
  const isHomePage = location.pathname === '/';
  const isDashboardPage = location.pathname === '/dashboard';
  const isAvaliacoesPage = location.pathname === '/avaliacoes';

  // Lógica de exibição dos botões
  const showHomeButton = !isHomePage;                            // Início: em qualquer lugar, exceto Home
  const showAutoCustoButton = isHomePage;                        // Medicações Alto Custo: só na Home
  const showDashboardButton = isAuthenticated && !isDashboardPage; // Dashboard: logado e fora do dashboard
  const showReviewButton = !isAvaliacoesPage;                    // Avalie-nos: oculta na própria página

  return (
    <header className="bg-white border-b-2 border-primary shadow-lg">
      {/* Logo */}
      <div className="bg-white py-2 sm:py-3">
        <div className="container mx-auto px-4">
          <div className="flex justify-center">
            <img
              src={logoPereiro}
              alt="Prefeitura Municipal de Pereiro"
              className="h-12 sm:h-20 w-auto drop-shadow-md" // tamanhos padrão do Tailwind p/ evitar build issues
            />
          </div>
        </div>
      </div>

      {/* Barra de navegação */}
      <div className="bg-gradient-to-r from-primary to-green-800 text-primary-foreground">
        <div className="container mx-auto px-3 sm:px-4 py-2 sm:py-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-0">
            <div className="text-center sm:text-left">
              <h1 className="text-base sm:text-xl font-bold">ConsultMed</h1>
              <p className="text-xs opacity-90">
                Consulta de Medicamentos Prefeitura Municipal de Pereiro
              </p>
            </div>

            <nav className="flex items-center flex-wrap justify-center gap-1 sm:gap-1.5">
              {/* Início */}
              {showHomeButton && (
                <Button
                  variant="ghost"
                  onClick={() => navigate('/')}
                  className="bg-white text-primary hover:bg-white/90 text-xs sm:text-sm px-2 sm:px-4 h-8 sm:h-10"
                >
                  <Home className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                  <span className="hidden sm:inline">Início</span>
                </Button>
              )}

              {/* Medicações Alto Custo (só na Home) */}
              {showAutoCustoButton && (
                <Button
                  variant="ghost"
                  onClick={() => navigate('/medicacoes-auto-custo')}
                  className="bg-white text-primary hover:bg-white/90 text-xs sm:text-sm px-2 sm:px-4 h-8 sm:h-10"
                >
                  <Pill className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                  <span className="hidden sm:inline">Medicamentos Alto Custo</span>
                  <span className="sm:hidden">Med. Alto Custo</span>
                </Button>
              )}

              {/* Dashboard (logado e fora do dashboard) */}
              {showDashboardButton && (
                <Button
                  variant="ghost"
                  onClick={() => navigate('/dashboard')}
                  className="bg-white text-primary hover:bg-white/90 text-xs sm:text-sm px-2 sm:px-4 h-8 sm:h-10"
                >
                  <Settings className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                  <span className="hidden sm:inline">Dashboard</span>
                  <span className="sm:hidden">Dash</span>
                </Button>
              )}

              {/* Avalie-nos (vai para /avaliacoes) */}
              {showReviewButton && (
                <Button
                  variant="ghost"
                  onClick={() => navigate('/avaliacoes')}
                  className="bg-white text-primary hover:bg-white/90 text-xs sm:text-sm px-2 sm:px-4 h-8 sm:h-10"
                >
                  <Star className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                  <span className="hidden sm:inline">Avalie-nos aqui</span>
                  <span className="sm:hidden">Avaliar</span>
                </Button>
              )}

              {/* Entrar / Sair */}
              {isAuthenticated ? (
                <Button
                  variant="ghost"
                  onClick={handleLogout}
                  className="bg-white text-primary hover:bg-white/90 text-xs sm:text-sm px-2 sm:px-4 h-8 sm:h-10"
                >
                  <LogOut className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                  Sair
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  onClick={() => navigate('/login')}
                  className="bg-white text-primary hover:bg-white/90 text-xs sm:text-sm px-2 sm:px-4 h-8 sm:h-10"
                >
                  Entrar
                </Button>
              )}
            </nav>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
