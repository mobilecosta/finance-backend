import { supabase } from '../lib/supabase.js';
import { getPrisma } from '../lib/prisma.js';

type Res = {
  status(code: number): Res;
  json(body: any): void;
  setHeader(name: string, value: string): void;
};

type Req = {
  headers: Record<string, any>;
  body?: any;
  query: any;
  params: any;
  user?: any;
};

const auth = supabase.auth as any;

export class AuthController {
  async signup(req: Req, res: Res) {
    const { email, password, fullName } = req.body;

    try {
      const { data, error } = await auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (error) return res.status(400).json({ message: error.message });
      if (!data.user) return res.status(400).json({ message: 'Erro ao criar usuário' });

      const prisma = await getPrisma();
      
      // Upsert user in our database
      const user = await prisma.user.upsert({
        where: { openId: data.user.id },
        update: {
          name: fullName,
          email: email,
          lastSignedIn: new Date(),
        },
        create: {
          openId: data.user.id,
          name: fullName,
          email: email,
          loginMethod: 'email',
        },
      });

      res.status(201).json({
        token: data.session?.access_token,
        user: {
          id: user.openId,
          email: user.email,
          name: user.name,
          createdAt: user.createdAt,
        },
      });
    } catch (error) {
      console.error('Signup error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  async signin(req: Req, res: Res) {
    const { email, password } = req.body;

    try {
      const { data, error } = await auth.signInWithPassword({
        email,
        password,
      });

      if (error) return res.status(401).json({ message: error.message });
      if (!data.user) return res.status(401).json({ message: 'Credenciais inválidas' });

      const prisma = await getPrisma();
      
      const user = await prisma.user.upsert({
        where: { openId: data.user.id },
        update: {
          lastSignedIn: new Date(),
        },
        create: {
          openId: data.user.id,
          name: data.user.user_metadata?.full_name || null,
          email: data.user.email || null,
          loginMethod: 'email',
        },
      });

      res.json({
        token: data.session?.access_token,
        user: {
          id: user.openId,
          email: user.email,
          name: user.name,
          createdAt: user.createdAt,
        },
      });
    } catch (error) {
      console.error('Signin error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  async signout(req: Req, res: Res) {
    try {
      const { error } = await auth.signOut();
      if (error) return res.status(400).json({ message: error.message });
      res.json({ message: 'Logout realizado com sucesso' });
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  async callback(req: Req, res: any) {
    const { code, next } = req.query;

    if (!code) {
      return res.status(400).json({ message: 'Código de autenticação não fornecido' });
    }

    try {
      const { data, error } = await auth.exchangeCodeForSession(code);

      if (error) return res.status(400).json({ message: error.message });
      if (!data.session) return res.status(400).json({ message: 'Erro ao criar sessão' });

      const token = data.session.access_token;
      const redirectTo = next || process.env.FRONTEND_URL || '/';

      if (req.headers.accept?.includes('text/html')) {
        return res.redirect(`${redirectTo}?token=${token}`);
      }

      res.json({
        token,
        user: {
          id: data.user?.id,
          email: data.user?.email,
        },
      });
    } catch (error) {
      console.error('Callback error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  async getUser(req: Req, res: Res) {
    const user = req.user;
    if (!user) return res.status(401).json({ message: 'Não autenticado' });

    try {
      const prisma = await getPrisma();
      const dbUser = await prisma.user.findUnique({
        where: { openId: user.id },
      });

      if (!dbUser) return res.status(404).json({ message: 'Usuário não encontrado' });

      res.json({
        id: dbUser.openId,
        email: dbUser.email,
        name: dbUser.name,
        createdAt: dbUser.createdAt,
      });
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  }
}
