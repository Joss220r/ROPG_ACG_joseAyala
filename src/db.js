import fs from 'node:fs';
import path from 'node:path';
import initSqlJs from 'sql.js';
import bcrypt from 'bcryptjs';
import { config } from './config.js';

let SQL;
let db;

function ensureDatabaseDirectory() {
  fs.mkdirSync(path.dirname(config.databasePath), { recursive: true });
}

function persist() {
  ensureDatabaseDirectory();
  fs.writeFileSync(config.databasePath, Buffer.from(db.export()));
}

function run(sql, params = []) {
  db.run(sql, params);
  persist();
}

function queryOne(sql, params = []) {
  const statement = db.prepare(sql);
  statement.bind(params);
  const row = statement.step() ? statement.getAsObject() : null;
  statement.free();
  return row;
}

function queryAll(sql, params = []) {
  const statement = db.prepare(sql);
  statement.bind(params);
  const rows = [];
  while (statement.step()) {
    rows.push(statement.getAsObject());
  }
  statement.free();
  return rows;
}

function migrate() {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      display_name TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS oauth_clients (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      secret_hash TEXT,
      allowed_grants TEXT NOT NULL,
      allowed_scopes TEXT NOT NULL,
      redirect_uri TEXT
    );

    CREATE TABLE IF NOT EXISTS playlists (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      track_count INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS authorization_codes (
      code TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      client_id TEXT NOT NULL,
      redirect_uri TEXT NOT NULL,
      scope TEXT NOT NULL,
      code_challenge TEXT NOT NULL,
      code_challenge_method TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      consumed_at INTEGER,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (client_id) REFERENCES oauth_clients(id)
    );
  `);
}

function seed() {
  const user = queryOne('SELECT id FROM users WHERE username = ?', ['alumno.demo']);
  if (!user) {
    run(
      'INSERT INTO users (id, username, password_hash, display_name) VALUES (?, ?, ?, ?)',
      [
        'user-alumno-demo',
        'alumno.demo',
        bcrypt.hashSync('AlumnoDemo!2026', 12),
        'Alumno Demo'
      ]
    );
  }

  const legacyClient = queryOne('SELECT id FROM oauth_clients WHERE id = ?', ['legacy-client']);
  if (!legacyClient) {
    run(
      `INSERT INTO oauth_clients
        (id, name, type, secret_hash, allowed_grants, allowed_scopes, redirect_uri)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        'legacy-client',
        'MusicHub Legacy Internal Client',
        'confidential',
        bcrypt.hashSync('legacy-secret-demo', 12),
        'password',
        'profile.read playlists.read',
        null
      ]
    );
  }

  const webClient = queryOne('SELECT id FROM oauth_clients WHERE id = ?', ['music-web']);
  if (!webClient) {
    run(
      `INSERT INTO oauth_clients
        (id, name, type, secret_hash, allowed_grants, allowed_scopes, redirect_uri)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        'music-web',
        'MusicHub Web Client',
        'public',
        null,
        'authorization_code',
        'profile.read playlists.read',
        'http://127.0.0.1:8081/callback'
      ]
    );
  }

  const playlist = queryOne('SELECT id FROM playlists WHERE user_id = ?', ['user-alumno-demo']);
  if (!playlist) {
    run(
      'INSERT INTO playlists (id, user_id, name, track_count) VALUES (?, ?, ?, ?)',
      ['playlist-focus', 'user-alumno-demo', 'Focus Synth Lab', 18]
    );
    run(
      'INSERT INTO playlists (id, user_id, name, track_count) VALUES (?, ?, ?, ?)',
      ['playlist-audit', 'user-alumno-demo', 'Audit Night Drive', 12]
    );
  }
}

export async function initializeDatabase() {
  if (db) {
    return;
  }

  SQL = await initSqlJs();
  ensureDatabaseDirectory();

  if (fs.existsSync(config.databasePath)) {
    const fileBuffer = fs.readFileSync(config.databasePath);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  migrate();
  seed();
  persist();
}

export const store = {
  getUserByUsername(username) {
    return queryOne('SELECT * FROM users WHERE username = ?', [username]);
  },

  getUserById(id) {
    return queryOne('SELECT id, username, display_name FROM users WHERE id = ?', [id]);
  },

  getClientById(id) {
    return queryOne('SELECT * FROM oauth_clients WHERE id = ?', [id]);
  },

  getPlaylistsByUserId(userId) {
    return queryAll(
      'SELECT id, name, track_count FROM playlists WHERE user_id = ? ORDER BY name',
      [userId]
    );
  },

  saveAuthorizationCode(codeData) {
    run(
      `INSERT INTO authorization_codes
        (code, user_id, client_id, redirect_uri, scope, code_challenge, code_challenge_method, expires_at, consumed_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        codeData.code,
        codeData.userId,
        codeData.clientId,
        codeData.redirectUri,
        codeData.scope,
        codeData.codeChallenge,
        codeData.codeChallengeMethod,
        codeData.expiresAt,
        null,
        codeData.createdAt
      ]
    );
  },

  getAuthorizationCode(code) {
    return queryOne('SELECT * FROM authorization_codes WHERE code = ?', [code]);
  },

  consumeAuthorizationCode(code) {
    run('UPDATE authorization_codes SET consumed_at = ? WHERE code = ?', [Math.floor(Date.now() / 1000), code]);
  }
};
