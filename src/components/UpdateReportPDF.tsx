import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { FileText, Download } from 'lucide-react';
import { UBS, User } from '@/types';
import { UpdateCheckHistory } from '@/lib/storage';
import { format, getDay, isWeekend, isBefore, isAfter, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface UpdateReportPDFProps {
  history: UpdateCheckHistory[];
  ubsList: UBS[];
  usersList: User[];
  startDate: Date;
  endDate: Date;
}

// Função auxiliar para formatar a data para exibição
const formatDate = (dateString: string) => {
  return format(new Date(dateString), 'dd/MM/yyyy', { locale: ptBR });
};

// Função para gerar todas as datas úteis (Segunda a Sexta) dentro do intervalo
const getBusinessDaysInRange = (start: Date, end: Date): string[] => {
  const dates: string[] = [];
  let currentDate = startOfDay(start);
  const endDate = startOfDay(end);

  while (isBefore(currentDate, endDate) || currentDate.getTime() === endDate.getTime()) {
    const dayOfWeek = getDay(currentDate); // 0 = Domingo, 6 = Sábado
    
    // 1 (Segunda) a 5 (Sexta)
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      dates.push(format(currentDate, 'yyyy-MM-dd'));
    }
    
    // Avança para o próximo dia
    currentDate = new Date(currentDate.getTime() + 24 * 60 * 60 * 1000);
  }
  return dates;
};


// Função auxiliar para agrupar e resumir os dados
const summarizeHistory = (history: UpdateCheckHistory[], ubsList: UBS[], usersList: User[], startDate: Date, endDate: Date) => {
  const summary: Record<string, {
    ubsName: string;
    responsavelNames: string;
    totalDays: number;
    updatedManha: number;
    updatedTarde: number;
    daysMissed: number;
    details: Record<string, { manha: boolean; tarde: boolean; user: string }>;
  }> = {};

  // 1. Gerar a lista de todos os dias úteis no período
  const allBusinessDates = getBusinessDaysInRange(startDate, endDate);

  // 2. Inicializar o resumo
  ubsList.forEach(ubs => {
    const responsaveis = usersList
      .filter(u => u.ubsVinculadas.includes(ubs.id))
      .map(u => u.nome)
      .join(', ');

    summary[ubs.id] = {
      ubsName: ubs.nome,
      responsavelNames: responsaveis || 'N/A',
      totalDays: allBusinessDates.length, // Total de dias úteis
      updatedManha: 0,
      updatedTarde: 0,
      daysMissed: 0,
      details: {}
    };
  });

  // 3. Processar o histórico (filtrando apenas os dias úteis)
  const businessDayHistory = history.filter(check => allBusinessDates.includes(check.data));

  businessDayHistory.forEach(check => {
    if (summary[check.ubs_id]) {
      const ubsSummary = summary[check.ubs_id];
      const dateKey = check.data;
      const user = usersList.find(u => u.id === check.user_id)?.nome || 'Desconhecido';

      if (!ubsSummary.details[dateKey]) {
        ubsSummary.details[dateKey] = { manha: false, tarde: false, user: '' };
      }

      // Se o check for mais completo, atualiza
      if (check.manha) {
        ubsSummary.details[dateKey].manha = true;
      }
      if (check.tarde) {
        ubsSummary.details[dateKey].tarde = true;
      }
      ubsSummary.details[dateKey].user = user;
    }
  });

  // 4. Calcular totais e dias perdidos
  Object.values(summary).forEach(ubsSummary => {
    let daysCompleted = 0;
    
    allBusinessDates.forEach(dateKey => {
      const detail = ubsSummary.details[dateKey];
      
      if (detail) {
        if (detail.manha) ubsSummary.updatedManha++;
        if (detail.tarde) ubsSummary.updatedTarde++;
        
        if (detail.manha && detail.tarde) {
            daysCompleted++;
        }
      }
    });
    
    // Dias perdidos = Total de dias úteis - Dias Completos
    ubsSummary.daysMissed = ubsSummary.totalDays - daysCompleted;
  });

  return summary;
};


