import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { AlertCircle, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { requestPDFCorrection } from '@/lib/storage';

interface CorrectionRequestModalProps {
  ubsId: string;
  ubsName: string;
  onSuccess: () => void;
}

const CorrectionRequestModal: React.FC<CorrectionRequestModalProps> = ({ ubsId, ubsName, onSuccess }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [periodo, setPeriodo] = useState<'manha' | 'tarde'>('manha');
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!user) {
      toast({
        title: "Erro de Autenticação",
        description: "Usuário não logado.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const success = await requestPDFCorrection(user.id, ubsId, periodo);

      if (success) {
        toast({
          title: "Solicitação Enviada",
          description: `Sua solicitação de correção para o período da ${periodo} na UBS ${ubsName} foi enviada ao administrador.`,
        });
        onSuccess();
        setIsOpen(false);
      } else {
        throw new Error("Falha ao enviar solicitação.");
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível enviar a solicitação. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="destructive" 
          className="w-full bg-destructive/90 hover:bg-destructive text-xs sm:text-sm h-8"
        >
          <AlertCircle className="h-3 w-3 mr-2" />
          Coloquei o PDF Errado
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-destructive flex items-center gap-2 text-xl font-bold">
            <AlertCircle className="h-6 w-6 flex-shrink-0" />
            Solicitar Correção de PDF
          </DialogTitle>
          <DialogDescription className="text-base text-muted-foreground pt-2">
            Selecione o período que você precisa corrigir o upload do PDF na UBS <strong>{ubsName}</strong>.
            O administrador será notificado para aprovar a liberação do check.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4 space-y-4">
          {/* Card de Atenção com cores corrigidas para legibilidade */}
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
            <p className="font-semibold">Atenção:</p>
            <p className="text-xs mt-1">Isso só deve ser usado se o PDF enviado estiver incorreto ou for o arquivo errado.</p>
          </div>

          <RadioGroup 
            defaultValue="manha" 
            onValueChange={(value: 'manha' | 'tarde') => setPeriodo(value)}
            className="grid grid-cols-2 gap-4"
          >
            <div className="flex items-center space-x-2 p-3 border rounded-md hover:bg-muted/50 cursor-pointer">
              <RadioGroupItem value="manha" id="r1" />
              <Label htmlFor="r1" className="font-medium">Manhã</Label>
            </div>
            <div className="flex items-center space-x-2 p-3 border rounded-md hover:bg-muted/50 cursor-pointer">
              <RadioGroupItem value="tarde" id="r2" />
              <Label htmlFor="r2" className="font-medium">Tarde</Label>
            </div>
          </RadioGroup>
        </div>
        
        <DialogFooter>
          <Button 
            onClick={handleSubmit} 
            disabled={isLoading}
            className="bg-destructive hover:bg-destructive/90"
          >
            <Send className="h-4 w-4 mr-2" />
            {isLoading ? 'Enviando...' : 'Enviar Solicitação'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CorrectionRequestModal;