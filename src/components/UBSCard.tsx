import { useState, useEffect } from 'react';
import { MapPin, Clock, User, Download, Calendar, Phone, Building } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { UBS } from '@/types';
import QRCodeComponent from './QRCodeComponent';
import { useIsMobile } from '@/hooks/use-mobile';

interface UBSCardProps {
  ubs: UBS;
}

// Função auxiliar para remover acentos e normalizar
const normalizeText = (text: string) => {
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
};

const UBSCard = ({ ubs }: UBSCardProps) => {
  const [isMobile, setIsMobile] = useState(false);
  const isMobileHook = useIsMobile();

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleDownload = () => {
    if (ubs.pdfUrl) {
      const link = document.createElement('a');
      link.href = ubs.pdfUrl;
      link.download = `medicacoes_${ubs.nome.replace(/\s+/g, '_')}.pdf`;
      link.click();
    }
  };

  const getStatusColor = (status: 'aberto' | 'fechado') => {
    return status === 'aberto' ? 'default' : 'destructive';
  };

  const getStatusText = (status: 'aberto' | 'fechado') => {
    return status === 'aberto' ? 'Em Funcionamento' : 'Temporariamente Fechado';
  };

  const getUBSType = (nome: string) => {
    const nomeNormalized = normalizeText(nome);
    // Verifica se o nome contém 'farmacia' E 'municipal'
    const isFarmaciaCentral = nomeNormalized.includes('farmacia') && nomeNormalized.includes('municipal');
    if (isFarmaciaCentral) {
      return 'Farmácia Central';
    }
    return 'Unidade Básica de Saúde';
  };

  return (
    <Card className="hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-2 hover:border-primary/40 bg-gradient-to-br from-card to-card/95 backdrop-blur-sm w-full">
      <CardHeader className="pb-3 bg-gradient-to-r from-primary/8 to-primary/12 rounded-t-lg">
        <div className="flex items-start justify-between gap-2 sm:gap-3">
          <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
            <div className="p-2 sm:p-2.5 bg-gradient-to-br from-primary/15 to-primary/20 rounded-lg sm:rounded-xl shadow-sm">
              <Building className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <CardTitle className="text-sm sm:text-base font-bold text-primary truncate">
                {ubs.nome}
              </CardTitle>
              <p className="text-xs text-muted-foreground font-medium truncate">
                {getUBSType(ubs.nome)}
              </p>
            </div>
          </div>
          <Badge variant={getStatusColor(ubs.status) as any} className="font-medium text-xs whitespace-nowrap flex-shrink-0">
            {getStatusText(ubs.status)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 sm:space-y-4 p-3 sm:p-4">
        <div className="space-y-3 sm:space-y-4">
          <div className="flex items-start text-sm">
            <div className="p-2 bg-gradient-to-br from-primary/12 to-primary/18 rounded-lg mr-2 sm:mr-3 shadow-sm">
              <MapPin className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-foreground text-xs sm:text-sm">Localização</p>
              <p className="text-muted-foreground text-xs sm:text-sm break-words">{ubs.localidade}</p>
            </div>
          </div>
          <div className="flex items-start text-sm">
            <div className="p-2 bg-gradient-to-br from-primary/12 to-primary/18 rounded-lg mr-2 sm:mr-3 shadow-sm">
              <Clock className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-foreground text-xs sm:text-sm">Horário de Atendimento</p>
              <p className="text-muted-foreground text-xs sm:text-sm break-words">{ubs.horarios}</p>
            </div>
          </div>
          <div className="flex items-start text-sm">
            <div className="p-2 bg-gradient-to-br from-primary/12 to-primary/18 rounded-lg mr-2 sm:mr-3 shadow-sm">
              <User className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-foreground text-xs sm:text-sm">Responsável Técnico</p>
              <p className="text-muted-foreground text-xs sm:text-sm break-words">{ubs.responsavel}</p>
            </div>
          </div>
          <div className="flex items-start text-sm">
            <div className="p-2 bg-gradient-to-br from-primary/12 to-primary/18 rounded-lg mr-2 sm:mr-3 shadow-sm">
              <Phone className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-foreground text-xs sm:text-sm">Contato</p>
              <p className="text-muted-foreground text-xs sm:text-sm break-words">
                {ubs.contato || 'Disponível no local'}
              </p>
            </div>
          </div>
        </div>
        <Separator />
        <div className="space-y-3">
          <div className="text-center bg-gradient-to-r from-primary/8 to-primary/12 p-2 sm:p-3 rounded-lg">
            <h4 className="font-semibold text-primary mb-1 text-xs sm:text-sm">Lista de Medicamentos</h4>
            <p className="text-xs text-muted-foreground">
              Baixe a lista atualizada dos medicamentos disponíveis
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-3">
            <Button 
              onClick={handleDownload} 
              disabled={!ubs.pdfUrl}
              className="w-full sm:flex-1 text-xs sm:text-sm h-9 sm:h-10"
              variant={ubs.pdfUrl ? "default" : "secondary"}
            >
              <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              {ubs.pdfUrl ? 'Baixar Lista PDF' : 'Lista Indisponível'}
            </Button>
            <div className="flex-shrink-0">
              <QRCodeComponent 
                value={ubs.pdfUrl || '#'} 
                disabled={!ubs.pdfUrl} 
                size={isMobileHook ? 80 : isMobile ? 100 : 160} 
              />
            </div>
          </div>
          {ubs.pdfUltimaAtualizacao && (
            <div className="flex items-center justify-center text-xs text-muted-foreground bg-muted/50 p-2 rounded">
              <Calendar className="h-3 w-3 mr-1" />
              <span>Atualizada em: {ubs.pdfUltimaAtualizacao}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default UBSCard;