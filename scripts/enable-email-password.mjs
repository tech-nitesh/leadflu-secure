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

const credential = admin.credential.cert(serviceAccount);
const { access_token: accessToken } = await credential.getAccessToken();

const projectId = serviceAccount.project_id;
const url = `https://identitytoolkit.googleapis.com/admin/v2/projects/${projectId}/config?updateMask=signIn.email.enabled`;

const res = await fetch(url, {
  method: 'PATCH',
  headers: {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ signIn: { email: { enabled: true } } }),
});

const text = await res.text();
console.log(`STATUS: ${res.status}`);
console.log(text || '(empty body)');
