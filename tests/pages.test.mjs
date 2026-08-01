import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BASE_URL } from './helpers.mjs';

async function getHtml(pathname) {
  const res = await fetch(`${BASE_URL}${pathname}`, {
    headers: { 'User-Agent': 'leadflu-test' },
  });
  const text = await res.text();
  return { status: res.status, text };
}

test('home page renders', async () => {
  const { status, text } = await getHtml('/');
  assert.equal(status, 200);
  assert.match(text, /<html/i);
});

test('search page renders', async () => {
  const { status } = await getHtml('/search');
  assert.equal(status, 200);
});

test('saved page renders', async () => {
  const { status } = await getHtml('/saved');
  assert.equal(status, 200);
});

test('profile page renders', async () => {
  const { status } = await getHtml('/profile');
  assert.equal(status, 200);
});

test('admin page renders', async () => {
  const { status } = await getHtml('/admin');
  assert.equal(status, 200);
});

test('lead detail page renders for unknown id', async () => {
  const { status } = await getHtml('/lead/does-not-exist');
  assert.equal(status, 200);
});
