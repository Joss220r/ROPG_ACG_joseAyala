import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { once } from 'node:events';
import { initializeDatabase } from '../src/db.js';
import { createApp } from '../src/app.js';

await initializeDatabase();

const app = createApp();
const server = app.listen(0);
await once(server, 'listening');

const baseUrl = `http://127.0.0.1:${server.address().port}`;

function makePkcePair() {
  const verifier = crypto.randomBytes(32).toString('base64url');
  const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
  return { verifier, challenge };
}

async function authorize({ verifier, challenge, redirectUri = 'http://127.0.0.1:8081/callback', state = 'state-ok' }) {
  const body = new URLSearchParams({
    response_type: 'code',
    client_id: 'music-web',
    redirect_uri: redirectUri,
    scope: 'profile.read playlists.read',
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    username: 'alumno.demo',
    password: 'AlumnoDemo!2026',
    approve: 'yes'
  });

  const response = await fetch(`${baseUrl}/oauth/authorize`, {
    method: 'POST',
    redirect: 'manual',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body
  });

  return { response, verifier };
}

async function exchange(code, verifier) {
  return fetch(`${baseUrl}/oauth/token`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: 'music-web',
      redirect_uri: 'http://127.0.0.1:8081/callback',
      code_verifier: verifier
    })
  });
}

function shouldAcceptState(expectedState, receivedState) {
  return expectedState === receivedState;
}

try {
  const pkce = makePkcePair();
  const { response, verifier } = await authorize(pkce);
  assert.equal(response.status, 302, 'B1 should redirect after login and consent');

  const location = response.headers.get('location');
  assert.ok(location, 'B1 redirect should include Location header');

  const redirect = new URL(location);
  assert.equal(redirect.origin + redirect.pathname, 'http://127.0.0.1:8081/callback');
  assert.equal(redirect.searchParams.get('state'), 'state-ok', 'B5 client can compare returned state');
  assert.equal(shouldAcceptState('state-ok', redirect.searchParams.get('state')), true);
  assert.ok(redirect.searchParams.get('code'));

  const tokenResponse = await exchange(redirect.searchParams.get('code'), verifier);
  assert.equal(tokenResponse.status, 200, 'B1 should exchange code with valid PKCE verifier');
  const tokenBody = await tokenResponse.json();
  assert.equal(tokenBody.token_type, 'Bearer');
  assert.equal(tokenBody.scope, 'profile.read playlists.read');

  const playlistResponse = await fetch(`${baseUrl}/api/playlists`, {
    headers: { authorization: `Bearer ${tokenBody.access_token}` }
  });
  assert.equal(playlistResponse.status, 200, 'B1 token should access playlists');

  const badRedirect = await authorize({
    ...makePkcePair(),
    redirectUri: 'http://127.0.0.1:9999/evil'
  });
  assert.equal(badRedirect.response.status, 400, 'B2 should reject unregistered redirect_uri');

  const badPkce = makePkcePair();
  const badPkceAuth = await authorize(badPkce);
  const badPkceLocation = new URL(badPkceAuth.response.headers.get('location'));
  const badVerifierResponse = await exchange(badPkceLocation.searchParams.get('code'), 'wrong-verifier');
  assert.equal(badVerifierResponse.status, 400, 'B3 should reject wrong code_verifier');
  assert.equal((await badVerifierResponse.json()).error, 'invalid_grant');

  const reusePkce = makePkcePair();
  const reuseAuth = await authorize(reusePkce);
  const reuseLocation = new URL(reuseAuth.response.headers.get('location'));
  const reuseCode = reuseLocation.searchParams.get('code');
  assert.equal((await exchange(reuseCode, reusePkce.verifier)).status, 200);
  assert.equal((await exchange(reuseCode, reusePkce.verifier)).status, 400, 'B4 should reject reused code');

  assert.equal(shouldAcceptState('expected-state', 'attacker-state'), false, 'B5 client should cancel on state mismatch');

  console.log('PKCE acceptance checks passed: B1, B2, B3, B4 and B5 client state check.');
} finally {
  server.close();
}
