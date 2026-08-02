import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import admin from 'firebase-admin';

// Copies the REAL database into the STAGING database.
// - Leads: ALL copied (same ids, overwrites on re-run).
// - Users: ALL copied EXCEPT the real user vikesh2003.
// Real passwords cannot be exported from Firebase. So every copied account is
// recreated in staging auth with a known password:
//   - the three test accounts keep their real test passwords,
//   - everyone else gets the staging-only placeholder "Staging@123".
// Production is READ-ONLY here. Only staging is written.
// Run from the project root:  node scripts/copy-db-to-staging.mjs

function readEnvFile(filename) {
  const path = resolve(process.cwd(), filename);
  const env = readFileSync(path, 'utf8');
  const map = {};
  for (const line of env.split(/\r?\n/)) {
    const eq = line.indexOf('=');
    if (eq <= 0) continue;
    let value = line.slice(eq + 1);
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    map[line.slice(0, eq)] = value;
  }
  return map;
}

const prodEnv = readEnvFile('.env.local');
const stagingEnv = readEnvFile('.env.staging');

if (!prodEnv.FIREBASE_SERVICE_ACCOUNT) throw new Error('.env.local has no FIREBASE_SERVICE_ACCOUNT');
if (!stagingEnv.FIREBASE_SERVICE_ACCOUNT) throw new Error('.env.staging has no FIREBASE_SERVICE_ACCOUNT');

const prodApp = admin.initializeApp(
  { credential: admin.credential.cert(JSON.parse(prodEnv.FIREBASE_SERVICE_ACCOUNT)) },
  'copy-prod'
);
const stagingApp = admin.initializeApp(
  { credential: admin.credential.cert(JSON.parse(stagingEnv.FIREBASE_SERVICE_ACCOUNT)) },
  'copy-staging'
);

const prodDb = admin.firestore(prodApp);
const stagingDb = admin.firestore(stagingApp);
const prodAuth = admin.auth(prodApp);
const stagingAuth = admin.auth(stagingApp);

const USERNAME_DOMAIN = '@leadflu.app';
const SKIP_USERNAME = 'vikesh2003';
const SKIP_EMAIL = 'vikesh2003@leadflu.app';
const KNOWN_PASSWORDS = {
  adminleadflu: 'NiteshK@1209',
  testpro: 'TestPro@123',
  testfree: 'TestFree@123',
};
const PLACEHOLDER_PASSWORD = 'Staging@123';

console.log('--- Leads ---');
const prodLeads = await prodDb.collection('leads').get();
let leadCount = 0;
for (const doc of prodLeads.docs) {
  await stagingDb.collection('leads').doc(doc.id).set(doc.data());
  leadCount++;
}
console.log(`Copied ${leadCount} lead(s) to staging (same ids, re-run overwrites).`);

console.log('--- Users ---');
const prodUsers = await prodDb.collection('users').get();
let userCount = 0;
for (const doc of prodUsers.docs) {
  const data = doc.data();
  let email = data.email || null;
  if (!email) {
    try {
      const rec = await prodAuth.getUser(doc.id);
      email = rec.email || null;
    } catch {
      email = null;
    }
  }

  if (data.username === SKIP_USERNAME || email === SKIP_EMAIL) {
    console.log(`SKIP ${email || data.username} (real user, as requested)`);
    continue;
  }

  const username = data.username || null;
  const knownPassword = username ? KNOWN_PASSWORDS[username] : null;
  const password = knownPassword || PLACEHOLDER_PASSWORD;
  const isPlaceholder = !knownPassword;

  let uid = null;
  if (email) {
    try {
      const existing = await stagingAuth.getUserByEmail(email);
      uid = existing.uid;
      await stagingAuth.updateUser(uid, { password, displayName: data.name || username || '' });
      console.log(`UPDATED ${email}${isPlaceholder ? ' (staging placeholder password)' : ''}`);
    } catch {
      const created = await stagingAuth.createUser({
        email,
        password,
        displayName: data.name || username || '',
      });
      uid = created.uid;
      console.log(`CREATED ${email}${isPlaceholder ? ' (staging placeholder password)' : ''}`);
    }
  } else {
    uid = doc.id;
    console.log(`COPIED-DOC (no auth record) ${doc.id}`);
  }

  await stagingDb.collection('users').doc(uid).set(data, { merge: true });
  console.log(`  -> ${username ?? '(no username)'} | ${data.role} / ${data.plan}${data.expiryDate ? ` (expires ${new Date(data.expiryDate).toISOString()})` : ''}`);
  userCount++;
}
console.log(`Copied ${userCount} user(s) to staging (vikesh2003 excluded).`);

console.log('--- Staging logins ---');
for (const username of ['adminleadflu', 'testpro', 'testfree']) {
  console.log(`  ${username} / ${KNOWN_PASSWORDS[username]}`);
}
console.log(`  other copied accounts / ${PLACEHOLDER_PASSWORD} (staging only)`);

await prodApp.delete();
await stagingApp.delete();
console.log('Done. Production untouched; only staging was written.');
