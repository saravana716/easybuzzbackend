const admin = require('firebase-admin');
require('dotenv').config();

if (!admin.apps.length) {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
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
}

const db = admin.firestore();

module.exports = {
  admin,
  db
};
