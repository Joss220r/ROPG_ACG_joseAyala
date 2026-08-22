# MusicHub OAuth 2.0 Lab

Local OAuth 2.0 practice API for the Week 7 assignment. Phase 1 implements the Resource Owner Password Credentials flow for a legacy internal client and protects MusicHub resources with signed JWT access tokens.

## Current phase

- Authorization server: `POST /oauth/token`
- Resource server: `GET /api/me` and `GET /api/playlists`
- Flow implemented: Resource Owner Password Credentials
- Token format: JWT signed with HS256
- Password storage: bcrypt hashes only
- Persistence: local SQLite-compatible database file managed by `sql.js` at `database/musichub.sqlite`

Authorization Code with PKCE is planned for the next phase.

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

## Acceptance checks

```bash
npm run test:ropc
```

The script executes real HTTP requests for:

- A1: valid ROPC credentials return 200 and a usable JWT.
- A2: invalid password returns `invalid_grant`.
- A3: missing, tampered or under-scoped tokens are rejected with 401 or 403.

## Security notes

ROPC is implemented only as a legacy laboratory flow. It exposes the user's password to the client, increases the credential-handling surface, and makes MFA or passwordless authentication harder to adopt. Modern public clients should use Authorization Code with PKCE, where the authorization server owns the login form and the client receives only a code that must be exchanged with a valid verifier.

The JWT validation path pins `HS256`, verifies `iss`, `aud` and `exp`, and checks scopes on every protected resource.

