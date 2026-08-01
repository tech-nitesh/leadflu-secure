import admin from 'firebase-admin';

let app: admin.app.App | null = null;
let configured = false;

try {
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (serviceAccountJson) {
    const serviceAccount = JSON.parse(serviceAccountJson);
    app = admin.apps?.[0] || admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    configured = true;
  } else {
    const legacy = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (legacy) {
      app = admin.apps?.[0] || admin.initializeApp();
      configured = true;
    }
  }
} catch (error) {
  console.error('Failed to initialize Firebase Admin:', error);
}

const firestoreInstance = app && configured ? admin.firestore(app) : null;
if (firestoreInstance) {
  try {
    firestoreInstance.settings({ ignoreUndefinedProperties: true });
  } catch (error) {
    console.error('Failed to configure Firestore settings:', error);
  }
}

export const adminApp = app;
export const isServerConfigured = configured;
export const adminDb = firestoreInstance;
export const adminAuth = app && configured ? admin.auth(app) : null;
