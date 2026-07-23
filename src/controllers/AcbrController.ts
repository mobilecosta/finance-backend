import { authenticate, proxyRequest } from '../services/acbr.js';

type Res = {
  status(code: number): Res;
  json(body: any): void;
};

type Req = {
  headers: Record<string, any>;
  body?: any;
  query: any;
  params: any;
  method: string;
  path: string;
};

export class AcbrController {
  async auth(req: Req, res: Res) {
    console.log('Recebendo requisição de auth ACBr:', req.body);
    const { client_id, client_secret } = req.body;
    if (!client_id || !client_secret) {
      return res.status(400).json({ message: 'client_id e client_secret são obrigatórios' });
    }
    try {
      console.log('Tentando autenticar no ACBr...');
      const data = await authenticate(client_id, client_secret);
      console.log('Autenticação ACBr bem-sucedida');
      res.json(data);
    } catch (e) {
      console.error('Erro na autenticação ACBr:', e);
      const msg = e instanceof Error ? e.message : 'Erro na autenticação ACBr';
      res.status(502).json({ message: msg });
    }
  }

  async proxy(req: Req, res: Res) {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Token de acesso não fornecido' });
    }
    const token = authHeader.slice(7);
    const path = req.path;
    try {
      const data = await proxyRequest(path, token, {
        method: req.method,
        query: req.query,
        body: req.body,
        environment: req.query.ambiente as string | undefined,
      });
      res.json(data);
    } catch (e) {
      console.error('Erro no proxy ACBr:', e);
      const msg = e instanceof Error ? e.message : 'Erro na requisição ACBr';
      res.status(502).json({ message: msg });
    }
  }
}
