import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import admin from 'firebase-admin';

const envPath = resolve(process.cwd(), '.env.local');
const env = readFileSync(envPath, 'utf8');

function getEnv(key) {
  const line = env.split(/\r?\n/).find((l) => l.startsWith(`${key}=`));
  if (!line) return null;
  let value = line.slice(key.length + 1);
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1);
  }
  return value;
}

const serviceAccount = JSON.parse(getEnv('FIREBASE_SERVICE_ACCOUNT'));

if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

const auth = admin.auth();
const db = admin.firestore();

const USERNAME_DOMAIN = '@leadflu.app';
const PRO_DURATION_MS = 30 * 24 * 60 * 60 * 1000;

const accounts = [
  { username: 'adminleadflu', password: 'NiteshK@1209', name: 'Admin', role: 'Admin', plan: 'PRO', expiryDate: null },
  { username: 'testpro', password: 'TestPro@123', name: 'Test Pro', role: 'Guest', plan: 'PRO', expiryDate: Date.now() + PRO_DURATION_MS },
  { username: 'testfree', password: 'TestFree@123', name: 'Test Free', role: 'Guest', plan: 'FREE', expiryDate: null },
];

for (const acc of accounts) {
  const email = `${acc.username}${USERNAME_DOMAIN}`;
  let uid;
  try {
    const existing = await auth.getUserByEmail(email);
    uid = existing.uid;
    await auth.updateUser(uid, { password: acc.password, displayName: acc.name });
    console.log(`UPDATED  ${acc.username}`);
  } catch {
    const created = await auth.createUser({ email, password: acc.password, displayName: acc.name });
    uid = created.uid;
    console.log(`CREATED  ${acc.username}`);
  }
  await db.collection('users').doc(uid).set(
    {
      username: acc.username,
      name: acc.name,
      role: acc.role,
      plan: acc.plan,
      expiryDate: acc.expiryDate,
      createdAt: Date.now(),
    },
    { merge: true }
  );
  console.log(`         ${email} -> ${acc.role} / ${acc.plan}${acc.expiryDate ? ` (expires ${new Date(acc.expiryDate).toISOString()})` : ''}`);
}

console.log('Done.');
