import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { IUserTokenPayload } from '../types';

export function generateToken(payload: IUserTokenPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
}

export function verifyToken(token: string): IUserTokenPayload {
  return jwt.verify(token, env.JWT_SECRET) as IUserTokenPayload;
}
