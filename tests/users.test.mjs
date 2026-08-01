import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import {
  api,
  adminLogin,
  signInAsUsername,
  createFixtureUser,
  deleteFixtureUser,
  randomSuffix,
} from './helpers.mjs';

const suffix = randomSuffix();
const username = `tuser${suffix}`;
const password = 'TestPass123';

let adminToken;
let adminUid;
let freeUid;
let createdUid;

before(async () => {
  const a = await adminLogin();
  adminToken = a.idToken;
  adminUid = a.uid;
  const free = await createFixtureUser({ username: `tbase${suffix}`, password, plan: 'FREE' });
  freeUid = free.uid;
});

after(async () => {
  await deleteFixtureUser(freeUid);
  if (createdUid) await deleteFixtureUser(createdUid);
});

test('GET /api/admin/users requires admin token', async () => {
  const { status } = await api('/api/admin/users');
  assert.equal(status, 401);
});

test('non-admin cannot list users', async () => {
  const creds = await signInAsUsername(`tbase${suffix}`, password);
  const { status } = await api('/api/admin/users', { token: creds.idToken });
  assert.equal(status, 403);
});

test('admin can list users', async () => {
  const { status, json } = await api('/api/admin/users', { token: adminToken });
  assert.equal(status, 200);
  assert.ok(Array.isArray(json.users));
  assert.ok(json.users.some((u) => u.role === 'Admin'), 'admin should be in the list');
});

test('admin can create a FREE user', async () => {
  const { status, json } = await api('/api/admin/users', {
    method: 'POST',
    token: adminToken,
    body: { username, password, name: 'Test User' },
  });
  assert.equal(status, 201);
  assert.equal(json.user.plan, 'FREE');
  assert.equal(json.user.role, 'Guest');
  createdUid = json.user.id || json.user.uid;
});

test('created user can log in', async () => {
  const creds = await signInAsUsername(username, password);
  assert.equal(creds.uid, createdUid);
});

test('duplicate username returns 409', async () => {
  const { status, json } = await api('/api/admin/users', {
    method: 'POST',
    token: adminToken,
    body: { username, password, name: 'Duplicate' },
  });
  assert.equal(status, 409);
  assert.match(json.error, /already/i);
});

test('invalid username returns 400', async () => {
  const { status } = await api('/api/admin/users', {
    method: 'POST',
    token: adminToken,
    body: { username: 'ab', password, name: 'X' },
  });
  assert.equal(status, 400);
});

test('short password returns 400', async () => {
  const { status } = await api('/api/admin/users', {
    method: 'POST',
    token: adminToken,
    body: { username: `tshort${suffix}`, password: '123', name: 'X' },
  });
  assert.equal(status, 400);
});

test('non-admin cannot create users', async () => {
  const creds = await signInAsUsername(`tbase${suffix}`, password);
  const { status } = await api('/api/admin/users', {
    method: 'POST',
    token: creds.idToken,
    body: { username: `tforbid${suffix}`, password, name: 'X' },
  });
  assert.equal(status, 403);
});

test('admin can upgrade a user to PRO (sets expiry)', async () => {
  const { status, json } = await api(`/api/admin/users/${createdUid}`, {
    method: 'PUT',
    token: adminToken,
    body: { plan: 'PRO' },
  });
  assert.equal(status, 200);
  assert.equal(json.user.plan, 'PRO');
  assert.ok(typeof json.user.expiryDate === 'number', 'PRO upgrade should set an expiry date');
});

test('admin can renew PRO (extends expiry)', async () => {
  const first = await api(`/api/admin/users/${createdUid}`, {
    method: 'PUT',
    token: adminToken,
    body: { renew: true },
  });
  assert.equal(first.status, 200);
  const second = await api(`/api/admin/users/${createdUid}`, {
    method: 'PUT',
    token: adminToken,
    body: { renew: true },
  });
  assert.equal(second.status, 200);
  assert.ok(second.json.user.expiryDate > first.json.user.expiryDate, 'renew should extend expiry');
});

test('admin can downgrade a user to FREE', async () => {
  const { status, json } = await api(`/api/admin/users/${createdUid}`, {
    method: 'PUT',
    token: adminToken,
    body: { plan: 'FREE' },
  });
  assert.equal(status, 200);
  assert.equal(json.user.plan, 'FREE');
  assert.equal(json.user.expiryDate, null);
});

test('admin cannot downgrade their own account', async () => {
  const { status, json } = await api(`/api/admin/users/${adminUid}`, {
    method: 'PUT',
    token: adminToken,
    body: { plan: 'FREE' },
  });
  assert.equal(status, 400);
  assert.match(json.error, /own/i);
});

test('updating an unknown user returns 404', async () => {
  const { status } = await api('/api/admin/users/does-not-exist', {
    method: 'PUT',
    token: adminToken,
    body: { name: 'X' },
  });
  assert.equal(status, 404);
});

test('admin cannot delete their own account', async () => {
  const { status } = await api(`/api/admin/users/${adminUid}`, {
    method: 'DELETE',
    token: adminToken,
  });
  assert.equal(status, 400);
});

test('admin can delete another user', async () => {
  const del = await api(`/api/admin/users/${createdUid}`, {
    method: 'DELETE',
    token: adminToken,
  });
  assert.equal(del.status, 200);
  assert.equal(del.json.success, true);
  createdUid = null;
});

test('deleting an unknown user returns 404', async () => {
  const { status } = await api('/api/admin/users/does-not-exist', {
    method: 'DELETE',
    token: adminToken,
  });
  assert.equal(status, 404);
});

test('non-admin cannot delete users', async () => {
  const creds = await signInAsUsername(`tbase${suffix}`, password);
  const { status } = await api(`/api/admin/users/${freeUid}`, {
    method: 'DELETE',
    token: creds.idToken,
  });
  assert.equal(status, 403);
});
