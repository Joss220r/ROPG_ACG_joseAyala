import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: Number(process.env.PORT || 8080),
  issuer: process.env.OAUTH_ISSUER || 'http://127.0.0.1:8080',
  audience: process.env.OAUTH_AUDIENCE || 'musichub-api',
  jwtSecret: process.env.JWT_SECRET || 'dev-only-change-me-before-sharing',
  accessTokenTtlSeconds: Math.min(Number(process.env.ACCESS_TOKEN_TTL_SECONDS || 900), 900),
  databasePath: process.env.DATABASE_PATH || 'database/musichub.sqlite'
};

