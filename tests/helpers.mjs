import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

export const BASE_URL = (process.env.TEST_BASE_URL || 'http://localhost:3000').replace(/\/+$/, '');

const config = JSON.parse(readFileSync(path.join(ROOT, 'firebase-applet-config.json'), 'utf8'));
export const FIREBASE_API_KEY = config.apiKey;

const envRaw = readFileSync(path.join(ROOT, '.env.local'), 'utf8');

function envValue(key) {
  const line = envRaw.split(/\r?\n/).find((l) => l.startsWith(key + '='));
  if (!line) return null;
  let value = line.slice(key.length + 1).trim();
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1);
  }
  return value;
}

export const FIREBASE_SERVICE_ACCOUNT = envValue('FIREBASE_SERVICE_ACCOUNT');

export const ADMIN_USERNAME = (process.env.TEST_ADMIN_USERNAME || 'adminleadflu').toLowerCase();
export const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD || 'NiteshK@1209';

export const USERNAME_DOMAIN = '@leadflu.app';
export const usernameToEmail = (username) => `${username.trim().toLowerCase()}${USERNAME_DOMAIN}`;

export function randomSuffix() {
  return `${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;
}

const require = createRequire(import.meta.url);
let _admin = null;

export function admin() {
  if (!_admin) {
    if (!FIREBASE_SERVICE_ACCOUNT) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT not found in .env.local');
    }
    const fb = require('firebase-admin');
    _admin =
      fb.apps?.[0] ||
      fb.initializeApp({ credential: fb.credential.cert(JSON.parse(FIREBASE_SERVICE_ACCOUNT)) });
  }
  return _admin;
}

export async function api(pathname, { method = 'GET', token, body } = {}) {
  const res = await fetch(`${BASE_URL}${pathname}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try {
    json = await res.json();
  } catch {
    // non-JSON response
  }
  return { status: res.status, json };
}

async function identityToolkit(endpoint, payload) {
  const res = await fetch(`https://identitytoolkit.googleapis.com/v1/${endpoint}?key=${FIREBASE_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(`${endpoint} failed: ${json.error?.message || res.status}`);
    err.code = json.error?.message;
    throw err;
  }
  return json;
}

export async function signInWithPassword(email, password) {
  const json = await identityToolkit('accounts:signInWithPassword', {
    email,
    password,
    returnSecureToken: true,
  });
  return { idToken: json.idToken, uid: json.localId, email: json.email };
}

export async function signInAsUsername(username, password) {
  return signInWithPassword(usernameToEmail(username), password);
}

export async function exchangeCustomToken(customToken) {
  const json = await identityToolkit('accounts:signInWithCustomToken', {
    token: customToken,
    returnSecureToken: true,
  });
  let uid = json.localId;
  if (!uid) {
    const decoded = await admin().auth().verifyIdToken(json.idToken);
    uid = decoded.uid;
  }
  return { idToken: json.idToken, uid };
}

const TOKEN_CACHE_PATH = path.join(os.tmpdir(), 'leadflu-admin-token.json');

// /api/login is rate-limited (5 attempts/min), and node --test runs files in
// parallel. Cache the admin idToken to a temp file (60s TTL) so the whole suite
// shares ONE login instead of hammering the endpoint from every file.
async function cachedAdminLogin() {
  try {
    const cached = JSON.parse(readFileSync(TOKEN_CACHE_PATH, 'utf8'));
    if (cached?.idToken && typeof cached.idToken === 'string' && Date.now() - cached.at < 60_000) {
      return cached.idToken;
    }
  } catch {}
  const { status, json } = await api('/api/login', {
    method: 'POST',
    body: { username: ADMIN_USERNAME, password: ADMIN_PASSWORD },
  });
  if (status !== 200 || !json?.customToken) {
    throw new Error(`adminLogin failed (${status}): ${JSON.stringify(json)}`);
  }
  const { idToken } = await exchangeCustomToken(json.customToken);
  try {
    writeFileSync(TOKEN_CACHE_PATH, JSON.stringify({ idToken, at: Date.now() }), 'utf8');
  } catch {}
  return idToken;
}

export async function adminLogin() {
  const idToken = await cachedAdminLogin();
  const decoded = await admin().auth().verifyIdToken(idToken);
  return { idToken, uid: decoded.uid };
}

export async function createFixtureUser({ username, password, plan = 'FREE', name } = {}) {
  const fb = admin();
  const email = usernameToEmail(username);
  const user = await fb.auth().createUser({ email, password, displayName: name || username });
  await fb
    .firestore()
    .collection('users')
    .doc(user.uid)
    .set({
      username,
      name: name || username,
      role: 'Guest',
      plan,
      expiryDate: plan === 'PRO' ? Date.now() + 30 * 24 * 60 * 60 * 1000 : null,
      createdAt: Date.now(),
    });
  return { uid: user.uid, username, email };
}

export async function deleteFixtureUser(uid) {
  if (!uid) return;
  const fb = admin();
  await fb.auth().deleteUser(uid).catch(() => {});
  await fb.firestore().collection('users').doc(uid).delete().catch(() => {});
}

export async function deleteLeadById(leadId) {
  if (!leadId) return;
  await admin().firestore().collection('leads').doc(leadId).delete().catch(() => {});
}

export function makeLead(overrides = {}) {
  return {
    title: `Test Gig ${randomSuffix()}`,
    description: 'A robust description that is comfortably longer than the ten character minimum.',
    budgetNumeric: 250,
    budgetString: '$250 total',
    currency: 'USD',
    platform: 'YouTube',
    category: 'Shorts',
    softwareRequired: ['Premiere', 'After Effects'],
    leadType: 'FREE',
    accessType: 'FREE',
    contactDetails: { email: `client-${randomSuffix()}@example.com`, whatsapp: '+911234567890' },
    status: 'Active',
    deadline: Date.now() + 7 * 24 * 60 * 60 * 1000,
    ...overrides,
  };
}

export function assertLeadUnmasked(lead) {
  assert(typeof lead?.contactDetails?.email === 'string');
  assert(!lead.contactDetails.email.includes('•'));
}

export function assertLeadMasked(lead) {
  assert(lead?.contactDetails?.email.includes('•'));
}
