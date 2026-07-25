import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { getPrisma } from '../lib/prisma.js';
import { parsePagination, paginatedResponse } from '../lib/pagination.js';

type Res = {
  status(code: number): Res;
  json(body: any): void;
  setHeader(name: string, value: string): void;
  send(body: any): void;
};

type Req = {
  query: any;
  params: any;
};

export class TestController {
  /**
   * Executa todos os testes, salva o relatório no banco e retorna o resultado.
   */
  async runAllTests(_req: Req, res: Res) {
    try {
      const cwd = process.cwd();
      const reportPath = path.resolve(cwd, 'coverage', 'report.html');

      if (fs.existsSync(reportPath)) fs.unlinkSync(reportPath);

      execSync('npm test', {
        cwd,
        stdio: 'pipe',
        timeout: 180000,
        env: { ...process.env, NODE_ENV: 'test', NODE_OPTIONS: '--experimental-vm-modules' },
      });

      const html = fs.existsSync(reportPath) ? fs.readFileSync(reportPath, 'utf-8') : null;

      if (html) {
        const prisma = await getPrisma();
        await prisma.test.create({ data: { reportHtml: html } });
      }

      const prisma = await getPrisma();
      const latest = await prisma.test.findFirst({ orderBy: { createdAt: 'desc' } });

      res.json({
        success: true,
        message: 'Testes executados com sucesso',
        testId: latest?.id ?? null,
      });
    } catch (error: any) {
      const stderr = error.stderr?.toString() || error.stdout?.toString() || error.message;
      console.error('Erro ao executar testes:', stderr);
      res.status(500).json({ success: false, error: 'Erro ao executar testes', details: stderr });
    }
  }

  /**
   * Lista todos os testes com paginação, incluindo ID e datas formatadas.
   */
  async getTests(req: Req, res: Res) {
    const { pageSize, skip } = parsePagination(req.query);
    try {
      const prisma = await getPrisma();
      const [tests, total] = await Promise.all([
        prisma.test.findMany({
          orderBy: { createdAt: 'desc' },
          skip,
          take: pageSize,
          select: {
            id: true,
            createdAt: true,
            updatedAt: true,
            reportHtml: true,
          }
        }),
        prisma.test.count(),
      ]);

      // Formatar as datas para o retorno
      const formattedTests = tests.map((test: any) => ({
        id: test.id,
        date: test.createdAt.toLocaleDateString('pt-BR'),
        time: test.createdAt.toLocaleTimeString('pt-BR'),
        reportHtml: test.reportHtml,
        createdAt: test.createdAt,
        updatedAt: test.updatedAt
      }));

      res.json(paginatedResponse(formattedTests, total, pageSize, skip));
    } catch (error) {
      console.error('Error fetching tests:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Retorna os detalhes de um teste específico, incluindo o relatório HTML.
   */
  async getTest(req: Req, res: Res) {
    const { id } = req.params;
    try {
      const prisma = await getPrisma();
      const test = await prisma.test.findUnique({
        where: { id: Number(id) }
      });

      if (!test) {
        return res.status(404).json({ error: 'Test not found' });
      }

      res.json({
        id: test.id,
        date: test.createdAt.toLocaleDateString('pt-BR'),
        time: test.createdAt.toLocaleTimeString('pt-BR'),
        reportHtml: test.reportHtml,
        createdAt: test.createdAt,
        updatedAt: test.updatedAt
      });
    } catch (error) {
      console.error('Error fetching test details:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Serve o relatório HTML diretamente para visualização no navegador.
   */
  async getTestHtml(req: Req, res: Res) {
    const { id } = req.params;
    try {
      const prisma = await getPrisma();
      const test = await prisma.test.findUnique({
        where: { id: Number(id) },
        select: { reportHtml: true }
      });

      if (!test || !test.reportHtml) {
        return res.status(404).json({ error: 'Report HTML not found' });
      }

      res.setHeader('Content-Type', 'text/html');
      res.send(test.reportHtml);
    } catch (error) {
      console.error('Error serving test HTML:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}
