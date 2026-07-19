import fs from 'fs';
import path from 'path';
import request from 'supertest';
import app from '../src/index.js';

const coverageDirectory = path.resolve(process.cwd(), 'coverage');
const reportPath = path.join(coverageDirectory, 'report.html');
const fixtureReport = '<!doctype html><html><body>Coverage test report</body></html>';

let previousReport: string | undefined;

describe('Coverage report routes', () => {
  beforeAll(() => {
    previousReport = fs.existsSync(reportPath)
      ? fs.readFileSync(reportPath, 'utf8')
      : undefined;

    fs.mkdirSync(coverageDirectory, { recursive: true });
    fs.writeFileSync(reportPath, fixtureReport);
  });

  afterAll(() => {
    if (previousReport === undefined) {
      fs.rmSync(reportPath, { force: true });
      return;
    }

    fs.writeFileSync(reportPath, previousReport);
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
    expect(response.text).toContain('Relatório de cobertura não encontrado');

    fs.writeFileSync(reportPath, fixtureReport);
  });
});
