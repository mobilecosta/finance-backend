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
    // process.exit(1); // Não vamos encerrar o processo para permitir que o servidor tente rodar
  }
}

// Executar migrações antes de iniciar o servidor
runPrismaMigrations();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Swagger Documentation (Load JSON manually to avoid ESM import issues on Vercel)
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

// Servir relatórios de cobertura de testes.
// O `express.static` não usa `report.html` como arquivo padrão, por isso
// a rota raiz precisa enviar o relatório explicitamente.
// Rota para o relatório consolidado do Jest (vinda do banco de dados)
app.get('/tests', async (req, res) => {
  try {
    const latestTest = await prisma.test.findFirst({
      orderBy: { createdAt: 'desc' },
    });

    if (latestTest) {
      res.setHeader('Content-Type', 'text/html');
      return res.send(latestTest.reportHtml);
    }
    
    // Fallback para arquivo local
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
    const latestTest = await prisma.test.findFirst({
      orderBy: { createdAt: 'desc' },
    });

    if (latestTest && latestTest.reportPdf) {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename=report.pdf');
      return res.send(latestTest.reportPdf);
    }

    // Se não houver no banco, tenta gerar localmente
    const scriptPath = path.resolve(process.cwd(), 'scripts', 'generatePdf.ts');
    const pdfPath = path.resolve(process.cwd(), 'coverage', 'report.pdf');
    
    execSync(`npx tsx ${scriptPath}`, { stdio: 'inherit' });

    if (fs.existsSync(pdfPath)) {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename=report.pdf');
      return res.sendFile(pdfPath);
    }
    
    res.status(404).send('PDF não encontrado e falha ao gerar.');
  } catch (error) {
    console.error('Erro na rota /tests/pdf:', error);
    res.status(500).send('Erro interno ao processar o PDF.');
  }
});

async function saveCoverageToDb(reportHtml: string) {
  try {
    await prisma.test.create({
      data: { reportHtml },
    });
    console.log('Relatório salvo no banco de dados.');
  } catch (err) {
    console.error('Erro ao salvar relatório no banco:', err);
  }
}

// Rota para o relatório detalhado LCOV
app.get('/coverage', async (req, res) => {
  try {
    const latestTest = await prisma.test.findFirst({
      orderBy: { createdAt: 'desc' },
    });
    if (latestTest) {
      res.setHeader('Content-Type', 'text/html');
      return res.send(latestTest.reportHtml);
    }
  } catch (e) {}

  const lcovFile = path.resolve(process.cwd(), 'coverage', 'lcov-report', 'index.html');
  const reportFile = path.resolve(process.cwd(), 'coverage', 'report.html');

  const coverageFile = fs.existsSync(lcovFile) ? lcovFile : (fs.existsSync(reportFile) ? reportFile : null);
  if (!coverageFile) {
    return res.status(404).send('Nenhum relatório de cobertura encontrado.');
  }

  // Save to database so subsequent requests serve from DB
  const html = fs.readFileSync(coverageFile, 'utf8');
  saveCoverageToDb(html);

  res.sendFile(coverageFile);
});

app.post('/coverage', async (req, res) => {
  try {
    const { reportHtml, reportPdf } = req.body;

    if (!reportHtml) {
      return res.status(400).json({ message: 'reportHtml é obrigatório' });
    }

    const data: any = { reportHtml };

    if (reportPdf) {
      data.reportPdf = Buffer.from(reportPdf, 'base64');
    }

    const saved = await prisma.test.create({ data });

    res.status(201).json({ message: 'Relatório salvo com sucesso', id: saved.id });
  } catch (error) {
    console.error('Erro ao salvar relatório:', error);
    res.status(500).json({ message: 'Erro interno ao salvar relatório' });
  }
});

app.use('/coverage', express.static(path.resolve(process.cwd(), 'coverage', 'lcov-report')));

// Redirecionamento amigável para a raiz da cobertura
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

// Export for Vercel
export default app;

if (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test') {
  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
}
