import { runAndSaveAcbrTests, renderAcbrTestHtml, runAcbrTests } from '../services/acbrTestService.js';

type Res = {
  status(code: number): Res;
  json(body: any): void;
  setHeader(name: string, value: string): void;
  send(body: any): void;
};

export class AcbrTestController {
  async runTests(_req: any, res: Res) {
    try {
      const { result, html } = await runAndSaveAcbrTests();
      res.json({
        success: true,
        timestamp: new Date().toISOString(),
        summary: {
          total: result.total,
          passed: result.passed,
          failed: result.failed,
          suites: result.suites.map(s => ({ name: s.name, passed: s.passed, failed: s.failed, total: s.total })),
          durationMs: result.durationMs,
        },
        steps: result.steps.map(s => ({
          suite: s.suite,
          name: s.name,
          method: s.method,
          url: s.url,
          status: s.status,
          durationMs: s.durationMs,
          responseData: s.responseData,
          errorMessage: s.errorMessage,
          requestBody: s.requestBody,
        })),
        reportHtml: html,
      });
    } catch (error: any) {
      console.error('Erro ao executar testes ACBr:', error);
      res.status(500).json({ success: false, error: 'Erro ao executar testes ACBr', details: error.message });
    }
  }

  async getReportHtml(_req: any, res: Res) {
    try {
      const result = await runAcbrTests();
      const html = renderAcbrTestHtml(result);
      res.setHeader('Content-Type', 'text/html');
      res.send(html);
    } catch (error: any) {
      console.error('Erro ao gerar relatório ACBr:', error);
      res.status(500).send('Erro ao gerar relatório ACBr');
    }
  }
}