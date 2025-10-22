import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { UBS, User } from '@/types';
import { UpdateCheckHistory } from '@/lib/storage';
import { format, getDay, startOfDay, isBefore } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface UpdateReportPDFProps {
  history: UpdateCheckHistory[];
  ubsList: UBS[];
  usersList: User[];
  startDate: Date;
  endDate: Date;
}

/** Formata data ISO(yyyy-mm-dd) -> dd/MM/yyyy */
const formatDate = (dateString: string) =>
  format(new Date(dateString), 'dd/MM/yyyy', { locale: ptBR });

/** Gera somente dias úteis (seg-sex) no intervalo */
const getBusinessDaysInRange = (start: Date, end: Date): string[] => {
  const dates: string[] = [];
  let currentDate = startOfDay(start);
  const endDate = startOfDay(end);

  while (isBefore(currentDate, endDate) || currentDate.getTime() === endDate.getTime()) {
    const dow = getDay(currentDate); // 0 dom ... 6 sáb
    if (dow >= 1 && dow <= 5) dates.push(format(currentDate, 'yyyy-MM-dd'));
    currentDate = new Date(currentDate.getTime() + 24 * 60 * 60 * 1000);
  }
  return dates;
};

type UbsSummary = {
  ubsName: string;
  responsavelNames: string;
  totalDays: number;
  updatedManha: number;
  updatedTarde: number;
  daysMissed: number;
  daysCompleted: number;
  completionPct: number;
  details: Record<string, { manha: boolean; tarde: boolean; user: string }>;
};

const summarizeHistory = (
  history: UpdateCheckHistory[],
  ubsList: UBS[],
  usersList: User[],
  startDate: Date,
  endDate: Date
) => {
  const summary: Record<string, UbsSummary> = {};
  const allBusinessDates = getBusinessDaysInRange(startDate, endDate);

  ubsList.forEach((ubs) => {
    const responsaveis = usersList
      .filter((u) => u.ubsVinculadas.includes(ubs.id))
      .map((u) => u.nome)
      .join(', ');

    summary[ubs.id] = {
      ubsName: ubs.nome,
      responsavelNames: responsaveis || 'N/A',
      totalDays: allBusinessDates.length,
      updatedManha: 0,
      updatedTarde: 0,
      daysMissed: 0,
      daysCompleted: 0,
      completionPct: 0,
      details: {},
    };
  });

  const businessDayHistory = history.filter(
    (h) => h.data && allBusinessDates.includes(h.data)
  );

  businessDayHistory.forEach((check) => {
    const ubsSum = summary[check.ubs_id];
    if (!ubsSum) return;

    const dateKey = check.data;
    const user = usersList.find((u) => u.id === check.user_id)?.nome || 'Desconhecido';
    if (!ubsSum.details[dateKey]) ubsSum.details[dateKey] = { manha: false, tarde: false, user: '' };

    if (check.manha) ubsSum.details[dateKey].manha = true;
    if (check.tarde) ubsSum.details[dateKey].tarde = true;
    ubsSum.details[dateKey].user = user;
  });

  Object.values(summary).forEach((u) => {
    let completed = 0;
    allBusinessDates.forEach((dateKey) => {
      const d = u.details[dateKey];
      if (d) {
        if (d.manha) u.updatedManha++;
        if (d.tarde) u.updatedTarde++;
        if (d.manha && d.tarde) completed++;
      }
    });
    u.daysCompleted = completed;
    u.daysMissed = u.totalDays - completed;
    u.completionPct = u.totalDays > 0 ? Math.round((completed / u.totalDays) * 100) : 0;
  });

  return { summary, allBusinessDates };
};

