import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import {
  api,
  adminLogin,
  admin,
  signInAsUsername,
  createFixtureUser,
  deleteFixtureUser,
  randomSuffix,
} from './helpers.mjs';

const suffix = randomSuffix();
const freeUsername = `tfree${suffix}`;
const proUsername = `tpro${suffix}`;
const freePassword = 'TestPass123';
const proPassword = 'TestPass123';

let adminToken;
let freeUid;
let proUid;

before(async () => {
  const a = await adminLogin();
  adminToken = a.idToken;
  const free = await createFixtureUser({ username: freeUsername, password: freePassword, plan: 'FREE' });
  const pro = await createFixtureUser({ username: proUsername, password: proPassword, plan: 'PRO' });
  freeUid = free.uid;
  proUid = pro.uid;
});

after(async () => {
  await deleteFixtureUser(freeUid);
  await deleteFixtureUser(proUid);
});

test('admin login returns customToken', async () => {
  const { status, json } = await api('/api/login', {
    method: 'POST',
    body: { username: 'adminleadflu', password: 'NiteshK@1209' },
  });
  assert.equal(status, 200);
  assert.equal(json.success, true);
  assert.ok(json.customToken, 'expected a customToken');
});

test('admin login rejects wrong password', async () => {
  const { status, json } = await api('/api/login', {
    method: 'POST',
    body: { username: 'adminleadflu', password: 'wrong-password' },
  });
  assert.equal(status, 401);
  assert.equal(json.success, false);
  assert.match(json.error, /invalid/i);
});

test('admin login rejects unknown username', async () => {
  const { status } = await api('/api/login', {
    method: 'POST',
    body: { username: 'no-such-user', password: 'NiteshK@1209' },
  });
  assert.equal(status, 401);
});

test('/api/me returns Admin role for admin token', async () => {
  const { status, json } = await api('/api/me', { token: adminToken });
  assert.equal(status, 200);
  assert.equal(json.user.role, 'Admin');
  assert.equal(json.user.plan, 'PRO');
});

test('/api/me returns FREE plan for free user', async () => {
  const creds = await signInAsUsername(freeUsername, freePassword);
  const { status, json } = await api('/api/me', { token: creds.idToken });
  assert.equal(status, 200);
  assert.equal(json.user.role, 'Guest');
  assert.equal(json.user.plan, 'FREE');
});

test('/api/me returns PRO plan for pro user', async () => {
  const creds = await signInAsUsername(proUsername, proPassword);
  const { status, json } = await api('/api/me', { token: creds.idToken });
  assert.equal(status, 200);
  assert.equal(json.user.plan, 'PRO');
});

test('/api/me rejects missing token', async () => {
  const { status } = await api('/api/me');
  assert.equal(status, 401);
});

test('/api/me rejects garbage token', async () => {
  const { status } = await api('/api/me', { token: 'not-a-real-token' });
  assert.equal(status, 401);
});

test('user login normalizes uppercase username', async () => {
  const creds = await signInAsUsername(freeUsername.toUpperCase(), freePassword);
  assert.equal(creds.email, `${freeUsername}@leadflu.app`);
});

test('user login rejects wrong password', async () => {
  await assert.rejects(signInAsUsername(freeUsername, 'WrongPass123'), (err) => {
    assert.match(err.message, /invalid|wrong|password/i);
    return true;
  });
});

test('fixture users exist in admin SDK auth', async () => {
  const fb = admin();
  const user = await fb.auth().getUserByEmail(`${freeUsername}@leadflu.app`);
  assert.equal(user.uid, freeUid);
});
