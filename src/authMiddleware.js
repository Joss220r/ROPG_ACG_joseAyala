import { parseScopes, verifyAccessToken } from './security.js';

export function requireBearerToken(requiredScope) {
  return (req, res, next) => {
    const header = req.get('authorization') || '';
    const [scheme, token] = header.split(' ');

    if (scheme !== 'Bearer' || !token) {
      return res.status(401).json({ error: 'invalid_token', error_description: 'Bearer token is required.' });
    }

    try {
      const claims = verifyAccessToken(token);
      const tokenScopes = parseScopes(claims.scope);

      if (!tokenScopes.includes(requiredScope)) {
        return res.status(403).json({ error: 'insufficient_scope', error_description: 'Required scope is missing.' });
      }

      req.auth = claims;
      return next();
    } catch {
      return res.status(401).json({ error: 'invalid_token', error_description: 'Token is expired or invalid.' });
    }
  };
}

