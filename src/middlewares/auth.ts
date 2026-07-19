import { supabase } from '../lib/supabase.js';

type Req = {
  headers: { authorization?: string };
  body?: any;
  user?: any;
};

type Res = {
  status(code: number): Res;
  json(body: any): void;
  setHeader(name: string, value: string): void;
};

type Next = (err?: any) => void;

export const authMiddleware = async (req: Req, res: Res, next: Next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ message: 'Token não fornecido' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ message: 'Token inválido ou expirado' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Erro na autenticação' });
  }
};
