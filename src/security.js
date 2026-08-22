import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { config } from './config.js';

export function parseScopes(scope = '') {
  return scope
    .split(/\s+/)
    .map((value) => value.trim())
    .filter(Boolean);
}

export function hasEveryScope(requestedScopes, allowedScopes) {
  const allowed = new Set(parseScopes(allowedScopes));
  return requestedScopes.every((scope) => allowed.has(scope));
}

export function issueAccessToken({ userId, clientId, scope }) {
  const now = Math.floor(Date.now() / 1000);
  const expiresIn = config.accessTokenTtlSeconds;
  const payload = {
    iss: config.issuer,
    sub: userId,
    aud: config.audience,
    iat: now,
    exp: now + expiresIn,
    jti: uuidv4(),
    client_id: clientId,
    scope
  };

  return {
    access_token: jwt.sign(payload, config.jwtSecret, { algorithm: 'HS256' }),
    token_type: 'Bearer',
    expires_in: expiresIn,
    scope
  };
}

export function verifyAccessToken(token) {
  return jwt.verify(token, config.jwtSecret, {
    algorithms: ['HS256'],
    audience: config.audience,
    issuer: config.issuer
  });
}

