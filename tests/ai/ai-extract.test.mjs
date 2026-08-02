import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import {
  api,
  adminLogin,
  signInAsUsername,
  createFixtureUser,
  deleteFixtureUser,
  randomSuffix,
} from '../helpers.mjs';

const suffix = randomSuffix();
const freeUsername = `taifree${suffix}`;
const password = 'TestPass123';

let adminToken;
let freeUid;
let freeToken;

before(async () => {
  const a = await adminLogin();
  adminToken = a.idToken;
  const free = await createFixtureUser({ username: freeUsername, password, plan: 'FREE' });
  freeUid = free.uid;
  freeToken = (await signInAsUsername(freeUsername, password)).idToken;
});

after(async () => {
  await deleteFixtureUser(freeUid);
});

test('AI extracts a full lead from a rich message', async () => {
  const { status, json } = await api('/api/leads/ai-extract', {
    method: 'POST',
    token: adminToken,
    body: {
      message:
        'Hi, we run a YouTube channel about cooking and need an editor for daily shorts. We pay $150 per video. Contact editor.jobs@example.com or WhatsApp +91 98765 43210. Website: example.com/jobs',
    },
  });
  assert.equal(status, 200, `unexpected status: ${JSON.stringify(json)}`);
  assert.equal(typeof json.title, 'string');
  assert.ok(json.title.length >= 5);
  assert.equal(typeof json.description, 'string');
  assert.ok(json.description.length >= 10);
  assert.equal(typeof json.budgetNumeric, 'number');
  assert.equal(typeof json.budgetString, 'string');
  assert.ok(['YouTube', 'Instagram', 'TikTok', 'Podcast', 'Corporate', 'Other'].includes(json.platform));
  assert.ok(['Shorts', 'Long Form', 'Vlog', 'Documentary', 'Commercial', 'Other'].includes(json.category));
  assert.equal(json.contactEmail, 'editor.jobs@example.com');
});

test('AI extracts WhatsApp number and website link', async () => {
  const { status, json } = await api('/api/leads/ai-extract', {
    method: 'POST',
    token: adminToken,
    body: {
      message:
        'Podcast editor needed. Call me on +91 98765 43210 or see details at https://podjobs.example.com/apply',
    },
  });
  assert.equal(status, 200, `unexpected status: ${JSON.stringify(json)}`);
  assert.equal(json.contactWhatsapp, '+91 98765 43210');
  assert.ok(
    (json.website || '').includes('podjobs.example.com'),
    `expected website extracted, got: ${json.website}`
  );
});

test('AI does NOT fail on a message without a budget (leaves it empty)', async () => {
  const { status, json } = await api('/api/leads/ai-extract', {
    method: 'POST',
    token: adminToken,
    body: { message: 'Hello, I run a podcast and need an editor for weekly episodes. Reach me at hi@podcast.example.com' },
  });
  assert.equal(status, 200, `unexpected status: ${JSON.stringify(json)}`);
  assert.ok(json.budgetNumeric === undefined || json.budgetNumeric === null, 'missing budget should not be forced to a value');
  assert.ok(json.title && json.description, 'should still return title and description');
});

test('AI fills sensible defaults from the message when fields are missing', async () => {
  const { status, json } = await api('/api/leads/ai-extract', {
    method: 'POST',
    token: adminToken,
    body: { message: 'need an editor for my Instagram reels, pay whatever, dm me' },
  });
  assert.equal(status, 200, `unexpected status: ${JSON.stringify(json)}`);
  assert.ok(json.title.length >= 5);
  assert.ok(json.description.length >= 10);
});

test('AI extraction requires admin token', async () => {
  const { status } = await api('/api/leads/ai-extract', {
    method: 'POST',
    body: { message: 'some message here' },
  });
  assert.equal(status, 401);
});

test('free user cannot use AI extraction', async () => {
  const { status } = await api('/api/leads/ai-extract', {
    method: 'POST',
    token: freeToken,
    body: { message: 'some message here' },
  });
  assert.equal(status, 403);
});

test('AI extraction rejects an empty message', async () => {
  const { status } = await api('/api/leads/ai-extract', {
    method: 'POST',
    token: adminToken,
    body: { message: '   ' },
  });
  assert.equal(status, 400);
});

// Validated by starting the server with AI_PROVIDER_FORCE=groq and TEST_GROQ=1:
//   $env:AI_PROVIDER_FORCE='groq'; $env:TEST_GROQ='1'; npx next dev
// then: node --test --test-name-pattern="Groq fallback" tests/ai-extract.test.mjs
test('AI falls back to Groq when Gemini is unavailable', { skip: !process.env.TEST_GROQ }, async () => {
  const { status, json } = await api('/api/leads/ai-extract', {
    method: 'POST',
    token: adminToken,
    body: {
      message: 'Need a video editor for my YouTube channel, long form videos, budget $400, contact hire@example.com',
    },
  });
  assert.equal(status, 200, `unexpected status: ${JSON.stringify(json)}`);
  assert.equal(json.provider, 'groq', 'expected the Groq provider to be used');
  assert.ok(json.title && json.description, 'expected title and description');
  assert.equal(typeof json.budgetNumeric, 'number');
});

// Keep this LAST: it trips the 15/min rate limit for this endpoint, which
// persists for 60s. Run as the final test so it cannot break the tests above.
test('AI extraction rate-limits after 15 requests in a minute', async () => {
  let got429 = false;
  for (let i = 0; i < 20 && !got429; i++) {
    const { status } = await api('/api/leads/ai-extract', {
      method: 'POST',
      body: { message: 'no token needed to count a hit' },
    });
    if (status === 429) got429 = true;
  }
  assert.equal(got429, true, 'expected a 429 rate-limit response after 15 requests');
});
