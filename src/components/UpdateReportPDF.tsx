import React from 'react';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { format, getDay, isBefore, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { UBS, User } from '@/types';
import type { UpdateCheckHistory } from '@/lib/storage';

interface UpdateReportPDFProps {
  history: UpdateCheckHistory[];
  ubsList: UBS[];
  usersList: User[];
  startDate: Date;
  endDate: Date;
  /** Paisagem (true) ou retrato (false). */
  landscape?: boolean;
  /** Título da instituição. */
  orgTitle?: string;
  /** Subtítulo da instituição. */
  orgSubtitle?: string;
  /** Marca d'água confidencial. */
  confidentialWatermark?: boolean;
}

// ===== Utilitários de data =====
const timeZone = 'America/Fortaleza';
const formatBR = (d: Date | string) => format(new Date(d), 'dd/MM/yyyy', { locale: ptBR });
const formatDateTimeBR = (d = new Date()) => new Intl.DateTimeFormat('pt-BR', {
  timeZone,
  day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
}).format(d);

// ===== Dias úteis entre dois limites (inclui as pontas) =====
const getBusinessDaysInRange = (start: Date, end: Date): string[] => {
  const dates: string[] = [];
  let currentDate = startOfDay(start);
  const endDate = startOfDay(end);
  while (isBefore(currentDate, endDate) || currentDate.getTime() === endDate.getTime()) {
    const dow = getDay(currentDate); // 0=dom...6=sab
    if (dow >= 1 && dow <= 5) dates.push(format(currentDate, 'yyyy-MM-dd'));
    currentDate = new Date(currentDate.getTime() + 24 * 60 * 60 * 1000);
  }
  return dates;
};

// ===== Resumo por UBS =====
function summarizeHistory(
  history: UpdateCheckHistory[],
  ubsList: UBS[],
  usersList: User[],
  startDate: Date,
  endDate: Date
) {
  const summary: Record<string, {
    ubsId: string;
    ubsName: string;
    responsavelNames: string;
    totalDays: number;
    updatedManha: number;
    updatedTarde: number;
    daysMissed: number;
    completionRate: number; // % de dias com manhã e tarde
    details: Record<string, { manha: boolean; tarde: boolean; user: string }>;
  }> = {};

  const allBusinessDates = getBusinessDaysInRange(startDate, endDate);

  // Inicializa
  ubsList.forEach((ubs) => {
    const responsaveis = usersList
      .filter((u) => (u as any).ubsVinculadas?.includes?.(ubs.id))
      .map((u) => (u as any).nome)
      .join(', ');

    summary[ubs.id] = {
      ubsId: ubs.id,
      ubsName: (ubs as any).nome || '',
      responsavelNames: responsaveis || 'N/A',
      totalDays: allBusinessDates.length,
      updatedManha: 0,
      updatedTarde: 0,
      daysMissed: 0,
      completionRate: 0,
      details: {},
    };
  });

  // Filtra apenas dias úteis do período
  const filtered = history.filter((h) => getBusinessDaysInRange(startDate, endDate).includes(h.data));

  filtered.forEach((check) => {
    const ubs = summary[check.ubs_id];
    if (!ubs) return;
    const dateKey = check.data;
    const user = usersList.find((u) => u.id === check.user_id)?.nome || 'Desconhecido';

    if (!ubs.details[dateKey]) {
      ubs.details[dateKey] = { manha: false, tarde: false, user: '' };
    }
    if (check.manha) ubs.details[dateKey].manha = true;
    if (check.tarde) ubs.details[dateKey].tarde = true;
    ubs.details[dateKey].user = user;
  });

  Object.values(summary).forEach((ubs) => {
    let daysCompleted = 0;
    getBusinessDaysInRange(startDate, endDate).forEach((d) => {
      const det = ubs.details[d];
      if (det) {
        if (det.manha) ubs.updatedManha += 1;
        if (det.tarde) ubs.updatedTarde += 1;
        if (det.manha && det.tarde) daysCompleted += 1;
      }
    });
    ubs.daysMissed = ubs.totalDays - daysCompleted;
    ubs.completionRate = ubs.totalDays > 0 ? Math.round((daysCompleted / ubs.totalDays) * 100) : 0;
  });

  return { summary, allBusinessDates };
}

// ===== HTML seguro =====
const esc = (s: any) => String(s ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');

// ===== Constrói o HTML completo do relatório =====
function buildReportHTML(params: {
  title: string;
  orgTitle: string;
  orgSubtitle?: string;
  landscape: boolean;
  confidential: boolean;
  startDate: Date;
  endDate: Date;
  summaryList: ReturnType<typeof summarizeHistory>['summary'];
  allBusinessDates: string[];
}) {
  const {
    title, orgTitle, orgSubtitle, landscape, confidential,
    startDate, endDate, summaryList, allBusinessDates
  } = params;

  const orientation = landscape ? 'landscape' : 'portrait';

  // Agregados gerais
  const list = Object.values(summaryList);
  const totalUBS = list.length;
  const totalDias = allBusinessDates.length;
  const totalManha = list.reduce((a, b) => a + b.updatedManha, 0);
  const totalTarde = list.reduce((a, b) => a + b.updatedTarde, 0);
  const médiaConclusão = list.length
    ? Math.round(list.reduce((a, b) => a + b.completionRate, 0) / list.length)
    : 0;

  const perUBS = list.map((u) => `
    <section class="card section">
      <div class="card-header">
        <h3>${esc(u.ubsName)}</h3>
        <div class="kpis">
          <div><span class="k">Dias úteis</span><span class="v">${u.totalDays}</span></div>
          <div><span class="k">Manhã</span><span class="v">${u.updatedManha}/${u.totalDays}</span></div>
          <div><span class="k">Tarde</span><span class="v">${u.updatedTarde}/${u.totalDays}</span></div>
          <div><span class="k">Completude</span><span class="v">${u.completionRate}%</span></div>
          <div><span class="k">Dias perdidos</span><span class="v ${u.daysMissed > 0 ? 'neg' : ''}">${u.daysMissed}</span></div>
        </div>
      </div>
      <div class="resp">Responsável(is): <b>${esc(u.responsavelNames)}</b></div>
      <table aria-label="Detalhes ${esc(u.ubsName)}">
        <thead>
          <tr>
            <th>Data</th>
            <th>Manhã</th>
            <th>Tarde</th>
            <th>Responsável (último check)</th>
          </tr>
        </thead>
        <tbody>
          ${allBusinessDates.map((d) => {
            const det = u.details[d];
            const m = det?.manha ? 'Sim' : 'Não';
            const t = det?.tarde ? 'Sim' : 'Não';
            return `
              <tr>
                <td>${esc(formatBR(d))}</td>
                <td class="${det?.manha ? 'ok' : ''}">${m}</td>
                <td class="${det?.tarde ? 'ok' : ''}">${t}</td>
                <td>${esc(det?.user || 'N/A')}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </section>
  `).join('');

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>${esc(title)}</title>
  <style>
    :root { --ink:#1f2937; --muted:#6b7280; --line:#e5e7eb; --ok:#111827; }
    *{ box-sizing:border-box; }
    html,body{ height:100%; }
    body{ margin:0; color:var(--ink); font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; }

    @page { size: A4 ${orientation}; margin: 16mm; }

    .watermark{ position:fixed; inset:0; display:grid; place-items:center; pointer-events:none; }
    .watermark span{ font-size:120px; font-weight:800; color:rgba(0,0,0,.05); transform:rotate(-24deg); letter-spacing:8px; }

    header{ display:flex; align-items:center; gap:14px; }
    .logo{ width:56px; height:56px; border-radius:12px; border:1px solid var(--line); display:grid; place-items:center; font-weight:800; }
    .hgroup h1{ margin:0; font-size:20px; }
    .hgroup p{ margin:2px 0 0; color:var(--muted); font-size:12px; }

    .report-title{ margin:14px 0 0; font-size:22px; border-bottom:2px solid #c7c7c7; padding-bottom:6px; }
    .meta{ display:flex; gap:12px; margin-top:8px; color:var(--muted); font-size:12px; }

    .summary{ display:flex; flex-wrap:wrap; gap:10px; margin-top:12px; }
    .kpi{ border:1px solid var(--line); border-radius:10px; padding:10px 12px; min-width:140px; }
    .kpi .k{ font-size:11px; color:var(--muted); }
    .kpi .v{ font-size:16px; font-weight:700; margin-top:2px; }

    table{ width:100%; border-collapse:collapse; margin-top:10px; table-layout:fixed; }
    thead{ display:table-header-group; }
    th,td{ border:1px solid var(--line); padding:8px; font-size:12px; vertical-align:top; }
    th{ background:#f8f9fb; text-align:left; }
    tbody tr:nth-child(even){ background:#fbfbfb; }
    td.ok{ font-weight:700; }
    .neg{ font-weight:700; }

    .card{ border:1px solid var(--line); border-radius:12px; padding:12px; margin-top:14px; }
    .card-header{ display:flex; justify-content:space-between; align-items:flex-end; gap:10px; }
    .card-header h3{ margin:0; font-size:16px; }
    .kpis{ display:flex; gap:10px; }
    .kpis .k{ color:var(--muted); font-size:11px; display:block; }
    .kpis .v{ font-weight:700; font-size:13px; }
    .resp{ margin-top:6px; font-size:12px; }

    .footer{ position:fixed; left:0; right:0; bottom:0; font-size:10px; color:var(--muted); display:flex; justify-content:space-between; }

    .section{ page-break-inside:avoid; }
    tr{ page-break-inside:avoid; }
  </style>
</head>
<body>
  ${confidential ? '<div class="watermark"><span>CONFIDENCIAL</span></div>' : ''}

  <header>
    <div class="logo">PM</div>
    <div class="hgroup">
      <h1>${esc(orgTitle)}</h1>
      ${orgSubtitle ? `<p>${esc(orgSubtitle)}</p>` : ''}
    </div>
  </header>

  <h2 class="report-title">${esc(title)}</h2>
  <div class="meta">
    <div>Período: <b>${esc(formatBR(startDate))}</b> a <b>${esc(formatBR(endDate))}</b> (dias úteis)</div>
    <div>Gerado em: ${esc(formatDateTimeBR())}</div>
  </div>

  <section class="summary">
    <div class="kpi"><span class="k">UBS</span><span class="v">${totalUBS}</span></div>
    <div class="kpi"><span class="k">Dias úteis no período</span><span class="v">${totalDias}</span></div>
    <div class="kpi"><span class="k">Registros manhã</span><span class="v">${totalManha}</span></div>
    <div class="kpi"><span class="k">Registros tarde</span><span class="v">${totalTarde}</span></div>
    <div class="kpi"><span class="k">Completude média</span><span class="v">${médiaConclusão}%</span></div>
  </section>

  ${perUBS}

  <footer class="footer">
    <div>${esc(orgSubtitle || '')}</div>
    <div>${esc(formatDateTimeBR())}</div>
  </footer>

  <script>window.addEventListener('load', () => setTimeout(() => window.print(), 50));</script>
</body>
</html>`;
}

// ===== Componente principal =====
const UpdateReportPDF: React.FC<UpdateReportPDFProps> = ({
  history,
  ubsList,
  usersList,
  startDate,
  endDate,
  landscape = true,
  orgTitle = 'Prefeitura Municipal',
  orgSubtitle = 'Secretaria de Saúde e Saneamento',
  confidentialWatermark = false,
}) => {
  const { summary, allBusinessDates } = summarizeHistory(history, ubsList, usersList, startDate, endDate);

  const handlePrint = () => {
    if (allBusinessDates.length === 0) return;
    const html = buildReportHTML({
      title: 'Relatório de Atualizações de UBS',
      orgTitle,
      orgSubtitle,
      landscape,
      confidential: confidentialWatermark,
      startDate,
      endDate,
      summaryList: summary,
      allBusinessDates,
    });

    const win = window.open('', '', 'height=800,width=1100');
    if (!win) return;
    win.document.open();
    win.document.write(html);
    win.document.close();
  };

  const disabled = allBusinessDates.length === 0;

  return (
    <Button onClick={handlePrint} disabled={disabled} className="w-full">
      <Download className="h-4 w-4 mr-2" />
      {disabled ? 'Exportar Relatório (Sem dias úteis)' : 'Exportar Relatório PDF'}
    </Button>
  );
};

export default UpdateReportPDF;
