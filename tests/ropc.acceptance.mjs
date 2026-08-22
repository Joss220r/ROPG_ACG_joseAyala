import assert from 'node:assert/strict';
import { once } from 'node:events';
import { initializeDatabase } from '../src/db.js';
import { createApp } from '../src/app.js';

await initializeDatabase();

const app = createApp();
const server = app.listen(0);
await once(server, 'listening');

const baseUrl = `http://127.0.0.1:${server.address().port}`;

async function formPost(path, body) {
  return fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(body)
  });
}

async function get(path, token) {
  const headers = token ? { authorization: `Bearer ${token}` } : {};
  return fetch(`${baseUrl}${path}`, { headers });
}

try {
  const validTokenResponse = await formPost('/oauth/token', {
    grant_type: 'password',
    username: 'alumno.demo',
    password: 'AlumnoDemo!2026',
    client_id: 'legacy-client',
    client_secret: 'legacy-secret-demo',
    scope: 'profile.read playlists.read'
  });
  assert.equal(validTokenResponse.status, 200, 'A1 should return 200 for valid ROPC credentials');

  const tokenBody = await validTokenResponse.json();
  assert.equal(tokenBody.token_type, 'Bearer');
  assert.equal(tokenBody.expires_in, 900);
  assert.equal(tokenBody.scope, 'profile.read playlists.read');
  assert.ok(tokenBody.access_token);

  const meResponse = await get('/api/me', tokenBody.access_token);
  assert.equal(meResponse.status, 200, 'A1 token should access /api/me');
  const meBody = await meResponse.json();
  assert.equal(meBody.username, 'alumno.demo');

  const badPasswordResponse = await formPost('/oauth/token', {
    grant_type: 'password',
    username: 'alumno.demo',
    password: 'wrong-password',
    client_id: 'legacy-client',
    client_secret: 'legacy-secret-demo',
    scope: 'profile.read playlists.read'
  });
  assert.equal(badPasswordResponse.status, 400, 'A2 should reject wrong password');
  assert.equal((await badPasswordResponse.json()).error, 'invalid_grant');

  const missingTokenResponse = await get('/api/me');
  assert.equal(missingTokenResponse.status, 401, 'A3 should reject missing token');

  const tamperedToken = `${tokenBody.access_token.slice(0, -1)}x`;
  const tamperedResponse = await get('/api/me', tamperedToken);
  assert.equal(tamperedResponse.status, 401, 'A3 should reject tampered token');

  const narrowTokenResponse = await formPost('/oauth/token', {
    grant_type: 'password',
    username: 'alumno.demo',
    password: 'AlumnoDemo!2026',
    client_id: 'legacy-client',
    client_secret: 'legacy-secret-demo',
    scope: 'profile.read'
  });
  const narrowTokenBody = await narrowTokenResponse.json();
  const insufficientScopeResponse = await get('/api/playlists', narrowTokenBody.access_token);
  assert.equal(insufficientScopeResponse.status, 403, 'A3 should reject insufficient scope');

  console.log('ROPC acceptance checks passed: A1, A2 and A3.');
} finally {
  server.close();
}

