import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { User } from '@/types';
import { addUser, updateUser } from '@/lib/storage';

interface UserFormModalProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  editingUser: User | null;
  onSave: () => void;
}

const initialFormState = {
  login: '',
  nome: '',
  senha: '',
  tipo: 'responsavel' as 'admin' | 'responsavel',
  ubsVinculadas: [] as string[]
};

const UserFormModal: React.FC<UserFormModalProps> = ({ isOpen, setIsOpen, editingUser, onSave }) => {
  const [userForm, setUserForm] = useState(initialFormState);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (editingUser) {
      setUserForm({
        login: editingUser.login,
        nome: editingUser.nome,
        senha: '', // Senha não pode ser visualizada/editada diretamente
        tipo: editingUser.tipo,
        ubsVinculadas: editingUser.ubsVinculadas
      });
    } else {
      setUserForm(initialFormState); // Corrigido de setUbsForm para setUserForm
    }
  }, [editingUser, isOpen]);

  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      if (editingUser) {
        // Apenas atualiza nome, tipo e vinculações (login/senha não podem ser alterados aqui)
        await updateUser(editingUser.id, {
          nome: userForm.nome,
          tipo: userForm.tipo,
          ubsVinculadas: userForm.ubsVinculadas,
          login: userForm.login, // Adicionado para permitir a atualização do email
          // Inclui a senha apenas se foi preenchida
          ...(userForm.senha && { senha: userForm.senha })
        });
        toast({
          title: "Usuário atualizado com sucesso!",
          description: `${userForm.nome} foi atualizado.`,
        });
      } else {
        // Criação de novo usuário
        if (!userForm.login || !userForm.senha || !userForm.nome) {
          toast({
            title: "Campos obrigatórios",
            description: "Preencha email, nome e senha para criar o usuário.",
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }
        
        await addUser(userForm);
        toast({
          title: "Usuário criado com sucesso!",
          description: `${userForm.nome} foi adicionado ao sistema.`,
        });
      }
      
      onSave();
      setIsOpen(false);
    } catch (error) {
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Ocorreu um erro ao salvar o usuário.",
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
            {editingUser ? 'Editar Usuário' : 'Novo Usuário'}
          </DialogTitle>
          <DialogDescription>
            {editingUser 
              ? 'Edite o nome, tipo, email e, opcionalmente, a senha do usuário.' 
              : 'Crie um novo usuário para acesso ao Dashboard.'
            }
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleUserSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nome">Nome Completo</Label>
            <Input
              id="nome"
              value={userForm.nome}
              onChange={(e) => setUserForm({...userForm, nome: e.target.value})}
              placeholder="Ex: João Silva"
              required
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="login">E-mail (Login)</Label>
              <Input
                id="login"
                type="email"
                value={userForm.login}
                onChange={(e) => setUserForm({...userForm, login: e.target.value})}
                placeholder="usuario@exemplo.com"
                // Removido o disabled para permitir a edição do email
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="senha">Senha</Label>
              <Input
                id="senha"
                type="password"
                value={userForm.senha}
                onChange={(e) => setUserForm({...userForm, senha: e.target.value})}
                placeholder={editingUser ? 'Deixe vazio para não alterar' : 'Senha'}
                required={!editingUser}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="tipo">Tipo de Usuário</Label>
            <Select
              value={userForm.tipo}
              onValueChange={(value: 'admin' | 'responsavel') => setUserForm({...userForm, tipo: value})}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="responsavel">Responsável UBS</SelectItem>
                <SelectItem value="admin">Administrador</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Salvando...' : editingUser ? 'Atualizar Usuário' : 'Criar Usuário'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default UserFormModal;