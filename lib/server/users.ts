import { adminAuth, adminDb } from './firebase-admin';
import { Plan, Role } from '@/lib/types';

const USERS_COLLECTION = 'users';

export const PRO_DURATION_MS = 30 * 24 * 60 * 60 * 1000;

function getAuth() {
  if (!adminAuth) {
    throw new Error('Server auth is not configured. Set FIREBASE_SERVICE_ACCOUNT.');
  }
  return adminAuth;
}

function getDb() {
  if (!adminDb) {
    throw new Error('Server storage is not configured. Set FIREBASE_SERVICE_ACCOUNT.');
  }
  return adminDb;
}

export interface AdminUser {
  id: string;
  username: string;
  name: string | null;
  role: Role;
  plan: Plan;
  expiryDate: number | null;
  createdAt: number;
}

export function usernameToEmail(username: string): string {
  return `${username.trim().toLowerCase()}@leadflu.app`;
}

function toAdminUser(doc: any, id: string): AdminUser {
  return {
    id,
    username: doc.username || '',
    name: doc.name || null,
    role: doc.role === 'Admin' ? 'Admin' : 'Guest',
    plan: doc.plan === 'PRO' ? 'PRO' : 'FREE',
    expiryDate: doc.expiryDate || null,
    createdAt: doc.createdAt || 0,
  };
}

export async function listUsers(): Promise<AdminUser[]> {
  const snapshot = await getDb().collection(USERS_COLLECTION).orderBy('createdAt', 'desc').get();
  const users: AdminUser[] = [];
  snapshot.forEach((doc) => {
    users.push(toAdminUser(doc.data(), doc.id));
  });
  return users;
}

export async function createUser(input: {
  username: string;
  password: string;
  name?: string;
  plan: Plan;
}): Promise<AdminUser> {
  const auth = getAuth();
  const db = getDb();

  const username = input.username.trim().toLowerCase();
  const userRecord = await auth.createUser({
    email: usernameToEmail(username),
    password: input.password,
    displayName: input.name?.trim() || username,
  });

  const docData = {
    username,
    name: input.name?.trim() || username,
    role: 'Guest' as Role,
    plan: input.plan,
    expiryDate: input.plan === 'PRO' ? Date.now() + PRO_DURATION_MS : null,
    createdAt: Date.now(),
  };

  await db.collection(USERS_COLLECTION).doc(userRecord.uid).set(docData);
  return toAdminUser(docData, userRecord.uid);
}

export async function updateUser(
  id: string,
  updates: { plan?: Plan; name?: string }
): Promise<AdminUser | null> {
  const db = getDb();
  const docRef = db.collection(USERS_COLLECTION).doc(id);
  const doc = await docRef.get();
  if (!doc.exists) return null;

  const existing = doc.data() || {};
  const patch: any = {};

  if (updates.name !== undefined) {
    patch.name = updates.name.trim() || existing.username || '';
  }

  if (updates.plan) {
    patch.plan = updates.plan;
    if (updates.plan === 'PRO') {
      patch.expiryDate = Date.now() + PRO_DURATION_MS;
    } else {
      patch.expiryDate = null;
    }
  }

  await docRef.set(patch, { merge: true });

  if (updates.name !== undefined && adminAuth) {
    await adminAuth.updateUser(id, { displayName: patch.name }).catch(() => {});
  }

  return toAdminUser({ ...existing, ...patch }, id);
}

export async function renewPro(id: string): Promise<AdminUser | null> {
  const db = getDb();
  const docRef = db.collection(USERS_COLLECTION).doc(id);
  const doc = await docRef.get();
  if (!doc.exists) return null;

  const existing = doc.data() || {};
  const base = typeof existing.expiryDate === 'number' && existing.expiryDate > Date.now()
    ? existing.expiryDate
    : Date.now();
  const expiryDate = base + PRO_DURATION_MS;

  await docRef.set({ plan: 'PRO', expiryDate }, { merge: true });
  return toAdminUser({ ...existing, plan: 'PRO', expiryDate }, id);
}

export async function deleteUser(id: string): Promise<boolean> {
  const auth = getAuth();
  const db = getDb();
  const doc = await db.collection(USERS_COLLECTION).doc(id).get();
  if (!doc.exists) return false;
  await db.collection(USERS_COLLECTION).doc(id).delete();
  await auth.deleteUser(id).catch(() => {});
  return true;
}
