import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import swaggerUi from 'swagger-ui-express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import financeRoutes from './routes/finance.js';

// dotenv.config(); // Já carregado via import 'dotenv/config'

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Swagger Documentation (Load JSON manually to avoid ESM import issues on Vercel)
try {
  const swaggerPath = path.join(__dirname, 'swagger.json');
  if (fs.existsSync(swaggerPath)) {
    const swaggerDocument = JSON.parse(fs.readFileSync(swaggerPath, 'utf8'));
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

app.use('/api/finance', financeRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'Finance Pro API', docs: '/docs', health: '/health' });
});

// Export for Vercel
export default app;

if (process.env.NODE_ENV !== 'production') {
  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
}
