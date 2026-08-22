import express from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
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

oauthRouter.get('/authorize', (req, res) => {
  const validation = validateAuthorizeRequest(req.query);
  if (validation.error) {
    return validation.error(res);
  }

  res.type('html').send(renderConsentPage(req.query, validation.client));
});

oauthRouter.post('/authorize', async (req, res) => {
  const validation = validateAuthorizeRequest(req.body);
  if (validation.error) {
    return validation.error(res);
  }

  const { username, password, approve } = req.body;
  if (approve !== 'yes') {
    return invalidRequest(res, 'The resource owner did not approve the request.');
  }

  const user = store.getUserByUsername(username || '');
  if (!user || !(await bcrypt.compare(password || '', user.password_hash))) {
    return invalidGrant(res);
  }

  const now = Math.floor(Date.now() / 1000);
  const code = crypto.randomBytes(32).toString('base64url');

  store.saveAuthorizationCode({
    code,
    userId: user.id,
    clientId: validation.client.id,
    redirectUri: req.body.redirect_uri,
    scope: parseScopes(req.body.scope).join(' '),
    codeChallenge: req.body.code_challenge,
    codeChallengeMethod: req.body.code_challenge_method,
    createdAt: now,
    expiresAt: now + 120
  });

  const redirectUrl = new URL(req.body.redirect_uri);
  redirectUrl.searchParams.set('code', code);
  redirectUrl.searchParams.set('state', req.body.state);
  return res.redirect(302, redirectUrl.toString());
});

oauthRouter.post('/token', async (req, res) => {
  const { grant_type: grantType } = req.body;

  if (!grantType) {
    return invalidRequest(res, 'grant_type is required.');
  }

  if (grantType === 'password') {
    return handlePasswordGrant(req, res);
  }

  if (grantType === 'authorization_code') {
    return handleAuthorizationCodeGrant(req, res);
  }

  return invalidRequest(res, 'Unsupported grant_type.');
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

function validateAuthorizeRequest(input) {
  const {
    response_type: responseType,
    client_id: clientId,
    redirect_uri: redirectUri,
    scope = '',
    state,
    code_challenge: codeChallenge,
    code_challenge_method: codeChallengeMethod
  } = input;

  if (!responseType || !clientId || !redirectUri || !scope || !state || !codeChallenge || !codeChallengeMethod) {
    return { error: (res) => invalidRequest(res, 'Missing required authorization parameter.') };
  }

  if (responseType !== 'code') {
    return { error: (res) => invalidRequest(res, 'response_type must be code.') };
  }

  const client = store.getClientById(clientId);
  if (!client || !parseScopes(client.allowed_grants).includes('authorization_code')) {
    return { error: (res) => unauthorizedClient(res) };
  }

  if (client.redirect_uri !== redirectUri) {
    return { error: (res) => invalidRequest(res, 'redirect_uri is not registered for this client.') };
  }

  if (codeChallengeMethod !== 'S256') {
    return { error: (res) => invalidRequest(res, 'PKCE code_challenge_method must be S256.') };
  }

  const requestedScopes = parseScopes(scope);
  if (requestedScopes.length === 0 || !hasEveryScope(requestedScopes, client.allowed_scopes)) {
    return { error: (res) => invalidScope(res) };
  }

  return { client };
}

function renderConsentPage(query, client) {
  const fields = [
    'response_type',
    'client_id',
    'redirect_uri',
    'scope',
    'state',
    'code_challenge',
    'code_challenge_method'
  ].map((name) => `<input type="hidden" name="${name}" value="${escapeHtml(query[name])}">`).join('\n');

  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>MusicHub consent</title>
</head>
<body>
  <h1>MusicHub authorization</h1>
  <p>Client: ${escapeHtml(client.name)}</p>
  <p>Scopes requested: ${escapeHtml(query.scope)}</p>
  <form method="post" action="/oauth/authorize">
    ${fields}
    <label>Username <input name="username" value="alumno.demo"></label><br>
    <label>Password <input name="password" type="password"></label><br>
    <button type="submit" name="approve" value="yes">Approve</button>
  </form>
</body>
</html>`;
}

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function verifyPkce(codeVerifier, codeChallenge) {
  const calculated = crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest('base64url');
  const calculatedBuffer = Buffer.from(calculated);
  const challengeBuffer = Buffer.from(codeChallenge);

  if (calculatedBuffer.length !== challengeBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(calculatedBuffer, challengeBuffer);
}

function handleAuthorizationCodeGrant(req, res) {
  const {
    code,
    client_id: clientId,
    redirect_uri: redirectUri,
    code_verifier: codeVerifier
  } = req.body;

  if (!code || !clientId || !redirectUri || !codeVerifier) {
    return invalidRequest(res, 'code, client_id, redirect_uri and code_verifier are required.');
  }

  const client = store.getClientById(clientId);
  if (!client || !parseScopes(client.allowed_grants).includes('authorization_code')) {
    return unauthorizedClient(res);
  }

  if (client.redirect_uri !== redirectUri) {
    return invalidGrant(res);
  }

  const authCode = store.getAuthorizationCode(code);
  const now = Math.floor(Date.now() / 1000);
  if (!authCode || authCode.consumed_at || authCode.expires_at < now) {
    return invalidGrant(res);
  }

  if (authCode.client_id !== client.id || authCode.redirect_uri !== redirectUri) {
    return invalidGrant(res);
  }

  if (authCode.code_challenge_method !== 'S256' || !verifyPkce(codeVerifier, authCode.code_challenge)) {
    return invalidGrant(res);
  }

  store.consumeAuthorizationCode(code);

  return res.json(issueAccessToken({
    userId: authCode.user_id,
    clientId: client.id,
    scope: authCode.scope
  }));
}
