import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
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
   * Executa todos os testes, salva o relatório no Storage e no banco.
   */
  async runAllTests(_req: Req, res: Res) {
    const tmpDir = '/tmp';
    const tmpCoverage = path.resolve(tmpDir, 'coverage');
    const reportPath = path.resolve(tmpCoverage, 'report.html');

    try {
      if (fs.existsSync(tmpCoverage)) fs.rmSync(tmpCoverage, { recursive: true });

      // Copy config to /tmp with output redirected to writable dir
      const cwd = process.cwd();
      const origConfig = path.resolve(cwd, 'jest.config.js');
      if (!fs.existsSync(origConfig)) {
        return res.status(500).json({ success: false, error: 'jest.config.js não encontrado' });
      }
      const jestBin = path.resolve(cwd, 'node_modules', 'jest', 'bin', 'jest.js');
      if (!fs.existsSync(jestBin)) {
        return res.status(500).json({ success: false, error: 'Jest não encontrado em node_modules' });
      }

      const tmpConfig = path.resolve(tmpDir, 'jest.config.mjs');
      let configContent = fs.readFileSync(origConfig, 'utf-8');
      configContent = configContent.replace(
        "publicPath: './coverage',",
        "publicPath: '/tmp/coverage',"
      );
      configContent = configContent.replace(
        "coverageDirectory: 'coverage',",
        "coverageDirectory: '/tmp/coverage',"
      );
      // Fix reporter rootDir path since config is in /tmp
      configContent = configContent.replace(
        '<rootDir>/src/lib/jestTestReporter.cjs',
        `'${cwd}/src/lib/jestTestReporter.cjs'`
      );
      fs.writeFileSync(tmpConfig, configContent, 'utf-8');

      execSync(`node --experimental-vm-modules "${jestBin}" --config "${tmpConfig}" --rootDir "${cwd}" --no-cache`, {
        cwd,
        stdio: 'pipe',
        timeout: 180000,
        env: { ...process.env, HOME: '/tmp', NODE_ENV: 'test' },
      });

      if (fs.existsSync(tmpConfig)) fs.unlinkSync(tmpConfig);

      const html = fs.existsSync(reportPath) ? fs.readFileSync(reportPath, 'utf-8') : null;

      if (!html) {
        return res.status(500).json({ success: false, error: 'Relatório HTML não foi gerado' });
      }

      // Upload to Supabase Storage bucket "coverage-reports"
      const supabaseUrl = process.env.SUPABASE_URL || '';
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_ANON_KEY || '';
      let storageUrl = '';
      if (supabaseUrl && supabaseKey) {
        const supabase = createClient(supabaseUrl, supabaseKey);
        const fileName = `report-${Date.now()}.html`;
        const { error: uploadError } = await supabase.storage
          .from('coverage-reports')
          .upload(fileName, html, { contentType: 'text/html', upsert: true });
        if (uploadError) {
          console.warn('Storage upload failed:', uploadError.message);
        } else {
          const { data: { publicUrl } } = supabase.storage.from('coverage-reports').getPublicUrl(fileName);
          storageUrl = publicUrl;
        }
      }

      // Save to tests table
      const prisma = await getPrisma();
      const test = await prisma.test.create({ data: { reportHtml: html } });

      // Cleanup tmp
      if (fs.existsSync(tmpCoverage)) fs.rmSync(tmpCoverage, { recursive: true });

      res.json({
        success: true,
        message: 'Testes executados com sucesso',
        testId: test.id,
        storageUrl: storageUrl || null,
      });
    } catch (error: any) {
      if (fs.existsSync('/tmp/coverage')) fs.rmSync('/tmp/coverage', { recursive: true, force: true });
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
