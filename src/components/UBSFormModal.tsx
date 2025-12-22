import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { UBS } from '@/types';
import { addUBS, updateUBS } from '@/lib/storage';

interface UBSFormModalProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  editingUBS: UBS | null;
  onSave: () => void;
}

const initialFormState = {
  nome: '',
  localidade: '',
  horarios: '',
  responsavel: '',
  contato: '',
  status: 'aberto' as 'aberto' | 'fechado'
};

const UBSFormModal: React.FC<UBSFormModalProps> = ({ isOpen, setIsOpen, editingUBS, onSave }) => {
  const [ubsForm, setUbsForm] = useState(initialFormState);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (editingUBS) {
      setUbsForm({
        nome: editingUBS.nome,
        localidade: editingUBS.localidade,
        horarios: editingUBS.horarios,
        responsavel: editingUBS.responsavel,
        contato: editingUBS.contato || '',
        status: editingUBS.status
      });
    } else {
      setUbsForm(initialFormState);
    }
  }, [editingUBS, isOpen]);

  const handleUBSSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      if (editingUBS) {
        await updateUBS(editingUBS.id, {
          ...ubsForm
        });
        toast({
          title: "UBS atualizada com sucesso!",
          description: `${ubsForm.nome} foi atualizada.`,
        });
      } else {
        await addUBS({
          ...ubsForm
        });
        toast({
          title: "UBS criada com sucesso!",
          description: `${ubsForm.nome} foi adicionada ao sistema.`,
        });
      }
      
      onSave();
      setIsOpen(false);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao salvar a UBS.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {editingUBS ? 'Editar UBS' : 'Nova UBS'}
          </DialogTitle>
          <DialogDescription>
            {editingUBS ? 'Edite as informações da UBS' : 'Adicione uma nova UBS ao sistema'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleUBSSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome da UBS</Label>
              <Input
                id="nome"
                value={ubsForm.nome}
                onChange={(e) => setUbsForm({...ubsForm, nome: e.target.value})}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="localidade">Localidade</Label>
              <Input
                id="localidade"
                value={ubsForm.localidade}
                onChange={(e) => setUbsForm({...ubsForm, localidade: e.target.value})}
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="horarios">Horários de Funcionamento</Label>
            <Input
              id="horarios"
              value={ubsForm.horarios}
              onChange={(e) => setUbsForm({...ubsForm, horarios: e.target.value})}
              placeholder="Ex: 07:00 às 17:00"
              required
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="responsavel">Responsável (Nome)</Label>
              <Input
                id="responsavel"
                value={ubsForm.responsavel}
                onChange={(e) => setUbsForm({...ubsForm, responsavel: e.target.value})}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contato">Contato</Label>
              <Input
                id="contato"
                value={ubsForm.contato}
                onChange={(e) => setUbsForm({...ubsForm, contato: e.target.value})}
                placeholder="Ex: (85) 99999-9999"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={ubsForm.status}
              onValueChange={(value: 'aberto' | 'fechado') => setUbsForm({...ubsForm, status: value})}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="aberto">Aberto</SelectItem>
                <SelectItem value="fechado">Fechado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Salvando...' : editingUBS ? 'Atualizar' : 'Criar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default UBSFormModal;