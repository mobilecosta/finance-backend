import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import swaggerUi from 'swagger-ui-express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import financeRoutes from '../src/routes/finance.js';
import authRoutes from '../src/routes/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const { PrismaClient } = await import('@prisma/client') as any;
const prisma = new PrismaClient();

// Migrations are handled during the build step in package.json
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Swagger Documentation
try {
  const swaggerPath = path.resolve(process.cwd(), 'src', 'swagger.json');
  const swaggerPathDist = path.resolve(process.cwd(), 'dist', 'swagger.json');
  
  let swaggerDocument;
  if (fs.existsSync(swaggerPath)) {
    swaggerDocument = JSON.parse(fs.readFileSync(swaggerPath, 'utf8'));
  } else if (fs.existsSync(swaggerPathDist)) {
    swaggerDocument = JSON.parse(fs.readFileSync(swaggerPathDist, 'utf8'));
  }

  if (swaggerDocument) {
    const CSS_URL = "https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.0.0/swagger-ui.min.css";
    const JS_URLS = [
      "https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.0.0/swagger-ui-bundle.js",
      "https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.0.0/swagger-ui-standalone-preset.js"
    ];

    app.use('/docs', swaggerUi.serve);
    app.get('/docs', (req, res) => {
      res.send(
        swaggerUi.generateHTML(swaggerDocument, {
          customCssUrl: CSS_URL,
          customJs: JS_URLS,
        })
      );
    });
  }
} catch (error) {
  console.error('Failed to load swagger.json', error);
}

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend is running' });
});

app.use('/api/auth', authRoutes);
app.use('/api/finance', financeRoutes);

app.get('/tests', async (req: any, res: any) => {
  try {
    const latestTest = await (prisma as any).test.findFirst({
      orderBy: { createdAt: 'desc' },
    });

    if (latestTest) {
      res.setHeader('Content-Type', 'text/html');
      return res.send(latestTest.reportHtml);
    }
    
    const reportPath = path.resolve(process.cwd(), 'coverage', 'report.html');
    if (fs.existsSync(reportPath)) {
      return res.sendFile(reportPath);
    }
    
    res.status(404).send('Relatório de testes não encontrado no banco ou localmente.');
  } catch (error) {
    console.error('Erro ao buscar relatório de testes:', error);
    res.status(500).send('Erro interno ao buscar relatório.');
  }
});

app.get('/tests/pdf', async (req, res) => {
  try {
    const latestTest = await (prisma as any).test.findFirst({
      orderBy: { createdAt: 'desc' },
    });

    if (latestTest && latestTest.reportPdf) {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename=report.pdf');
      return res.send(latestTest.reportPdf);
    }
    res.status(404).send('PDF não encontrado.');
  } catch (error) {
    console.error('Erro na rota /tests/pdf:', error);
    res.status(500).send('Erro interno ao processar o PDF.');
  }
});

app.get('/coverage', async (req, res) => {
  try {
    const latestTest = await (prisma as any).test.findFirst({
      orderBy: { createdAt: 'desc' },
    });
    if (latestTest) {
      res.setHeader('Content-Type', 'text/html');
      return res.send(latestTest.reportHtml);
    }
  } catch (e) {}
  res.sendFile(path.resolve(process.cwd(), 'coverage', 'lcov-report', 'index.html'));
});

app.use('/coverage', express.static(path.resolve(process.cwd(), 'coverage', 'lcov-report')));

app.get('/reports', (req, res) => res.redirect('/tests'));

app.get('/', (req, res) => {
  res.json({ 
    message: 'Finance Pro API', 
    docs: '/docs', 
    coverage: '/coverage',
    reports: '/reports',
    tests: '/tests',
    tests_pdf: '/tests/pdf',
    health: '/health' 
  });
});

export default app;

if (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test') {
  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
}
