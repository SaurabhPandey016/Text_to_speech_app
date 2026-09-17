import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';

import { prisma } from '../services/prismaService.js';
import { env } from '../config/environment.js';

const authPayload = (user) => ({ id: user.id, name: user.name, email: user.email });

function issueToken(user) {
  return jwt.sign(authPayload(user), env.jwtSecret, { expiresIn: '7d' });
}

function setAuthCookie(res, user) {
  res.cookie('echo_auth', issueToken(user), {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.nodeEnv === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

const authSchema = z.object({
  name: z.string().trim().min(2).max(60).optional(),
  email: z.string().trim().email().max(120).transform((value) => value.toLowerCase()),
  password: z.string().min(8).max(72),
});

export async function getCurrentUser(req, res) {
  res.json({ user: req.user || null });
}

export async function registerUser(req, res) {
  const parsed = authSchema.safeParse(req.body);
  if (!parsed.success || !parsed.data.name) {
    return res.status(400).json({ error: 'Name, email, and a password of at least 8 characters are required.' });
  }

  try {
    const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const user = await prisma.user.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        passwordHash: await bcrypt.hash(parsed.data.password, 12),
      },
    });

    setAuthCookie(res, user);
    return res.status(201).json({ user: authPayload(user) });
  } catch (error) {
    console.error('Register error:', error);
    return res.status(500).json({ error: 'Unable to create your account right now.' });
  }
}

export async function loginUser(req, res) {
  const parsed = authSchema.pick({ email: true, password: true }).safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Enter a valid email and password.' });
  }

  try {
    const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    if (!user || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) {
      return res.status(401).json({ error: 'Email or password is incorrect.' });
    }

    setAuthCookie(res, user);
    return res.json({ user: authPayload(user) });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Unable to sign in right now.' });
  }
}

export async function logoutUser(_req, res) {
  res.clearCookie('echo_auth');
  res.status(204).end();
}

export { setAuthCookie, issueToken };
