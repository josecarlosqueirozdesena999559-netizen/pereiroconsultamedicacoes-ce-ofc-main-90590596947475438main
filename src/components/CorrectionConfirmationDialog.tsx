import React, { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { AlertCircle, Check, X } from 'lucide-react';
import { CorrecaoPDF } from '@/lib/storage';
import { UBS, User } from '@/types';

interface CorrectionConfirmationDialogProps {
  correction: CorrecaoPDF;
  ubs: UBS;
  user: User;
  actionType: 'approve' | 'reject';
  onConfirm: () => void;
}

const CorrectionConfirmationDialog: React.FC<CorrectionConfirmationDialogProps> = ({
  correction,
  ubs,
  user,
  actionType,
  onConfirm,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const isApprove = actionType === 'approve';
  const periodoFormatado = correction.periodo === 'manha' ? 'manhã' : 'tarde';
  
  const title = isApprove ? 'Aprovar Correção?' : 'Rejeitar Correção?';
  const description = isApprove
    ? `Tem certeza que deseja APROVAR a correção para o período da ${periodoFormatado} na UBS ${ubs.nome} (Responsável: ${user.nome})? Isso LIBERARÁ o check para um novo upload.`
    : `Tem certeza que deseja REJEITAR a solicitação de correção para a UBS ${ubs.nome}? O responsável NÃO poderá fazer um novo upload para este período.`;

  const confirmButtonText = isApprove ? 'Aprovar' : 'Rejeitar';
  const confirmButtonVariant = isApprove ? 'success' : 'destructive';
  const icon = isApprove ? <Check className="h-5 w-5 text-success" /> : <X className="h-5 w-5 text-destructive" />;

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant={isApprove ? 'success' : 'outline'}
          className={isApprove ? '' : 'text-destructive hover:bg-destructive/10'}
        >
          {isApprove ? <Check className="h-4 w-4 mr-2" /> : <X className="h-4 w-4 mr-2" />}
          {isApprove ? 'Aprovar Correção' : 'Rejeitar'}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${isApprove ? 'bg-success/10' : 'bg-destructive/10'}`}>
              {icon}
            </div>
            <AlertDialogTitle className="text-xl font-bold">
              {title}
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="pt-2 text-base">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction 
            onClick={onConfirm} 
            className={`bg-${confirmButtonVariant} hover:bg-${confirmButtonVariant}/90`}
          >
            {confirmButtonText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default CorrectionConfirmationDialog;
