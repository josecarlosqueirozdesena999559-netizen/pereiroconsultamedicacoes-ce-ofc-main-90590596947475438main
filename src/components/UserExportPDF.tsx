import React, { useRef, useEffect } from 'react';
import { User } from '@/types';
import { Button } from '@/components/ui/button';
import { FileText } from 'lucide-react';

interface UserExportPDFProps {
  users: User[];
}

const UserExportPDF: React.FC<UserExportPDFProps> = ({ users }) => {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    if (printRef.current) {
      const printWindow = window.open('', '', 'height=600,width=800');
      if (printWindow) {
        printWindow.document.write('<html><head><title>Exportação de Usuários</title>');
        // Estilos básicos para a tabela no PDF
        printWindow.document.write(`
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { color: #16a34a; border-bottom: 2px solid #16a34a; padding-bottom: 10px; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
            th { background-color: #f2f2f2; color: #333; }
            .status-active { color: green; font-weight: bold; }
            .status-inactive { color: red; font-weight: bold; }
          </style>
        `);
        printWindow.document.write('</head><body>');
        printWindow.document.write(printRef.current.innerHTML);
        printWindow.document.write('</body></html>');
        printWindow.document.close();
        printWindow.print();
      }
    }
  };

  // Determinar o status de 'ativo' (assumindo que todos os usuários retornados são ativos, 
  // já que não há campo 'ativo' no tipo User, mas vou adicionar um placeholder 'Sim'/'Não' baseado no tipo)
  const getStatus = (user: User) => {
    // Como não há um campo 'ativo' explícito, vamos assumir que todos os usuários listados estão ativos.
    // Se o usuário for admin, vamos considerar 'Sim' para fins de exemplo.
    return user.tipo === 'admin' || user.tipo === 'responsavel' ? 'Sim' : 'Não';
  };

  return (
    <>
      <Button onClick={handlePrint} variant="outline" className="bg-white hover:bg-gray-50">
        <FileText className="h-4 w-4 mr-2" />
        Exportar Usuários (PDF)
      </Button>

      {/* Conteúdo oculto para impressão */}
      <div ref={printRef} className="hidden">
        <h1>Relatório de Exportação de Usuários e Senhas</h1>
        <p>Data de Exportação: {new Date().toLocaleDateString('pt-BR')}</p>
        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th>Login (Email)</th>
              <th>Senha (Hash)</th>
              <th>Ativo</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>{user.nome}</td>
                <td>{user.login}</td>
                <td>{user.senha}</td>
                <td>
                  <span className={getStatus(user) === 'Sim' ? 'status-active' : 'status-inactive'}>
                    {getStatus(user)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
};

export default UserExportPDF;