const UpdateReportPDF: React.FC<UpdateReportPDFProps> = ({
  history,
  ubsList,
  usersList,
  startDate,
  endDate,
}) => {
  const printRef = useRef<HTMLDivElement>(null);
  const { summary, allBusinessDates } = summarizeHistory(
    history,
    ubsList,
    usersList,
    startDate,
    endDate
  );
  const ubsSummaryList = Object.values(summary);

  const handlePrint = () => {
    if (!printRef.current) return;
    const w = window.open('', '', 'height=800,width=1000');
    if (!w) return;

    w.document.write('<html><head><title>Relatório de Atualizações - ConsultMed</title>');
    // ======= TEMA VERDE "ConsultMed" =======
    w.document.write(`
      <style>
        :root{
          --green-600:#28a745;   /* principal */
          --green-700:#1e7e34;
          --green-100:#e9f7ef;
          --green-200:#d4edda;
          --green-900:#0f3f1b;
          --gray-100:#f9fafb;
          --gray-200:#edf2f7;
          --gray-300:#e2e8f0;
          --gray-600:#4a5568;
          --red-100:#fde8e8;
          --red-600:#e53e3e;
        }
        *{box-sizing:border-box}
        body{font-family:Arial,Helvetica,sans-serif;margin:20px;color:#333;}
        .brand{font-weight:800;letter-spacing:.2px}
        .header-card{
          background:var(--green-600);
          color:#fff;
          border-radius:12px;
          padding:24px;
          margin-bottom:18px;
        }
        .header-top{
          display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;
        }
        .system{font-size:12px;opacity:.95}
        .header-card h1{
          margin:0;
          font-size:22px;
          font-weight:800;
        }
        .header-grid{
          display:grid;
          grid-template-columns:repeat(2,minmax(0,1fr));
          gap:14px;
          font-size:12px;
          margin-top:10px;
        }
        .muted{opacity:.95}
        .section{
          background:#fff;
          border:1px solid var(--gray-300);
          border-radius:12px;
          padding:16px;
          margin:14px 0 22px 0;
        }
        .section h2{margin:0 0 8px 0;font-size:16px}
        .ubs-card{
          background:#fff;
          border:1px solid var(--gray-300);
          border-radius:12px;
          padding:14px;
          margin:16px 0;
          page-break-inside: avoid;
        }
        .ubs-title{font-size:15px;font-weight:700;margin:0 0 6px 0}
        .meta{font-size:12px;margin:0 0 8px 0}
        .stats{
          display:grid;
          grid-template-columns:repeat(4,minmax(0,1fr));
          gap:10px;
          margin:8px 0 12px 0;
        }
        .stat{
          background:var(--gray-100);
          border:1px solid var(--gray-300);
          border-radius:10px;
          padding:10px;
        }
        .stat h3{
          margin:0 0 4px 0;
          font-size:11px;
          font-weight:600;
          color:var(--gray-600);
        }
        .stat .big{font-size:18px;font-weight:800;margin:0}
        .stat.ok{background:var(--green-100);border-color:var(--green-200)}
        .stat.err{background:var(--red-100);border-color:#f8d7da}
        .progress{
          height:10px;background:var(--gray-200);
          border-radius:999px;overflow:hidden;margin:2px 0 10px 0;border:1px solid var(--gray-300);
        }
        .bar{height:100%;background:var(--green-600)}
        .progress-row{display:flex;justify-content:space-between;font-size:11px;margin-bottom:8px}
        table{width:100%;border-collapse:collapse;margin-top:8px;font-size:11px}
        th,td{border:1px solid var(--gray-300);padding:6px;text-align:left}
        th{background:var(--green-200);color:var(--green-900)}
        .yes{font-weight:700;color:var(--green-700)}
        .no{font-weight:700;color:#b00020}
        .badge{display:inline-block;padding:2px 8px;border-radius:999px;font-size:11px;background:var(--green-100);border:1px solid var(--green-200);color:var(--green-700);font-weight:700}
        .footer{margin-top:18px;font-size:10px;opacity:.8;text-align:right}
      </style>
    `);
    // =======================================
    w.document.write('</head><body>');
    w.document.write(printRef.current.innerHTML);
    w.document.close();
    w.print();
  };

  if (allBusinessDates.length === 0) {
    return (
      <Button disabled variant="outline" className="w-full">
        <Download className="h-4 w-4 mr-2" />
        Exportar Relatório (Sem Dias Úteis)
      </Button>
    );
  }

  const totalUbs = ubsSummaryList.length;
  const totalDiasUteis = allBusinessDates.length;
  const agoraBR = new Date().toLocaleString('pt-BR');

  return (
    <>
      <Button onClick={handlePrint} variant="default" className="w-full">
        <Download className="h-4 w-4 mr-2" />
        Exportar Relatório PDF
      </Button>

      {/* ====== CONTEÚDO DO PDF ====== */}
      <div ref={printRef} className="hidden">
        {/* Cabeçalho principal com nome do sistema */}
        <div className="header-card">
          <div className="header-top">
            <div className="system">
              Sistema <span className="brand">ConsultMed</span>
            </div>
          </div>
          <h1>Relatório de Atualizações de UBS</h1>
          <div className="header-grid">
            <div>
              <div className="muted">Período</div>
              <div>
                <b>{formatDate(startDate.toISOString())}</b> a <b>{formatDate(endDate.toISOString())}</b>
              </div>
            </div>
            <div>
              <div className="muted">Data de Geração</div>
              <div><b>{agoraBR}</b></div>
            </div>
            <div>
              <div className="muted">Total de UBS</div>
              <div><b>{totalUbs} {totalUbs === 1 ? 'unidade' : 'unidades'}</b></div>
            </div>
            <div>
              <div className="muted">Dias Úteis</div>
              <div><b>{totalDiasUteis} dias</b></div>
            </div>
          </div>
        </div>

        {/* Resumo geral */}
        <div className="section">
          <h2>Resumo Geral</h2>
          <p style={{ margin: 0, fontSize: 12 }}>
            Este relatório apresenta o acompanhamento das atualizações realizadas nas UBS durante {totalDiasUteis} dias úteis,
            considerando os turnos de manhã e tarde.
          </p>
        </div>

        {/* Cartões por UBS */}
        {ubsSummaryList.map((u, idx) => {
          const pct = u.completionPct;
          return (
            <div className="ubs-card" key={idx}>
              <div className="ubs-title">{u.ubsName}</div>
              <div className="meta">
                <b>Responsável(is):</b> {u.responsavelNames} &nbsp;&nbsp;
                <span className="badge">Concluído: {pct}%</span>
              </div>

              {/* Métricas (4 cards) */}
              <div className="stats">
                <div className="stat">
                  <h3>DIAS ÚTEIS</h3>
                  <p className="big">{u.totalDays}</p>
                  <div className="muted">no período</div>
                </div>

                <div className="stat ok">
                  <h3>MANHÃ</h3>
                  <p className="big">{u.updatedManha}</p>
                  <div className="muted">
                    {u.totalDays ? Math.round((u.updatedManha / u.totalDays) * 100) : 0}% completo
                  </div>
                </div>

                <div className="stat ok">
                  <h3>TARDE</h3>
                  <p className="big">{u.updatedTarde}</p>
                  <div className="muted">
                    {u.totalDays ? Math.round((u.updatedTarde / u.totalDays) * 100) : 0}% completo
                  </div>
                </div>

                <div className="stat err">
                  <h3>DIAS PERDIDOS</h3>
                  <p className="big">{u.daysMissed}</p>
                  <div className="muted">incompletos</div>
                </div>
              </div>

              {/* Barra de progresso */}
              <div className="progress-row">
                <div className="muted">Progresso de Conclusão</div>
                <div className="muted">{pct}%</div>
              </div>
              <div className="progress">
                <div className="bar" style={{ width: `${pct}%` }} />
              </div>

              {/* Tabela de detalhamento diário */}
              <div className="section" style={{ marginTop: 12 }}>
                <h2 style={{ fontSize: 14, marginBottom: 6 }}>Detalhamento Diário</h2>
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
                      const d = u.details[date];
                      return (
                        <tr key={date}>
                          <td>{formatDate(date)}</td>
                          <td className={d?.manha ? 'yes' : 'no'}>{d?.manha ? 'Sim' : 'Não'}</td>
                          <td className={d?.tarde ? 'yes' : 'no'}>{d?.tarde ? 'Sim' : 'Não'}</td>
                          <td>{d?.user || 'N/A'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}

        {/* Rodapé com marca do sistema */}
        <div className="footer">
          Gerado por <strong>ConsultMed</strong>
        </div>
      </div>
    </>
  );
};

export default UpdateReportPDF;
