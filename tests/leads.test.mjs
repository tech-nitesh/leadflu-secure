import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import {
  api,
  adminLogin,
  signInAsUsername,
  createFixtureUser,
  deleteFixtureUser,
  deleteLeadById,
  makeLead,
  randomSuffix,
} from './helpers.mjs';

const suffix = randomSuffix();
const freeUsername = `lleadfree${suffix}`;
const proUsername = `lleadpro${suffix}`;
const password = 'TestPass123';

let adminToken;
let freeUid;
let proUid;
let freeToken;
let proToken;
const createdLeadIds = [];

before(async () => {
  const a = await adminLogin();
  adminToken = a.idToken;
  const free = await createFixtureUser({ username: freeUsername, password, plan: 'FREE' });
  const pro = await createFixtureUser({ username: proUsername, password, plan: 'PRO' });
  freeUid = free.uid;
  proUid = pro.uid;
  freeToken = (await signInAsUsername(freeUsername, password)).idToken;
  proToken = (await signInAsUsername(proUsername, password)).idToken;
});

after(async () => {
  for (const id of createdLeadIds) await deleteLeadById(id);
  await deleteFixtureUser(freeUid);
  await deleteFixtureUser(proUid);
});

test('admin creates a lead (FREE access)', async () => {
  const { status, json } = await api('/api/leads', {
    method: 'POST',
    token: adminToken,
    body: makeLead({ accessType: 'FREE' }),
  });
  assert.equal(status, 201);
  assert.ok(json.lead?.id);
  assert.ok(typeof json.lead.deadline === 'number', 'deadline should persist');
  createdLeadIds.push(json.lead.id);
});

test('admin creates a lead with PRO access and custom deadline', async () => {
  const deadline = Date.now() + 3 * 24 * 60 * 60 * 1000;
  const { status, json } = await api('/api/leads', {
    method: 'POST',
    token: adminToken,
    body: makeLead({ accessType: 'PRO', deadline }),
  });
  assert.equal(status, 201);
  assert.equal(json.lead.deadline, deadline);
  createdLeadIds.push(json.lead.id);
});

test('creating a lead requires admin token', async () => {
  const { status } = await api('/api/leads', { method: 'POST', body: makeLead() });
  assert.equal(status, 401);
});

test('free user cannot create a lead', async () => {
  const { status } = await api('/api/leads', {
    method: 'POST',
    token: freeToken,
    body: makeLead(),
  });
  assert.equal(status, 403);
});

test('admin cannot create a lead with a too-short title', async () => {
  const { status, json } = await api('/api/leads', {
    method: 'POST',
    token: adminToken,
    body: makeLead({ title: 'x' }),
  });
  assert.equal(status, 400);
  assert.ok(json.error);
});

test('admin cannot create a lead with a bad email', async () => {
  const { status } = await api('/api/leads', {
    method: 'POST',
    token: adminToken,
    body: makeLead({ contactDetails: { email: 'not-an-email' } }),
  });
  assert.equal(status, 400);
});

test('FREE-access lead contact is visible to guests', async () => {
  const lead = await createLeadFor('FREE');
  const { status, json } = await api('/api/leads');
  assert.equal(status, 200);
  const found = json.leads.find((l) => l.id === lead.id);
  assert.ok(found, 'created lead should appear in the public list');
  assert.equal(found.contactDetails.email, lead.contactDetails.email);
});

test('PRO-access lead contact is masked for guests', async () => {
  const lead = await createLeadFor('PRO');
  const { status, json } = await api('/api/leads');
  assert.equal(status, 200);
  const found = json.leads.find((l) => l.id === lead.id);
  assert.ok(found);
  assert.match(found.contactDetails.email, /•/, 'email should be masked');
});

test('PRO-access lead contact is masked for free users', async () => {
  const lead = await createLeadFor('PRO');
  const { status, json } = await api('/api/leads', { token: freeToken });
  const found = json.leads.find((l) => l.id === lead.id);
  assert.ok(found);
  assert.match(found.contactDetails.email, /•/);
});

test('PRO-access lead contact is visible to PRO users', async () => {
  const lead = await createLeadFor('PRO');
  const { status, json } = await api('/api/leads', { token: proToken });
  const found = json.leads.find((l) => l.id === lead.id);
  assert.ok(found);
  assert.equal(found.contactDetails.email, lead.contactDetails.email);
});

test('PRO-access lead contact is visible to admins', async () => {
  const lead = await createLeadFor('PRO');
  const { status, json } = await api('/api/leads', { token: adminToken });
  const found = json.leads.find((l) => l.id === lead.id);
  assert.ok(found);
  assert.equal(found.contactDetails.email, lead.contactDetails.email);
});

test('GET /api/leads/[id] masks for free user and reveals for admin', async () => {
  const lead = await createLeadFor('PRO');
  const asFree = await api(`/api/leads/${lead.id}`, { token: freeToken });
  assert.equal(asFree.status, 200);
  assert.match(asFree.json.lead.contactDetails.email, /•/);

  const asAdmin = await api(`/api/leads/${lead.id}`, { token: adminToken });
  assert.equal(asAdmin.json.lead.contactDetails.email, lead.contactDetails.email);
});

test('GET /api/leads/[id] returns 404 for unknown id', async () => {
  const { status } = await api('/api/leads/does-not-exist');
  assert.equal(status, 404);
});

test('admin can edit a lead', async () => {
  const lead = await createLeadFor('FREE');
  const { status, json } = await api(`/api/leads/${lead.id}`, {
    method: 'PUT',
    token: adminToken,
    body: { title: `Renamed ${suffix}` },
  });
  assert.equal(status, 200);
  assert.equal(json.lead.title, `Renamed ${suffix}`);
  assert.equal(json.lead.id, lead.id);
});

test('non-admin cannot edit a lead', async () => {
  const lead = await createLeadFor('FREE');
  const { status } = await api(`/api/leads/${lead.id}`, {
    method: 'PUT',
    token: freeToken,
    body: { title: 'Hijacked' },
  });
  assert.equal(status, 403);
});

test('editing an unknown lead returns 404', async () => {
  const { status } = await api('/api/leads/does-not-exist', {
    method: 'PUT',
    token: adminToken,
    body: { title: 'Nope' },
  });
  assert.equal(status, 404);
});

test('admin can delete a lead', async () => {
  const lead = await createLeadFor('FREE');
  const del = await api(`/api/leads/${lead.id}`, { method: 'DELETE', token: adminToken });
  assert.equal(del.status, 200);
  assert.equal(del.json.success, true);
  const after = await api(`/api/leads/${lead.id}`);
  assert.equal(after.status, 404);
});

test('non-admin cannot delete a lead', async () => {
  const lead = await createLeadFor('FREE');
  const { status } = await api(`/api/leads/${lead.id}`, {
    method: 'DELETE',
    token: proToken,
  });
  assert.equal(status, 403);
  await deleteLeadById(lead.id);
});

test('deleting an unknown lead returns 404', async () => {
  const { status } = await api('/api/leads/does-not-exist', { method: 'DELETE', token: adminToken });
  assert.equal(status, 404);
});

async function createLeadFor(accessType) {
  const { status, json } = await api('/api/leads', {
    method: 'POST',
    token: adminToken,
    body: makeLead({ accessType }),
  });
  assert.equal(status, 201, `creating ${accessType} lead should succeed`);
  createdLeadIds.push(json.lead.id);
  return json.lead;
}
