const admin = require('firebase-admin');
require('dotenv').config();

if (!admin.apps.length) {
  console.log('--- Firebase Admin Init Debugging ---');
  console.log('Environment variable keys:', Object.keys(process.env));
  console.log('FIREBASE_SERVICE_ACCOUNT exists:', !!process.env.FIREBASE_SERVICE_ACCOUNT);
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    console.log('FIREBASE_SERVICE_ACCOUNT length:', process.env.FIREBASE_SERVICE_ACCOUNT.length);
    try {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      console.log('Firebase Admin SDK initialized successfully using environment variable.');
    } catch (error) {
      console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT env variable:', error);
      admin.initializeApp();
    }
  } else {
    try {
      const serviceAccount = require('../../serviceAccountKey.json');
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      console.log('Firebase Admin SDK initialized successfully using local serviceAccountKey.json.');
    } catch (error) {
      console.warn('FIREBASE_SERVICE_ACCOUNT env variable not set and local serviceAccountKey.json not found. Initializing with defaults.');
      admin.initializeApp();
    }
  }
  console.log('-------------------------------------');
}

const db = admin.firestore();

module.exports = {
  admin,
  db
};
