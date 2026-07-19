import { Request, Response } from 'express';
import { supabase } from '../lib/supabase.js';
import { getPrisma } from '../lib/prisma.js';

export class AuthController {
  async signup(req: Request, res: Response) {
    const { email, password, fullName } = req.body;

    try {
      const { data, error } = await supabase.auth.signUp({
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

      const prisma = getPrisma();
      
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

  async signin(req: Request, res: Response) {
    const { email, password } = req.body;

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) return res.status(401).json({ message: error.message });
      if (!data.user) return res.status(401).json({ message: 'Credenciais inválidas' });

      const prisma = getPrisma();
      
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

  async signout(req: Request, res: Response) {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) return res.status(400).json({ message: error.message });
      res.json({ message: 'Logout realizado com sucesso' });
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  async getUser(req: Request, res: Response) {
    // This assumes the user is already authenticated via middleware
    const user = (req as any).user;
    if (!user) return res.status(401).json({ message: 'Não autenticado' });

    try {
      const prisma = getPrisma();
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
