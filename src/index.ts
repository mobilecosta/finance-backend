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
    app.use('/docs', swaggerUi.serve);
    app.get('/docs', (req, res) => {
      res.send(swaggerUi.generateHTML(swaggerDocument));
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

// Servir relatórios de cobertura de testes
app.use('/coverage', express.static(path.join(__dirname, '../coverage')));
app.get('/tests', (req, res) => {
  const reportPath = path.join(__dirname, '../coverage/report.html');
  if (fs.existsSync(reportPath)) {
    res.sendFile(reportPath);
  } else {
    res.status(404).send('Relatório de testes não encontrado. Execute os testes primeiro.');
  }
});

app.get('/', (req, res) => {
  res.json({ 
    message: 'Finance Pro API', 
    docs: '/docs', 
    tests: '/tests',
    health: '/health' 
  });
});

// Export for Vercel
export default app;

if (process.env.NODE_ENV !== 'production') {
  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
}
