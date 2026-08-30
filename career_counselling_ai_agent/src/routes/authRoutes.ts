import { Router, Request, Response } from 'express';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';

const router = Router();

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'GOOGLE_CLIENT_ID_REDACTED';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || 'GOOGLE_CLIENT_SECRET_REDACTED';
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me-in-production';

const oauth2Client = new OAuth2Client(
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  'postmessage'
);

// ── GET /api/auth/google/config ──────────────────────────────────────────────
router.get('/google/config', (_req: Request, res: Response) => {
  res.json({
    success: true,
    clientId: GOOGLE_CLIENT_ID,
    authEnabled: !!GOOGLE_CLIENT_ID,
  });
});

// ── POST /api/auth/google/verify ─────────────────────────────────────────────
router.post('/google/verify', async (req: Request, res: Response) => {
  try {
    const { credential, code } = req.body ?? {};

    let payload: any = null;

    if (credential) {
      const ticket = await oauth2Client.verifyIdToken({
        idToken: credential,
        audience: GOOGLE_CLIENT_ID,
      });
      payload = ticket.getPayload();
    } else if (code) {
      const { tokens } = await oauth2Client.getToken(code);
      if (tokens.id_token) {
        const ticket = await oauth2Client.verifyIdToken({
          idToken: tokens.id_token,
          audience: GOOGLE_CLIENT_ID,
        });
        payload = ticket.getPayload();
      }
    }

    if (!payload || !payload.email) {
      return res.status(400).json({ success: false, error: 'Invalid Google authentication credential' });
    }

    const user = {
      id: payload.sub,
      email: payload.email,
      name: payload.name || payload.email.split('@')[0],
      picture: payload.picture || '',
      hd: payload.hd || '',
    };

    const token = jwt.sign(user, JWT_SECRET, { expiresIn: '7d' });

    logger.info(`🔑 Google Auth successful for user: ${user.email}`);

    res.json({
      success: true,
      token,
      user,
    });
  } catch (err: any) {
    logger.error(`❌ Google Auth verification error: ${err.message}`);
    res.status(401).json({ success: false, error: err.message || 'Google Auth verification failed' });
  }
});

// ── GET /api/auth/me ─────────────────────────────────────────────────────────
router.get('/me', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Unauthenticated' });
  }
  const token = authHeader.substring(7);
  try {
    const user = jwt.verify(token, JWT_SECRET);
    res.json({ success: true, user });
  } catch (_) {
    res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }
});

export default router;
