/**
 * Leitura direta de abas do Google Sheets (sem API key), no mesmo modelo do
 * projeto dashboard_totvs (api/demandas.js + api/parse-sheet.js):
 * baixa o CSV público via endpoint gviz, detecta bloqueio de login e
 * normaliza as linhas para o formato da rotina de transações.
 */

export const DEFAULT_SPREADSHEET_ID = '1bN0B4UOmIKykmFs7Rv2x2OWX9qzdYQ5EGQPXtY08WSc';
export const MAX_CSV_CHARS = 2_000_000;

export type TypeMode = 'column' | 'signal' | 'fixed-income' | 'fixed-expense';

export interface SheetColumnMapping {
  date?: string;
  day?: string;
  description?: string;
  amount?: string;
  amountExpense?: string;
  amountIncome?: string;
  type?: string;
  category?: string;
  status?: string;
  typeMode?: TypeMode;
}

export interface NormalizedSheetRow {
  rowIndex: number;
  date: string; // ISO yyyy-mm-dd ('' se inválida)
  description: string;
  type: 'income' | 'expense' | '';
  amount: number | null;
  category: string;
  status: string;
}

export interface SheetRowIssue {
  rowIndex: number;
  field: string;
  message: string;
  level?: 'error' | 'warning';
}

export interface SheetTabPreview {
  tab: string;
  headers: string[];
  totalRows: number;
  validRows: number;
  totalIncome: number;
  totalExpense: number;
  rows: NormalizedSheetRow[];
  issues: SheetRowIssue[];
}

export function sheetCsvUrl(spreadsheetId: string, tab: string): string {
  const id = encodeURIComponent(spreadsheetId);
  const sheet = encodeURIComponent(tab);
  return `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv&sheet=${sheet}`;
}

export function isValidSpreadsheetId(id: string): boolean {
  return /^[a-zA-Z0-9_-]+$/.test(id);
}

/** Baixa o CSV de uma aba. Lança erro com mensagem amigável se exigir login. */
export async function fetchSheetCsv(spreadsheetId: string, tab: string): Promise<string> {
  if (!isValidSpreadsheetId(spreadsheetId)) {
    throw new Error('GOOGLE_SHEETS_ID inválido.');
  }
  if (!tab || !tab.trim()) {
    throw new Error('Aba (tab) vazia.');
  }
  const response = await fetch(sheetCsvUrl(spreadsheetId, tab), {
    redirect: 'follow',
    headers: { 'User-Agent': 'finance-backend' },
  });
  const text = await response.text();
  const trimmed = text.trim();
  const bloqueada =
    trimmed.startsWith('<') || /accounts\.google\.com|ServiceLogin/i.test(trimmed.slice(0, 800));

  if (!response.ok || !trimmed || bloqueada || text.length > MAX_CSV_CHARS) {
    throw new Error(
      'Planilha indisponível sem login. Compartilhe como qualquer pessoa com o link (Leitor).',
    );
  }
  return text;
}

/** Parser CSV com suporte a aspas (formato do gviz: vírgula como separador). */
export function parseCsv(text: string): string[][] {
  const src = String(text).replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < src.length; i++) {
    const char = src[i];
    if (inQuotes) {
      if (char === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }
    if (char === '"') {
      inQuotes = true;
      continue;
    }
    if (char === ',') {
      row.push(field);
      field = '';
      continue;
    }
    if (char === '\n') {
      row.push(field);
      field = '';
      if (row.some((cell) => cell.trim() !== '')) rows.push(row);
      row = [];
      continue;
    }
    field += char;
  }

  if (field.length || row.length) {
    row.push(field);
    if (row.some((cell) => cell.trim() !== '')) rows.push(row);
  }

  return rows;
}

