import { useState, useEffect } from 'react';
import { LogOut, Home, Settings, Pill, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate, useLocation } from 'react-router-dom';
import logoPereiro from '@/assets/logo-pereiro.png';
import { useIsMobile } from '@/hooks/use-mobile';
import { supabase } from '@/integrations/supabase/client';

const Header = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [consultaSUSAtiva, setConsultaSUSAtiva] = useState(false);

  useEffect(() => {
    const loadConfig = async () => {
      const { data } = await supabase
        .from('config_sistema')
        .select('valor')
        .eq('chave', 'consulta_sus_ativa')
        .maybeSingle();
      
      setConsultaSUSAtiva(data?.valor === 'true');
    };

    loadConfig();

    const channel = supabase
      .channel('config_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'config_sistema' }, loadConfig)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const isHomePage = location.pathname === '/';
  const isDashboardPage = location.pathname === '/dashboard';
  const isAutoCustoPage = location.pathname === '/medicacoes-auto-custo';
  const isConsultaSUSPage = location.pathname === '/consulta-sus';

  // Lógica de exibição dos botões:
  // 1. Botão Início: Aparece em qualquer lugar, exceto na Home.
  const showHomeButton = !isHomePage;
  // 2. Botão Medicações Auto Custo: Aparece APENAS na Home.
  const showAutoCustoButton = isHomePage;
  // 3. Botão Consulta SUS: Aparece na Home se a função estiver ativa.
  const showConsultaSUSButton = isHomePage && consultaSUSAtiva;
  // 4. Botão Dashboard: Aparece se estiver autenticado E não estiver na página do Dashboard.
  const showDashboardButton = isAuthenticated && !isDashboardPage;
  // 5. Botão Entrar/Sair: Sempre aparece.

  return (
    <header className="bg-white border-b-2 border-primary shadow-lg">
      {/* Logo Section */}
      <div className="bg-white py-1.5 sm:py-2">
        <div className="container mx-auto px-3 sm:px-4">
          <div className="flex justify-center">
            <img 
              src={logoPereiro} 
              alt="Prefeitura Municipal de Pereiro" 
              className="h-10 sm:h-14 md:h-18 lg:h-20 w-auto drop-shadow-md"
            />
          </div>
        </div>
      </div>
      
      {/* Navigation Section */}
      <div className="bg-gradient-to-r from-primary to-[hsl(120_75%_25%)] text-primary-foreground">
        <div className="container mx-auto px-2 sm:px-3 py-1.5 sm:py-2">
          <div className="flex flex-col items-center gap-1.5 sm:gap-2">
            <div className="text-center">
              <h1 className="text-xs sm:text-sm md:text-base lg:text-lg font-bold">ConsultMed</h1>
              <p className="text-[0.55rem] sm:text-[0.65rem] md:text-xs opacity-90 leading-tight">
                Consulta de Medicamentos - Pereiro
              </p>
            </div>
            
            <nav className="flex items-center flex-wrap justify-center gap-1">
              {/* Botão Início */}
              {showHomeButton && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => navigate('/')}
                  className="bg-white text-primary hover:bg-white/90 text-[0.6rem] sm:text-xs px-1.5 sm:px-2 h-6 sm:h-7"
                >
                  <Home className="h-3 w-3" />
                  <span className="ml-1 hidden sm:inline">Início</span>
                </Button>
              )}
              
              {/* Botão Medicações Auto Custo */}
              {showAutoCustoButton && (
                <Button 
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/medicacoes-auto-custo')}
                  className="bg-white text-primary hover:bg-white/90 text-[0.6rem] sm:text-xs px-1.5 sm:px-2 h-6 sm:h-7"
                >
                  <Pill className="h-3 w-3" />
                  <span className="ml-1">Alto Custo</span>
                </Button>
              )}

              {/* Botão Consulta SUS */}
              {showConsultaSUSButton && (
                <Button 
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/consulta-sus')}
                  className="bg-white text-primary hover:bg-white/90 text-[0.6rem] sm:text-xs px-1.5 sm:px-2 h-6 sm:h-7"
                >
                  <Search className="h-3 w-3" />
                  <span className="ml-1">Consulta</span>
                </Button>
              )}
              
              {/* Botão Dashboard (Aparece se logado e não estiver no dashboard) */}
              {showDashboardButton && (
                <Button 
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/dashboard')}
                  className="bg-white text-primary hover:bg-white/90 text-[0.6rem] sm:text-xs px-1.5 sm:px-2 h-6 sm:h-7"
                >
                  <Settings className="h-3 w-3" />
                  <span className="ml-1 hidden sm:inline">Dashboard</span>
                </Button>
              )}
              
              {/* Botão Entrar / Sair */}
              {isAuthenticated ? (
                <Button 
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  className="bg-white text-primary hover:bg-white/90 text-[0.6rem] sm:text-xs px-1.5 sm:px-2 h-6 sm:h-7"
                >
                  <LogOut className="h-3 w-3" />
                  <span className="ml-1">Sair</span>
                </Button>
              ) : (
                <Button 
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/login')}
                  className="bg-white text-primary hover:bg-white/90 text-[0.6rem] sm:text-xs px-1.5 sm:px-2 h-6 sm:h-7"
                >
                  <span>Entrar</span>
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