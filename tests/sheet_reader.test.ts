import {
  isOpeningBalanceRow,
  isSummaryRow,
  isValidSpreadsheetId,
  normalizeHeader,
  normalizeSheetTab,
  parseAmount,
  parseCsv,
  parseDateToISO,
  sheetCsvUrl,
  tabPeriod,
} from '../src/services/sheetReader';

describe('Sheet Reader (modelo dashboard_totvs)', () => {
  it('monta a URL gviz da aba', () => {
    expect(sheetCsvUrl('abc123', '01/2026')).toBe(
      'https://docs.google.com/spreadsheets/d/abc123/gviz/tq?tqx=out:csv&sheet=01%2F2026',
    );
  });

  it('valida o id da planilha', () => {
    expect(isValidSpreadsheetId('1bN0B4UOmIKykmFs7Rv2x2OWX9qzdYQ5EGQPXtY08WSc')).toBe(true);
    expect(isValidSpreadsheetId('!!!')).toBe(false);
    expect(isValidSpreadsheetId('')).toBe(false);
  });

  it('normaliza cabeçalhos com acento', () => {
    expect(normalizeHeader('Descrição')).toBe('descricao');
    expect(normalizeHeader('PRÓXIMA AÇÃO!')).toBe('proxima acao');
  });

  it('parseia CSV com aspas e linhas vazias', () => {
    const matrix = parseCsv('Data,Valor\r\n"05/01/2026","1.234,56"\r\n\r\n');
    expect(matrix).toEqual([
      ['Data', 'Valor'],
      ['05/01/2026', '1.234,56'],
    ]);
  });

  it('parseia valores pt-BR e negativos', () => {
    expect(parseAmount('1.234,56')).toBe(1234.56);
    expect(parseAmount('-2200,00')).toBe(-2200);
    expect(parseAmount('(100,00)')).toBe(-100);
    expect(parseAmount('abc')).toBeNull();
  });

  it('parseia datas para ISO', () => {
    expect(parseDateToISO('05/01/2026')).toBe('2026-01-05');
    expect(parseDateToISO('2026-01-05')).toBe('2026-01-05');
    expect(parseDateToISO('invalida')).toBe('');
  });

  it('normaliza aba com mapeamento automático', () => {
    const matrix = [
      ['Data', 'Descrição', 'Valor', 'Tipo', 'Categoria'],
      ['05/01/2026', 'Salário', '8500,00', 'Receita', 'Salário'],
      ['10/01/2026', 'Aluguel', '-2200,00', 'Despesa', 'Moradia'],
      ['xx', 'Sem data', '10,00', 'Receita', 'Outros'],
    ];
    const preview = normalizeSheetTab('01/2026', matrix, { typeMode: 'column' });
    expect(preview.totalRows).toBe(3);
    // 'xx' não é data válida: assume dia 01 da competência com warning, mantendo a linha
    expect(preview.validRows).toBe(3);
    expect(preview.totalIncome).toBe(8510);
    expect(preview.totalExpense).toBe(2200);
    expect(preview.rows[2]).toMatchObject({ date: '2026-01-01', type: 'income' });
    expect(preview.issues.some((i) => i.level === 'warning')).toBe(true);
  });

  it('usa o sinal do valor quando typeMode=signal', () => {
    const matrix = [
      ['Data', 'Descricao', 'Valor'],
      ['05/01/2026', 'Pix recebido', '500,00'],
      ['06/01/2026', 'Conta paga', '-120,00'],
    ];
    const preview = normalizeSheetTab('02/2026', matrix, { typeMode: 'signal' });
    expect(preview.rows[0].type).toBe('income');
    expect(preview.rows[1].type).toBe('expense');
    expect(preview.validRows).toBe(2);
  });

  it('extrai a competência do nome da aba (hífen ou barra)', () => {
    expect(tabPeriod('01/2026')).toEqual({ mm: '01', yyyy: '2026' });
    expect(tabPeriod('01-2026')).toEqual({ mm: '01', yyyy: '2026' });
    expect(tabPeriod('aba')).toBeNull();
  });

  it('identifica saldo anterior', () => {
    expect(isOpeningBalanceRow('Saldo Anterior')).toBe(true);
    expect(isOpeningBalanceRow('Aluguel')).toBe(false);
  });

  it('identifica linhas de totalização', () => {
    expect(isSummaryRow('TOTAIS DO MÊS')).toBe(true);
    expect(isSummaryRow('Totais do mes')).toBe(true);
    expect(isSummaryRow('Aluguel')).toBe(false);
  });

  it('normaliza o layout real (DIA + VLR DESPESA/RECEITA + TOTAIS)', () => {
    const matrix = [
      ['DIA', 'DESCRIÇÃO DA DESPESA OU RECEITA', 'VLR DESPESA', 'VLR RECEITA', 'SALDO', 'ORIGEM'],
      ['', '', '', '', '0,00', ''],
      ['05', 'Prestacao Casa', '440', '', '440,00', ''],
      ['', 'Salário', '', '8500,00', '', ''],
      ['', 'TOTAIS DO MÊS', '4.700,00', '0,00', '', '4.700,00'],
    ];
    const preview = normalizeSheetTab('01/2026', matrix, { typeMode: 'signal' });
    expect(preview.totalRows).toBe(2);
    expect(preview.validRows).toBe(2);
    expect(preview.rows[0]).toMatchObject({
      date: '2026-01-05',
      description: 'Prestacao Casa',
      type: 'expense',
      amount: 440,
    });
    expect(preview.rows[1]).toMatchObject({
      date: '2026-01-01',
      type: 'income',
      amount: 8500,
    });
    expect(preview.totalExpense).toBe(440);
    expect(preview.totalIncome).toBe(8500);
    expect(preview.issues.some((i) => i.level === 'warning')).toBe(true);
  });
});
