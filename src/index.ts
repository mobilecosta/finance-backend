import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import swaggerUi from 'swagger-ui-express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';

import { execSync } from 'child_process';
import financeRoutes from './routes/finance.js';
import authRoutes from './routes/auth.js';

// dotenv.config(); // Já carregado via import 'dotenv/config'

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Função para executar migrações do Prisma
async function runPrismaMigrations() {
  if (process.env.NODE_ENV !== 'production' || process.env.RUN_MIGRATIONS === 'true') {
    console.log('Executando migrações do Prisma...');
    try {
      execSync('npx prisma migrate deploy', { stdio: 'inherit' });
      console.log('Migrações do Prisma executadas com sucesso.');
    } catch (error) {
      console.error('Erro ao executar migrações do Prisma:', error);
      process.exit(1);
    }
  } else {
    console.log('Migrações do Prisma não executadas em ambiente de produção sem RUN_MIGRATIONS=true.');
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
const sendCoverageReport = async (_req: express.Request, res: express.Response) => {
  try {
    const latestReport = await prisma.coverageReport.findFirst({
      orderBy: { createdAt: 'desc' },
    });

    if (latestReport) {
      res.setHeader('Content-Type', 'text/html');
      res.send(latestReport.reportHtml);
    } else {
      res.status(404).send('Relatório de cobertura não encontrado no banco de dados. Execute `pnpm test:coverage` primeiro.');
    }
  } catch (error) {
    console.error('Erro ao buscar relatório de cobertura do banco de dados:', error);
    res.status(500).send('Erro interno do servidor ao buscar o relatório de cobertura.');
  }
};

app.get('/coverage', sendCoverageReport);
app.get('/tests', sendCoverageReport);

app.get('/', (req, res) => {
  res.json({ 
    message: 'Finance Pro API', 
    docs: '/docs', 
    coverage: '/coverage',
    tests: '/tests',
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
