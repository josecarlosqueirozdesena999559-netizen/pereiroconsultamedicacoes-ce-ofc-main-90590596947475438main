import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Mail, Lock } from 'lucide-react';
import Header from '@/components/Header';
import { useIsMobile } from '@/hooks/use-mobile';

const Login = () => {
  const [login, setLogin] = useState('');
  const [senha, setSenha] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login: authLogin, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  // Redireciona se já estiver autenticado
  if (isAuthenticated) {
    navigate('/dashboard', { replace: true });
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const success = await authLogin(login, senha);
      if (success) {
        toast({
          title: "Login realizado com sucesso!",
          description: "Redirecionando para o dashboard...",
        });
        // A navegação será tratada pelo Dashboard ou pelo próprio componente se necessário,
        // mas o AuthProvider garante que o estado será atualizado.
        navigate('/dashboard');
      } else {
        toast({
          title: "Erro no login",
          description: "Email ou senha inválidos. Verifique suas credenciais.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Erro no sistema",
        description: "Ocorreu um erro inesperado. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20">
      <Header />
      <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 flex justify-center">
        <Card className="w-full max-w-md bg-white shadow-2xl rounded-xl border-primary/20">
          <CardHeader className="text-center space-y-3 pt-6 sm:pt-8">
            <div className="flex justify-center">
              <div className="p-3 bg-primary/10 rounded-full border-2 border-primary/30 shadow-md">
                <Mail className="h-8 w-8 text-primary" strokeWidth={1.5} />
              </div>
            </div>
            <CardTitle className="text-xl sm:text-2xl md:text-3xl font-extrabold text-primary">Acesso Restrito</CardTitle>
            <CardDescription className="text-xs sm:text-sm text-muted-foreground px-2">
              Sistema de gerenciamento das Unidades Básicas de Saúde
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
              <div className="space-y-2">
                <Label htmlFor="login" className="text-xs sm:text-sm font-medium">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-primary/70 h-4 w-4" />
                  <Input 
                    id="login" 
                    type="email" 
                    value={login} 
                    onChange={(e) => setLogin(e.target.value)} 
                    placeholder="Digite seu email" 
                    className="pl-10 h-9 sm:h-10 text-xs sm:text-sm border-primary/30 focus:border-primary" 
                    required 
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="senha" className="text-xs sm:text-sm font-medium">Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-primary/70 h-4 w-4" />
                  <Input 
                    id="senha" 
                    type="password" 
                    value={senha} 
                    onChange={(e) => setSenha(e.target.value)} 
                    placeholder="Digite sua senha" 
                    className="pl-10 h-9 sm:h-10 text-xs sm:text-sm border-primary/30 focus:border-primary" 
                    required 
                  />
                </div>
              </div>
              <Button 
                type="submit" 
                className="w-full h-9 sm:h-10 text-sm sm:text-base font-semibold bg-primary hover:bg-primary/90 transition-colors"
                disabled={isLoading}
              >
                {isLoading ? 'Entrando...' : 'Entrar'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;