import express from 'express';
import bcrypt from 'bcryptjs';
import { store } from './db.js';
import { hasEveryScope, issueAccessToken, parseScopes } from './security.js';
import {
  invalidClient,
  invalidGrant,
  invalidRequest,
  invalidScope,
  unauthorizedClient
} from './oauthErrors.js';

export const oauthRouter = express.Router();

oauthRouter.post('/token', async (req, res) => {
  const { grant_type: grantType } = req.body;

  if (!grantType) {
    return invalidRequest(res, 'grant_type is required.');
  }

  if (grantType === 'password') {
    return handlePasswordGrant(req, res);
  }

  return invalidRequest(res, 'Unsupported grant_type for this phase.');
});

async function handlePasswordGrant(req, res) {
  const { username, password, client_id: clientId, client_secret: clientSecret } = req.body;
  const requestedScope = req.body.scope || '';
  const requestedScopes = parseScopes(requestedScope);

  if (!username || !password || !clientId || !clientSecret) {
    return invalidRequest(res, 'username, password, client_id and client_secret are required.');
  }

  const client = store.getClientById(clientId);
  if (!client || client.type !== 'confidential' || !client.secret_hash) {
    return invalidClient(res);
  }

  const validClientSecret = await bcrypt.compare(clientSecret, client.secret_hash);
  if (!validClientSecret) {
    return invalidClient(res);
  }

  if (!parseScopes(client.allowed_grants).includes('password')) {
    return unauthorizedClient(res);
  }

  if (requestedScopes.length === 0 || !hasEveryScope(requestedScopes, client.allowed_scopes)) {
    return invalidScope(res);
  }

  const user = store.getUserByUsername(username);
  if (!user) {
    return invalidGrant(res);
  }

  const validPassword = await bcrypt.compare(password, user.password_hash);
  if (!validPassword) {
    return invalidGrant(res);
  }

  return res.json(issueAccessToken({
    userId: user.id,
    clientId: client.id,
    scope: requestedScopes.join(' ')
  }));
}

