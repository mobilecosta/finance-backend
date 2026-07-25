import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import swaggerUi from 'swagger-ui-express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import financeRoutes from './routes/finance.js';
import authRoutes from './routes/auth.js';
import acbrRoutes from './routes/acbr.js';
import acbrTestRoutes from './routes/acbr-tests.js';
import testRoutes from './routes/tests.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const { PrismaClient } = await import('@prisma/client') as any;
const prisma = new PrismaClient();

// Função para executar migrações do Prisma
async function runPrismaMigrations() {
  console.log('Executando migrações do Prisma...');
  try {
    execSync('npx prisma migrate deploy', { stdio: 'inherit' });
    console.log('Migrações do Prisma executadas com sucesso.');
  } catch (error) {
    console.error('Erro ao executar migrações do Prisma:', error);
  }
}

// Executar migrações antes de iniciar o servidor (pular em modo de teste)
if (process.env.NODE_ENV !== 'test') {
  runPrismaMigrations();
}
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
app.use('/api/acbr', acbrRoutes);
app.use('/api/acbr-tests', acbrTestRoutes);
app.use('/api/tests', testRoutes);

// Rotas legadas para compatibilidade
app.get('/tests', async (req, res) => {
  try {
    const latestTest = await prisma.test.findFirst({ orderBy: { createdAt: 'desc' } });
    if (latestTest) {
      res.setHeader('Content-Type', 'text/html');
      return res.send(latestTest.reportHtml);
    }
    const reportPath = path.resolve(process.cwd(), 'coverage', 'report.html');
    if (fs.existsSync(reportPath)) return res.sendFile(reportPath);
    res.status(404).send('Relatório não encontrado.');
  } catch (error) {
    res.status(500).send('Erro interno.');
  }
});

app.get('/tests/pdf', async (req, res) => {
  try {
    const latestTest = await prisma.test.findFirst({ orderBy: { createdAt: 'desc' } });
    if (latestTest && latestTest.reportPdf) {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename=report.pdf');
      return res.send(latestTest.reportPdf);
    }
    res.status(404).send('PDF não encontrado.');
  } catch (error) {
    res.status(500).send('Erro interno.');
  }
});

app.get('/coverage', (req, res) => res.redirect('/tests'));
app.use('/coverage-static', express.static(path.resolve(process.cwd(), 'coverage', 'lcov-report')));

app.get('/', (req, res) => {
  res.json({ 
    message: 'Finance Pro API', 
    docs: '/docs', 
    api_tests: '/api/tests',
    health: '/health' 
  });
});

export default app;

if (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test') {
  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
}
