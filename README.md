# MusicHub OAuth 2.0 Lab

Local OAuth 2.0 practice API for the Week 7 assignment. It implements Resource Owner Password Credentials for a legacy internal client and Authorization Code with PKCE for a public web client.

## Current phase

- Authorization server: `GET /oauth/authorize`, `POST /oauth/authorize` and `POST /oauth/token`
- Resource server: `GET /api/me` and `GET /api/playlists`
- Flows implemented: Resource Owner Password Credentials and Authorization Code with PKCE S256
- Token format: JWT signed with HS256
- Password storage: bcrypt hashes only
- Persistence: local SQLite-compatible database file managed by `sql.js` at `database/musichub.sqlite`

Editable diagrams, acceptance scripts and a Postman collection are included for delivery evidence.

## Requirements

- Node.js 22 or newer
- npm

## Setup

```bash
npm install
copy .env.example .env
npm run start
```

Use a long random value for `JWT_SECRET` in `.env` before sharing screenshots or evidence. The included credentials are synthetic and only for local testing.

## Seeded test data

| Type | Value |
| --- | --- |
| User | `alumno.demo` |
| Password | `AlumnoDemo!2026` |
| Legacy client ID | `legacy-client` |
| Legacy client secret | `legacy-secret-demo` |
| Web client ID | `music-web` |
| Web redirect URI | `http://127.0.0.1:8081/callback` |
| Allowed scopes | `profile.read playlists.read` |

## ROPC request

```bash
curl -X POST http://127.0.0.1:8080/oauth/token ^
  -H "Content-Type: application/x-www-form-urlencoded" ^
  -d "grant_type=password" ^
  -d "username=alumno.demo" ^
  -d "password=AlumnoDemo!2026" ^
  -d "client_id=legacy-client" ^
  -d "client_secret=legacy-secret-demo" ^
  -d "scope=profile.read playlists.read"
```

The response includes `access_token`, `token_type`, `expires_in` and `scope`. Do not publish full tokens in screenshots.

## Protected resource examples

```bash
curl http://127.0.0.1:8080/api/me -H "Authorization: Bearer <access_token>"
curl http://127.0.0.1:8080/api/playlists -H "Authorization: Bearer <access_token>"
```

Required scopes:

| Endpoint | Scope |
| --- | --- |
| `GET /api/me` | `profile.read` |
| `GET /api/playlists` | `playlists.read` |

## Authorization Code with PKCE

Generate a verifier and S256 challenge in the client. The server accepts only `code_challenge_method=S256`.

Authorization request:

```text
GET http://127.0.0.1:8080/oauth/authorize?response_type=code&client_id=music-web&redirect_uri=http://127.0.0.1:8081/callback&scope=profile.read%20playlists.read&state=<random-state>&code_challenge=<S256>&code_challenge_method=S256
```

The page shows a simple MusicHub login and consent form. On approval it redirects only to the registered redirect URI:

```text
http://127.0.0.1:8081/callback?code=<authorization-code>&state=<same-state>
```

Token exchange:

```bash
curl -X POST http://127.0.0.1:8080/oauth/token ^
  -H "Content-Type: application/x-www-form-urlencoded" ^
  -d "grant_type=authorization_code" ^
  -d "code=<authorization-code>" ^
  -d "client_id=music-web" ^
  -d "redirect_uri=http://127.0.0.1:8081/callback" ^
  -d "code_verifier=<original-code-verifier>"
```

Authorization codes expire after 120 seconds and can be used only once.

## Acceptance checks

```bash
npm test
npm run test:acceptance
npm run test:ropc
npm run test:pkce
```

The scripts execute real HTTP requests for:

- A1: valid ROPC credentials return 200 and a usable JWT.
- A2: invalid password returns `invalid_grant`.
- A3: missing, tampered or under-scoped tokens are rejected with 401 or 403.
- B1: valid Authorization Code + consent + PKCE returns a code and token.
- B2: unregistered `redirect_uri` is rejected.
- B3: wrong `code_verifier` returns `invalid_grant`.
- B4: a second exchange of the same code fails.
- B5: returned `state` is available for the client to compare before accepting the flow.

## Delivery artifacts

- `diagrams/ropc.puml`: editable ROPC sequence diagram.
- `diagrams/auth-code-pkce.puml`: editable Authorization Code + PKCE sequence diagram.
- `postman/MusicHubOAuth.postman_collection.json`: manual Postman collection with the main requests.
- `tests/ropc.acceptance.mjs` and `tests/pkce.acceptance.mjs`: executable HTTP acceptance checks for A1-A3 and B1-B5.
- `docs/ANALISIS_COMPARATIVO.md`: 250-400 word comparison of ROPC and Authorization Code with PKCE.
- `EVIDENCIAS.md`: evidence checklist and results table to complete with screenshots and repository data.

## Security notes

ROPC is implemented only as a legacy laboratory flow. It exposes the user's password to the client, increases the credential-handling surface, and makes MFA or passwordless authentication harder to adopt. Modern public clients should use Authorization Code with PKCE, where the authorization server owns the login form and the client receives only a code that must be exchanged with a valid verifier.

The JWT validation path pins `HS256`, verifies `iss`, `aud` and `exp`, and checks scopes on every protected resource.