const UpdateReportPDF: React.FC<UpdateReportPDFProps> = ({ history, ubsList, usersList, startDate, endDate }) => {
  const printRef = useRef<HTMLDivElement>(null);
  
  const summary = summarizeHistory(history, ubsList, usersList, startDate, endDate);
  const ubsSummaryList = Object.values(summary);
  
  // Gerar a lista de todas as datas úteis no período para a tabela de detalhes
  const allBusinessDates = getBusinessDaysInRange(startDate, endDate);

  const handlePrint = () => {
    if (printRef.current) {
      const printWindow = window.open('', '', 'height=600,width=800');
      if (printWindow) {
        printWindow.document.write('<html><head><title>Relatório de Atualizações</title>');
        // Estilos básicos para a tabela no PDF (Cores removidas)
        printWindow.document.write(`
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { color: #333; border-bottom: 2px solid #ccc; padding-bottom: 10px; margin-bottom: 20px; }
            h2 { color: #333; margin-top: 30px; border-bottom: 1px solid #eee; padding-bottom: 5px; }
            p { font-size: 12px; margin-bottom: 5px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 10px; }
            th { background-color: #f2f2f2; color: #333; }
            .summary-box { border: 1px solid #ccc; padding: 10px; margin-bottom: 15px; background-color: #f9f9f9; }
            
            /* Estilos de status simplificados para preto/negrito */
            .status-highlight { font-weight: bold; }
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

  if (history.length === 0 && allBusinessDates.length > 0) {
    // Se não há histórico, mas há dias úteis no período, ainda podemos mostrar o relatório vazio.
  } else if (allBusinessDates.length === 0) {
     return (
      <Button disabled variant="outline" className="w-full">
        <Download className="h-4 w-4 mr-2" />
        Exportar Relatório (Sem Dias Úteis)
      </Button>
    );
  }

  return (
    <>
      <Button onClick={handlePrint} variant="default" className="w-full">
        <Download className="h-4 w-4 mr-2" />
        Exportar Relatório PDF
      </Button>

      {/* Conteúdo oculto para impressão */}
      <div ref={printRef} className="hidden">
        <h1>Relatório de Atualizações de UBS</h1>
        <p><strong>Período:</strong> {formatDate(startDate.toISOString())} a {formatDate(endDate.toISOString())} (Apenas Dias Úteis)</p>
        <p><strong>Data de Geração:</strong> {new Date().toLocaleString('pt-BR')}</p>

        <h2>Resumo por UBS</h2>
        {ubsSummaryList.map((ubsSummary, index) => (
          <div key={index} style={{ pageBreakInside: 'avoid' }} className="summary-box">
            <h3>{ubsSummary.ubsName}</h3>
            <p><strong>Responsável(is):</strong> {ubsSummary.responsavelNames}</p>
            <p><strong>Dias Úteis no Período:</strong> {ubsSummary.totalDays}</p>
            <p><strong>Atualizações Manhã:</strong> {ubsSummary.updatedManha} / {ubsSummary.totalDays}</p>
            <p><strong>Atualizações Tarde:</strong> {ubsSummary.updatedTarde} / {ubsSummary.totalDays}</p>
            <p><strong>Dias Perdidos (Não Completos):</strong> <span className={ubsSummary.daysMissed > 0 ? 'status-highlight' : ''}>{ubsSummary.daysMissed}</span></p>
            
            <h4>Detalhes Diários:</h4>
            <table>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Manhã</th>
                  <th>Tarde</th>
                  <th>Responsável (Último Check)</th>
                </tr>
              </thead>
              <tbody>
                {allBusinessDates.map((date) => {
                  const detail = ubsSummary.details[date];
                  return (
                    <tr key={date}>
                      <td>{formatDate(date)}</td>
                      <td className={detail?.manha ? 'status-highlight' : ''}>{detail?.manha ? 'Sim' : 'Não'}</td>
                      <td className={detail?.tarde ? 'status-highlight' : ''}>{detail?.tarde ? 'Sim' : 'Não'}</td>
                      <td>{detail?.user || 'N/A'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </>
  );
};

export default UpdateReportPDF;