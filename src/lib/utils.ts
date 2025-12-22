import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDateTime(timestamp: string | null | undefined): string | undefined {
  if (!timestamp) return undefined;
  
  try {
    const date = new Date(timestamp);
    
    if (isNaN(date.getTime())) return undefined;

    // Opções de formatação para exibir apenas a data (DD/MM/AAAA)
    const options: Intl.DateTimeFormatOptions = {
      timeZone: 'America/Sao_Paulo',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      // Hora e minuto removidos
    };

    // Usamos toLocaleString para obter a data formatada no fuso horário especificado
    const formatted = date.toLocaleString('pt-BR', options);

    // O formato esperado é "DD/MM/AAAA"
    return formatted.replace(',', ''); // Remove vírgulas se houver

  } catch (e) {
    console.error("Erro ao formatar data:", e);
    return undefined;
  }
}