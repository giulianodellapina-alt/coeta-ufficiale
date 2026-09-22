import { format } from 'date-fns';
import { it } from 'date-fns/locale';

export const holidays = [
  { date: '2026-01-01', name: 'Capodanno' },
  { date: '2026-01-06', name: 'Epifania' },
  { date: '2026-04-05', name: 'Pasqua' },
  { date: '2026-04-06', name: 'Lunedì dell\'Angelo' },
  { date: '2026-04-25', name: 'Liberazione' },
  { date: '2026-05-01', name: 'Festa del Lavoro' },
  { date: '2026-06-02', name: 'Festa della Repubblica' },
  { date: '2026-08-15', name: 'Ferragosto' },
  { date: '2026-11-01', name: 'Ognissanti' },
  { date: '2026-12-08', name: 'Immacolata Concezione' },
  { date: '2026-12-25', name: 'Natale' },
  { date: '2026-12-26', name: 'Santo Stefano' },
];

export const isHoliday = (date: Date) => {
  const dateStr = format(date, 'yyyy-MM-dd');
  return holidays.find(h => h.date === dateStr);
};

export const formatItalianDate = (date: Date, pattern: string) => {
  return format(date, pattern, { locale: it });
};

export function formatDateIT(dateStr?: any): string {
  if (dateStr === null || dateStr === undefined) return "---";
  const str = String(dateStr).trim();
  if (str === "" || str === "---" || str === "undefined" || str === "null") return "---";

  // If numeric timestamp (e.g. 1722600000000 or 1722600000)
  if (/^\d{9,13}$/.test(str)) {
    const num = Number(str);
    if (!isNaN(num)) {
      const d = new Date(num < 10000000000 ? num * 1000 : num);
      if (!isNaN(d.getTime())) {
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const yyyy = d.getFullYear();
        return `${dd}/${mm}/${yyyy}`;
      }
    }
  }

  // ISO format YYYY-MM-DD or YYYY/MM/DD (supporting 4+ digits year like 12000-10-10 -> 10/10/2000)
  const isoMatch = str.match(/^(\d{4,6})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
  if (isoMatch) {
    const [, yyyyRaw, mmRaw, ddRaw] = isoMatch;
    const yyyy = yyyyRaw.length > 4 ? yyyyRaw.slice(-4) : yyyyRaw;
    const mm = mmRaw.padStart(2, '0');
    const dd = ddRaw.padStart(2, '0');
    return `${dd}/${mm}/${yyyy}`;
  }

  // Italian format DD/MM/YYYY or DD-MM-YYYY (supporting 4+ digits year)
  const dmyMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4,6})/);
  if (dmyMatch) {
    const [, ddRaw, mmRaw, yyyyRaw] = dmyMatch;
    const yyyy = yyyyRaw.length > 4 ? yyyyRaw.slice(-4) : yyyyRaw;
    const mm = mmRaw.padStart(2, '0');
    const dd = ddRaw.padStart(2, '0');
    return `${dd}/${mm}/${yyyy}`;
  }

  // DD/MM/YY or DD-MM-YY
  const dmyShortMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2})$/);
  if (dmyShortMatch) {
    const [, ddRaw, mmRaw, yyRaw] = dmyShortMatch;
    const yearNum = Number(yyRaw);
    const yyyy = yearNum > 30 ? `19${yyRaw}` : `20${yyRaw}`;
    const mm = mmRaw.padStart(2, '0');
    const dd = ddRaw.padStart(2, '0');
    return `${dd}/${mm}/${yyyy}`;
  }

  // General Date parse attempt
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    const year = parsed.getFullYear();
    const validYear = year > 2100 ? String(year).slice(-4) : String(year);
    if (Number(validYear) > 1900) {
      const dd = String(parsed.getDate()).padStart(2, '0');
      const mm = String(parsed.getMonth() + 1).padStart(2, '0');
      return `${dd}/${mm}/${validYear}`;
    }
  }

  return str;
}

export function formatDateToISO(dateStr?: any): string {
  if (dateStr === null || dateStr === undefined) return "";
  const str = String(dateStr).trim();
  if (str === "" || str === "---" || str === "undefined" || str === "null") return "";

  // If numeric timestamp
  if (/^\d{9,13}$/.test(str)) {
    const num = Number(str);
    if (!isNaN(num)) {
      const d = new Date(num < 10000000000 ? num * 1000 : num);
      if (!isNaN(d.getTime())) {
        return d.toISOString().split("T")[0];
      }
    }
  }

  // YYYY-MM-DD or YYYY/MM/DD (supporting 4+ digits year like 12000-10-10 -> 2000-10-10)
  const isoMatch = str.match(/^(\d{4,6})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
  if (isoMatch) {
    const [, yyyyRaw, mmRaw, ddRaw] = isoMatch;
    const yyyy = yyyyRaw.length > 4 ? yyyyRaw.slice(-4) : yyyyRaw;
    const mm = mmRaw.padStart(2, '0');
    const dd = ddRaw.padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  // DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4,6})/);
  if (dmyMatch) {
    const [, ddRaw, mmRaw, yyyyRaw] = dmyMatch;
    const yyyy = yyyyRaw.length > 4 ? yyyyRaw.slice(-4) : yyyyRaw;
    const mm = mmRaw.padStart(2, '0');
    const dd = ddRaw.padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  return str;
}
