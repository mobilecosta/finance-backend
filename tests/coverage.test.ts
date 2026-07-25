import fs from 'fs';
import path from 'path';
import request from 'supertest';
import app from '../src/index.js';
import { getPrisma } from '../src/lib/prisma.js';

const coverageDirectory = path.resolve(process.cwd(), 'coverage');
const reportPath = path.join(coverageDirectory, 'report.html');
const fixtureReport = '<!doctype html><html><body>Coverage test report</body></html>';

let previousReport: string | undefined;
let prisma: any;

describe('Coverage report routes', () => {
  beforeAll(async () => {
    prisma = await getPrisma();
    await prisma.test.deleteMany();

    previousReport = fs.existsSync(reportPath)
      ? fs.readFileSync(reportPath, 'utf8')
      : undefined;

    fs.mkdirSync(coverageDirectory, { recursive: true });
    fs.writeFileSync(reportPath, fixtureReport);
  });

  afterAll(async () => {
    if (previousReport === undefined) {
      fs.rmSync(reportPath, { force: true });
    } else {
      fs.writeFileSync(reportPath, previousReport);
    }
    if (prisma) await prisma.$disconnect();
  });

  it('GET /tests deve retornar o relatório HTML', async () => {
    const response = await request(app).get('/tests');

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch(/text\/html/);
    expect(response.text).toContain('Coverage test report');
  });

  it('GET /coverage redireciona para /tests', async () => {
    const response = await request(app).get('/coverage');

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/tests');
  });

  it('GET /coverage sem relatório redireciona para /tests', async () => {
    fs.rmSync(reportPath, { force: true });

    const response = await request(app).get('/coverage');

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/tests');

    fs.writeFileSync(reportPath, fixtureReport);
  });

  it('GET / deve anunciar as rotas da API', async () => {
    const response = await request(app).get('/');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('message');
    expect(response.body).toHaveProperty('api_tests');
    expect(response.body).toHaveProperty('health');
  });
});