export function normalizeHeader(header: string): string {
  return String(header)
    .trim()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

interface HeaderRule {
  field: 'date' | 'day' | 'description' | 'amount' | 'amountExpense' | 'amountIncome' | 'type' | 'category' | 'status';
  test: (h: string) => boolean;
}

const HEADER_RULES: HeaderRule[] = [
  { field: 'date', test: (h) => ['data', 'dt', 'vencimento', 'pagamento', 'competencia'].includes(h) },
  { field: 'day', test: (h) => h === 'dia' },
  {
    field: 'description',
    test: (h) => ['descricao', 'historico', 'detalhe', 'lancamento', 'nome'].includes(h) || h.includes('descricao da despesa'),
  },
  { field: 'amount', test: (h) => ['valor', 'total', 'amount', 'quantia'].includes(h) },
  {
    field: 'amountExpense',
    test: (h) => h.includes('vlr despesa') || h.includes('valor despesa') || h === 'despesa',
  },
  {
    field: 'amountIncome',
    test: (h) => h.includes('vlr receita') || h.includes('valor receita') || h === 'receita',
  },
  { field: 'type', test: (h) => ['tipo', 'operacao', 'natureza'].includes(h) },
  { field: 'category', test: (h) => ['categoria', 'grupo', 'classe', 'origem'].includes(h) },
  { field: 'status', test: (h) => ['status', 'situacao'].includes(h) },
];

/** Mapeia cabeçalhos detectados -> campos, mesclando com overrides explícitos. */
export function mapHeaders(headers: string[], overrides: SheetColumnMapping = {}): Record<string, number> {
  const indexByField: Record<string, number> = {};
  headers.forEach((header, index) => {
    const normalized = normalizeHeader(header);
    for (const rule of HEADER_RULES) {
      if (indexByField[rule.field] === undefined && rule.test(normalized)) {
        indexByField[rule.field] = index;
        break;
      }
    }
  });
  (['date', 'day', 'description', 'amount', 'amountExpense', 'amountIncome', 'type', 'category', 'status'] as const).forEach((field) => {
    const wanted = overrides[field];
    if (wanted) {
      const found = headers.findIndex((h) => normalizeHeader(h) === normalizeHeader(wanted));
      if (found >= 0) indexByField[field] = found;
    }
  });
  return indexByField;
}

export function parseAmount(raw: string): number | null {
  if (!raw) return null;
  let s = raw.trim().replace(/[R$\s]/g, '');
  const neg = /^\(.*\)$/.test(s) || s.startsWith('-');
  s = s.replace(/[()]/g, '').replace(/^-/, '');
  if (s.includes(',') && s.includes('.')) {
    s = s.replace(/\./g, '').replace(',', '.'); // pt-BR: 1.234,56
  } else if (s.includes(',')) {
    s = s.replace(',', '.');
  }
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return neg ? -Math.abs(n) : n;
}

export function parseDateToISO(raw: string): string {
  if (!raw) return '';
  const s = raw.trim().slice(0, 10);
  let m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return s;
  m = s.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  return '';
}

function typeFromText(raw: string): 'income' | 'expense' | '' {
  const t = normalizeHeader(raw);
  if (!t) return '';
  if (/(receit|entrada|credito|recebido)/.test(t)) return 'income';
  if (/(despesa|saida|debito|pagamento|pago)/.test(t)) return 'expense';
  return '';
}

/** Extrai {mm, yyyy} de nomes de aba como "01-2026" ou "01/2026". */
export function tabPeriod(tab: string): { mm: string; yyyy: string } | null {
  const m = tab.trim().match(/^(\d{2})[-\/](\d{4})$/);
  return m ? { mm: m[1], yyyy: m[2] } : null;
}

/** Linhas de totalização mensal (ex.: "TOTAIS DO MÊS") não migram. */
export function isSummaryRow(description: string): boolean {
  return /totais?\s+do\s+m[eê]s/i.test(description || '');
}

/** Saldo de abertura ("Saldo Anterior") não é transação — não migra. */
export function isOpeningBalanceRow(description: string): boolean {
  return /saldo\s+anterior/i.test((description || '').trim());
}

/** Normaliza as linhas de uma aba para o formato da rotina de transações. */
export function normalizeSheetTab(
  tab: string,
  matrix: string[][],
  mapping: SheetColumnMapping = {},
): SheetTabPreview {
  const empty: SheetTabPreview = {
    tab,
    headers: [],
    totalRows: 0,
    validRows: 0,
    totalIncome: 0,
    totalExpense: 0,
    rows: [],
    issues: [],
  };
  if (matrix.length === 0) return empty;

  const headers = matrix[0].map((h) => (h || '').trim());
  const typeMode: TypeMode = mapping.typeMode || 'signal';
  const period = tabPeriod(tab);
  const idx = mapHeaders(headers, mapping);
  const cell = (row: string[], i: number | undefined): string =>
    i === undefined || i >= row.length ? '' : (row[i] || '').trim();

  const rows: NormalizedSheetRow[] = [];
  const issues: SheetRowIssue[] = [];
  let totalIncome = 0;
  let totalExpense = 0;
  let validRows = 0;
  let dataRow = 0;

  for (let r = 1; r < matrix.length; r++) {
    const record = matrix[r];
    if (record.every((c) => !(c || '').trim())) continue;
    const description = cell(record, idx.description);
    if (isSummaryRow(description)) continue;
    if (isOpeningBalanceRow(description)) continue;
    // Eco de saldo / linha sem conteúdo transacional (ex.: só SALDO repetido).
    const amountRawEarly = cell(record, idx.amount);
    const expenseRawEarly = cell(record, idx.amountExpense);
    const incomeRawEarly = cell(record, idx.amountIncome);
    if (!description && !amountRawEarly && !expenseRawEarly && !incomeRawEarly) continue;
    dataRow++;

    // Valor: coluna única ou par despesa/receita (qual coluna preenchida define o tipo).
    const amountRaw = amountRawEarly;
    const expenseRaw = expenseRawEarly;
    const incomeRaw = incomeRawEarly;
    let amount = parseAmount(amountRaw);
    let pairType: NormalizedSheetRow['type'] = '';
    if (amount === null && (idx.amountExpense !== undefined || idx.amountIncome !== undefined)) {
      const expense = parseAmount(expenseRaw);
      const income = parseAmount(incomeRaw);
      if (expense !== null && expense !== 0) {
        amount = Math.abs(expense);
        pairType = 'expense';
      } else if (income !== null && income !== 0) {
        amount = Math.abs(income);
        pairType = 'income';
      } else if (expense !== null || income !== null) {
        amount = 0;
      }
    }

    // Data: coluna de data ou DIA + competência da aba (MM/YYYY).
    const dateCell = cell(record, idx.date);
    let date = parseDateToISO(dateCell);
    let dateWarning = '';
    if (!date && period) {
      const dayRaw = cell(record, idx.day);
      const day = parseInt(dayRaw, 10);
      if (dayRaw && Number.isFinite(day) && day >= 1 && day <= 31) {
        date = `${period.yyyy}-${period.mm}-${String(day).padStart(2, '0')}`;
      } else {
        date = `${period.yyyy}-${period.mm}-01`;
        dateWarning =
          dayRaw || dateCell
            ? `Data "${dayRaw || dateCell}" inválida, assumido dia 01 (${period.mm}/${period.yyyy})`
            : `Dia ausente, assumido dia 01 (${period.mm}/${period.yyyy})`;
      }
    }

    let type: NormalizedSheetRow['type'] = pairType;
    if (!type) {
      if (typeMode === 'fixed-income') type = 'income';
      else if (typeMode === 'fixed-expense') type = 'expense';
      else if (typeMode === 'signal' && amount !== null) type = amount < 0 ? 'expense' : 'income';
      else type = typeFromText(cell(record, idx.type));
    }

    const row: NormalizedSheetRow = {
      rowIndex: dataRow,
      date,
      description,
      type,
      amount,
      category: cell(record, idx.category),
      status: cell(record, idx.status),
    };
    rows.push(row);

    let ok = true;
    if (!date) {
      issues.push({ rowIndex: dataRow, field: 'date', message: 'Data ausente ou inválida' });
      ok = false;
    } else if (dateWarning) {
      issues.push({
        rowIndex: dataRow,
        field: 'date',
        message: dateWarning,
        level: 'warning',
      });
    }
    if (amount === null) {
      issues.push({
        rowIndex: dataRow,
        field: 'amount',
        message: `Valor inválido: "${amountRaw || expenseRaw || incomeRaw}"`,
      });
      ok = false;
    }
    if (!type) {
      issues.push({ rowIndex: dataRow, field: 'type', message: 'Tipo não identificado' });
      ok = false;
    }
    if (ok && amount !== null) {
      validRows++;
      if (type === 'income') totalIncome += Math.abs(amount);
      else totalExpense += Math.abs(amount);
    }
  }

  return { tab, headers, totalRows: dataRow, validRows, totalIncome, totalExpense, rows, issues };
}
