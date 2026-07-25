import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { secrets } from '../../config/secrets';
import { RefreshSession } from '../../models/RefreshSession';
import { User } from '../../models/User';

const ACCESS_TOKEN_EXPIRES_IN = '15m';
const REFRESH_TOKEN_EXPIRES_IN = '7d';
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

interface RefreshClaims {
  id: string;
  type: string;
  jti?: string;
}

function tokenHash(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function createTokenPair(userId: string, jti: string) {
  return {
    accessToken: jwt.sign(
      { id: userId, type: 'access' },
      secrets.jwt,
      { expiresIn: ACCESS_TOKEN_EXPIRES_IN }
    ),
    refreshToken: jwt.sign(
      { id: userId, type: 'refresh', jti },
      secrets.jwtRefresh,
      { expiresIn: REFRESH_TOKEN_EXPIRES_IN }
    ),
  };
}

async function persistSession(
  userId: string,
  jti: string,
  refreshToken: string
): Promise<void> {
  await RefreshSession.create({
    user: userId,
    jti,
    tokenHash: tokenHash(refreshToken),
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
  });
}

export async function issueTokenPair(userId: string) {
  const jti = crypto.randomUUID();
  const tokens = createTokenPair(userId, jti);
  await persistSession(userId, jti, tokens.refreshToken);
  return tokens;
}

function verifyRefreshToken(refreshToken: string): RefreshClaims {
  const decoded = jwt.verify(refreshToken, secrets.jwtRefresh) as RefreshClaims;
  if (decoded.type !== 'refresh' || !decoded.id || !decoded.jti) {
    throw new jwt.JsonWebTokenError('Invalid refresh token claims');
  }
  return decoded;
}

export async function rotateRefreshToken(refreshToken: string) {
  const decoded = verifyRefreshToken(refreshToken);
  const user = await User.findById(decoded.id);
  if (!user) return null;

  const nextJti = crypto.randomUUID();
  const nextTokens = createTokenPair(decoded.id, nextJti);
  const consumed = await RefreshSession.findOneAndUpdate(
    {
      user: decoded.id,
      jti: decoded.jti,
      tokenHash: tokenHash(refreshToken),
      revokedAt: { $exists: false },
      expiresAt: { $gt: new Date() },
    },
    {
      $set: {
        revokedAt: new Date(),
        replacedByJti: nextJti,
      },
    }
  );

  if (!consumed) return null;
  await persistSession(decoded.id, nextJti, nextTokens.refreshToken);
  return { user, tokens: nextTokens };
}

export async function revokeRefreshToken(
  refreshToken?: string
): Promise<string | null> {
  if (!refreshToken) return null;

  try {
    const decoded = verifyRefreshToken(refreshToken);
    const revoked = await RefreshSession.findOneAndUpdate(
      {
        user: decoded.id,
        jti: decoded.jti,
        tokenHash: tokenHash(refreshToken),
        revokedAt: { $exists: false },
      },
      { $set: { revokedAt: new Date() } }
    );
    return revoked ? decoded.id : null;
  } catch {
    return null;
  }
}
