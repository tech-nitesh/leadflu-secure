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
  const a = await adminLogin();
  adminToken = a.idToken;
  assert.ok(a.uid, 'expected an admin uid');
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

test('PRO device limit: 1st and 2nd devices allowed, 3rd blocked', async () => {
  const creds = await signInAsUsername(proUsername, proPassword);
  const first = await api('/api/me', { token: creds.idToken, headers: { 'x-device-id': 'dev-one' } });
  assert.equal(first.status, 200, 'first device should be allowed');
  const second = await api('/api/me', { token: creds.idToken, headers: { 'x-device-id': 'dev-two' } });
  assert.equal(second.status, 200, 'second device should be allowed');
  const third = await api('/api/me', { token: creds.idToken, headers: { 'x-device-id': 'dev-three' } });
  assert.equal(third.status, 403, 'third device should be blocked');
  assert.equal(third.json.code, 'DEVICE_LIMIT');
  assert.match(third.json.error, /2 devices/i);
});

test('PRO device limit: a known device is always allowed', async () => {
  const creds = await signInAsUsername(proUsername, proPassword);
  const again = await api('/api/me', { token: creds.idToken, headers: { 'x-device-id': 'dev-one' } });
  assert.equal(again.status, 200);
});

test('FREE user is never device-limited', async () => {
  const creds = await signInAsUsername(freeUsername, freePassword);
  for (const device of ['dev-f1', 'dev-f2', 'dev-f3', 'dev-f4']) {
    const r = await api('/api/me', { token: creds.idToken, headers: { 'x-device-id': device } });
    assert.equal(r.status, 200, `FREE user should always be allowed on ${device}`);
  }
});

test('admin is never device-limited', async () => {
  const r = await api('/api/me', { token: adminToken, headers: { 'x-device-id': 'dev-admin-1' } });
  assert.equal(r.status, 200);
});

test('PRO device limit blocks lead list access too', async () => {
  const creds = await signInAsUsername(proUsername, proPassword);
  const r = await api('/api/leads', { token: creds.idToken, headers: { 'x-device-id': 'dev-four' } });
  assert.equal(r.status, 403);
  assert.equal(r.json.code, 'DEVICE_LIMIT');
});
