import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import financeRoutes from './routes/finance.js';
import swaggerDocument from './swagger.json' assert { type: 'json' };

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Swagger Documentation
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/finance', financeRoutes);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
  console.log(`Documentation available at http://localhost:${port}/docs`);
});
