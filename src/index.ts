import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import swaggerUi from 'swagger-ui-express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import financeRoutes from './routes/finance.js';
import authRoutes from './routes/auth.js';

// dotenv.config(); // Já carregado via import 'dotenv/config'

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
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
const coverageDirectory = path.join(__dirname, '../coverage');
const coverageReportPath = path.join(coverageDirectory, 'report.html');

const sendCoverageReport = (_req: express.Request, res: express.Response) => {
  if (fs.existsSync(coverageReportPath)) {
    res.sendFile(coverageReportPath);
    return;
  }

  res.status(404).send('Relatório de cobertura não encontrado. Execute `pnpm test:coverage` primeiro.');
};

app.get('/coverage', sendCoverageReport);
app.use('/coverage', express.static(coverageDirectory));
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
