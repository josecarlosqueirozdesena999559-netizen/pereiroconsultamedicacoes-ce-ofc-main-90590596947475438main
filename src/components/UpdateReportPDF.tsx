import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { UBS, User } from '@/types';
import { UpdateCheckHistory } from '@/lib/storage';
import { format, startOfDay, parse } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface UpdateReportPDFProps {
  history: UpdateCheckHistory[];
  ubsList: UBS[];
  usersList: User[];
  startDate: Date;
  endDate: Date;
}

/** Formata datas de forma local:
 * - string 'yyyy-MM-dd' (sem timezone) => parse local
 * - Date => formata direto
 */
const formatDate = (value: string | Date) => {
  const d =
    typeof value === 'string'
      ? parse(value, 'yyyy-MM-dd', new Date()) // evita UTC implícito
      : value;
  return format(d, 'dd/MM/yyyy', { locale: ptBR });
};

/** Gera somente dias úteis (seg-sex) no intervalo (local, DST-safe) */
const getBusinessDaysInRange = (start: Date, end: Date): string[] => {
  const dates: string[] = [];
  const cur = new Date(start.getFullYear(), start.getMonth(), start.getDate()); // zera hora local
  const endLocal = new Date(end.getFullYear(), end.getMonth(), end.getDate());

  while (cur.getTime() <= endLocal.getTime()) {
    const dow = cur.getDay(); // 0 dom ... 6 sáb (local)
    if (dow >= 1 && dow <= 5) {
      dates.push(format(cur, 'yyyy-MM-dd')); // sempre local (sem UTC shift)
    }
    // avança 1 dia de forma local (DST-safe)
    cur.setDate(cur.getDate() + 1);
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
  /** Detalhe do dia => último responsável + flags */
  details: Record<string, { manha: boolean; tarde: boolean; user: string }>;
};

/** Normaliza múltiplos checks no mesmo dia:
 * - manha/tarde = OR lógico de todos os registros daquele dia/UBS
 * - user = do registro mais RECENTE por created_at (quando houver)
 */
const summarizeHistory = (
  history: UpdateCheckHistory[],
  ubsList: UBS[],
  usersList: User[],
  startDate: Date,
  endDate: Date
) => {
  const summary: Record<string, UbsSummary> = {};
  const allBusinessDates = getBusinessDaysInRange(startDate, endDate);

  // mapa rápido userId->nome
  const userNameById = new Map(usersList.map((u) => [u.id, u.nome]));

  // Inicializa todas as UBS com todos os dias do período (tabela nunca “some”)
  ubsList.forEach((ubs) => {
    const responsaveis = usersList
      .filter(
        (u: any) =>
          Array.isArray(u?.ubsVinculadas) && u.ubsVinculadas.includes(ubs.id)
      )
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
      details: Object.fromEntries(
        allBusinessDates.map((d) => [d, { manha: false, tarde: false, user: '' }])
      ),
    };
  });

  // Considera apenas dias úteis do range
  const businessDayHistory = history.filter(
    (h) => h.data && allBusinessDates.includes(h.data as any)
  );

  // Indexa por (ubs_id, data) e escolhe o registro mais recente por created_at para o "user"
  type DayAgg = { manha: boolean; tarde: boolean; lastUserId: string; lastCreatedAt: string };
  const dayAgg = new Map<string, DayAgg>(); // key = `${ubs_id}|${data}`

  for (const check of businessDayHistory) {
    const key = `${check.ubs_id}|${check.data}`;
    const prev = dayAgg.get(key);

    const createdAt = (check as any).created_at ?? ''; // se o tipo tiver
    const manha = !!check.manha;
    const tarde = !!check.tarde;

    if (!prev) {
      dayAgg.set(key, {
        manha,
        tarde,
        lastUserId: (check as any).user_id ?? '',
        lastCreatedAt: createdAt,
      });
    } else {
      // OR lógico nos turnos
      const newManha = prev.manha || manha;
      const newTarde = prev.tarde || tarde;
      // escolhe user do registro mais recente (ISO lex compare funciona)
      const newer =
        !!createdAt && (!prev.lastCreatedAt || createdAt > prev.lastCreatedAt);
      dayAgg.set(key, {
        manha: newManha,
        tarde: newTarde,
        lastUserId: newer ? ((check as any).user_id ?? prev.lastUserId) : prev.lastUserId,
        lastCreatedAt: newer ? createdAt : prev.lastCreatedAt,
      });
    }
  }

  // Aplica agregação no summary
  for (const [key, agg] of dayAgg.entries()) {
    const [ubsId, dia] = key.split('|');
    const u = summary[ubsId];
    if (!u) continue;

    const userName = userNameById.get(agg.lastUserId) || 'Desconhecido';
    const d = u.details[dia]; // já existe para todos os dias
    d.manha = agg.manha;
    d.tarde = agg.tarde;
    d.user = userName;
  }

  // Métricas finais
  Object.values(summary).forEach((u) => {
    let completed = 0;
    for (const dateKey of allBusinessDates) {
      const d = u.details[dateKey];
      if (d.manha) u.updatedManha++;
      if (d.tarde) u.updatedTarde++;
      if (d.manha && d.tarde) completed++;
    }
    u.daysCompleted = completed;
    u.daysMissed = u.totalDays - completed;
    u.completionPct =
      u.totalDays > 0 ? Math.round((completed / u.totalDays) * 100) : 0;
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
        table{width:100%;border-collapse:collapse;margin-top:8px;font-size:11px}
        th,td{border:1px solid var(--gray-300);padding:6px;text-align:left}
        th{background:var(--green-200);color:var(--green-900)}
        .yes{font-weight:700;color:var(--green-700)}
        .no{font-weight:700;color:#b00020}
        .badge{display:inline-block;padding:2px 8px;border-radius:999px;font-size:11px;background:var(--green-100);border:1px solid var(--green-200);color:var(--green-700);font-weight:700}
        .footer{margin-top:18px;font-size:10px;opacity:.8;text-align:right}
        .calc-explainer{font-size:11px; opacity:.9; margin-top:6px}
        .none{color:#555; font-style:italic}
      </style>
    `);
    // =======================================
    w.document.write('</head><body>');
    w.document.write(printRef.current.innerHTML);
    w.document.close();
    w.print();
  };

  const totalDiasUteis = allBusinessDates.length;
  if (totalDiasUteis === 0) {
    return (
      <Button disabled variant="outline" className="w-full">
        <Download className="h-4 w-4 mr-2" />
        Exportar Relatório (Sem Dias Úteis)
      </Button>
    );
  }

  const totalUbs = Object.keys(summary).length;
  const agoraBR = new Date().toLocaleString('pt-BR', { timeZone: 'America/Fortaleza' });

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
                <b>{formatDate(startDate)}</b> a <b>{formatDate(endDate)}</b>
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
        {Object.values(summary).map((u, idx) => {
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

              {/* Apenas porcentagem + explicação do cálculo (sem barra) */}
              <div className="calc-explainer">
                <b>Percentual de conclusão:</b> {pct}% — {u.daysCompleted} de {u.totalDays} dia(s) com
                atualização <i>manhã</i> <u>e</u> <i>tarde</i>.<br />
                <small>
                  <b>Fórmula:</b> (dias completos ÷ dias úteis) × 100,
                  onde “dia completo” = marcou manhã <u>e</u> tarde no mesmo dia.
                </small>
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
                      const noActivity = !d?.manha && !d?.tarde; // nenhum turno marcado

                      if (noActivity) {
                        return (
                          <tr key={date}>
                            <td>{formatDate(date)}</td>
                            <td className="none" colSpan={3}>
                              Não foi registrada nenhuma atividade neste dia.
                            </td>
                          </tr>
                        );
                      }

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
