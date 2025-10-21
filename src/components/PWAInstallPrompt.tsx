import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Download, X, Smartphone, Share, Plus } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const PWAInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [deviceType, setDeviceType] = useState<'android' | 'ios' | 'desktop' | 'other'>('other');

  useEffect(() => {
    // Detectar tipo de dispositivo
    const userAgent = navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(userAgent);
    const isAndroid = /android/.test(userAgent);
    const isDesktop = !(/mobi|android/i.test(userAgent));

    if (isIOS) {
      setDeviceType('ios');
    } else if (isAndroid) {
      setDeviceType('android');
    } else if (isDesktop) {
      setDeviceType('desktop');
    } else {
      setDeviceType('other');
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Verificar se deve mostrar o prompt
    const checkShouldShow = () => {
      const isRejected = localStorage.getItem('pwa-install-rejected');
      const lastRejectedTime = localStorage.getItem('pwa-install-rejected-time');
      const isInstalled = window.matchMedia('(display-mode: standalone)').matches;
      
      // Não mostrar se já está instalado
      if (isInstalled) return;
      
      // Mostrar novamente após 7 dias se foi rejeitado
      const shouldShowAfter7Days = lastRejectedTime && 
        (Date.now() - parseInt(lastRejectedTime)) > 7 * 24 * 60 * 60 * 1000;
      
      if (!isRejected || shouldShowAfter7Days) {
      // Mostrar com delay reduzido para aparecer mais rápido
      setTimeout(() => setShowPrompt(true), 2000);
      }
    };

    checkShouldShow();

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('PWA instalado com sucesso!');
      localStorage.removeItem('pwa-install-rejected');
      localStorage.removeItem('pwa-install-rejected-time');
    }
    
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa-install-rejected', 'true');
    localStorage.setItem('pwa-install-rejected-time', Date.now().toString());
  };

  const getInstallInstructions = () => {
    switch (deviceType) {
      case 'ios':
        return {
          icon: <Share className="h-4 w-4 text-primary" />,
          title: "📱 Instalar no iPhone",
          instruction: "No Safari: toque no ícone 'Compartilhar' (caixa com seta) e selecione 'Adicionar à Tela de Início'",
          buttonText: "Mostrar Como"
        };
      case 'android':
        return {
          icon: <Plus className="h-4 w-4 text-primary" />,
          title: "📱 Instalar App",
          instruction: "Use o menu do navegador ou o botão de instalação",
          buttonText: "Instalar"
        };
      case 'desktop':
        return {
          icon: <Download className="h-4 w-4 text-primary" />,
          title: "💻 Instalar App",
          instruction: "Clique no ícone de instalação na barra de endereços",
          buttonText: "Instalar"
        };
      default:
        return {
          icon: <Smartphone className="h-4 w-4 text-primary" />,
          title: "📱 Acesso Rápido",
          instruction: "Adicione este site aos favoritos para acesso rápido",
          buttonText: "Instalar"
        };
    }
  };

  // Sempre mostrar o prompt se passou o tempo necessário, independente do navegador
  if (!showPrompt) {
    return null;
  }

  const instructions = getInstallInstructions();

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 animate-in slide-in-from-bottom-4">
      <Card className="p-3 shadow-lg border border-primary/20 bg-card/95 backdrop-blur-sm max-w-sm mx-auto">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-full bg-primary/10 flex-shrink-0">
            {instructions.icon}
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm text-foreground">
              {instructions.title}
            </h3>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              {instructions.instruction}
            </p>
            
            <div className="flex gap-2 mt-3">
              <Button
                onClick={deferredPrompt ? handleInstall : handleDismiss}
                size="sm"
                className="text-xs h-8 px-3 bg-primary hover:bg-primary/90"
              >
                {deferredPrompt && deviceType !== 'ios' && (
                  <Download className="h-3 w-3 mr-1" />
                )}
                {instructions.buttonText}
              </Button>
              <Button
                onClick={handleDismiss}
                variant="ghost"
                size="sm"
                className="text-xs h-8 px-2 text-muted-foreground hover:text-foreground"
              >
                Depois
              </Button>
            </div>
          </div>
          
          <Button
            onClick={handleDismiss}
            variant="ghost"
            size="sm"
            className="p-1 h-auto flex-shrink-0 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default PWAInstallPrompt;