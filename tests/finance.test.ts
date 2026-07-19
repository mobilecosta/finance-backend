import request from 'supertest';
import app from '../src/index.js';

describe('Finance API Endpoints', () => {
  it('GET /health - deve retornar status ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('GET / - deve retornar mensagem inicial', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('message', 'Finance Pro API');
  });
});
