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
    // Remove database records so tests use local file
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

  it.each(['/coverage', '/tests'])('GET %s deve retornar o relatório HTML', async (route) => {
    const response = await request(app).get(route);

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch(/text\/html/);
    expect(response.text).toContain('Coverage test report');
  });

  it('GET / deve anunciar a rota de cobertura', async () => {
    const response = await request(app).get('/');

    expect(response.status).toBe(200);
    expect(response.body.coverage).toBe('/coverage');
  });

  it('GET /coverage deve informar claramente quando o relatório não existe', async () => {
    fs.rmSync(reportPath, { force: true });

    const response = await request(app).get('/coverage');

    expect(response.status).toBe(404);
    expect(response.text).toContain('Nenhum relatório de cobertura encontrado');

    fs.writeFileSync(reportPath, fixtureReport);
  });
});
