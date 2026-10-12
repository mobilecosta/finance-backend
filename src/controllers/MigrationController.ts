import {
  DEFAULT_SPREADSHEET_ID,
  fetchSheetCsv,
  normalizeSheetTab,
  parseCsv,
  type SheetColumnMapping,
  type TypeMode,
} from '../services/sheetReader.js';

type Res = {
  status(code: number): Res;
  json(body: any): void;
};

type Req = {
  body?: any;
  query: any;
  params: any;
  user?: any;
};

const TYPE_MODES: TypeMode[] = ['column', 'signal', 'fixed-income', 'fixed-expense'];

function pickString(value: any): string {
  return typeof value === 'string' ? value : '';
}

export class MigrationController {
  /**
   * GET /api/migration/sheet-preview?spreadsheetId=&tab=01/2026
   * Lê uma aba direto da API do Google (gviz CSV, sem API key) e devolve
   * a prévia normalizada no formato da rotina de transações.
   */
  async previewSheet(req: Req, res: Res) {
    const spreadsheetId = pickString(req.query.spreadsheetId).trim() || DEFAULT_SPREADSHEET_ID;
    const tab = pickString(req.query.tab).trim();
    const typeMode = pickString(req.query.typeMode).trim() as TypeMode;
    const limitRaw = Number(req.query.limit);

    if (!tab) {
      return res.status(400).json({ error: 'Parâmetro obrigatório: tab (ex.: 01/2026).' });
    }

    const mapping: SheetColumnMapping = {
      date: pickString(req.query.colDate).trim(),
      day: pickString(req.query.colDay).trim(),
      description: pickString(req.query.colDescription).trim(),
      amount: pickString(req.query.colAmount).trim(),
      amountExpense: pickString(req.query.colAmountExpense).trim(),
      amountIncome: pickString(req.query.colAmountIncome).trim(),
      type: pickString(req.query.colType).trim(),
      category: pickString(req.query.colCategory).trim(),
      status: pickString(req.query.colStatus).trim(),
      typeMode: TYPE_MODES.includes(typeMode) ? typeMode : 'signal',
    };

    try {
      const csv = await fetchSheetCsv(spreadsheetId, tab);
      const preview = normalizeSheetTab(tab, parseCsv(csv), mapping);

      const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(Math.trunc(limitRaw), 1), 1000) : 200;
      const rows = preview.rows.slice(0, limit);

      res.json({
        tab: preview.tab,
        spreadsheetId,
        headers: preview.headers,
        totalRows: preview.totalRows,
        validRows: preview.validRows,
        totalIncome: preview.totalIncome,
        totalExpense: preview.totalExpense,
        returnedRows: rows.length,
        rows,
        issues: preview.issues,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao ler a planilha.';
      const blocked = /sem login|inválido|vazia/i.test(message);
      res.status(blocked ? 502 : 500).json({ error: message, tab });
    }
  }
}
