const { initializeApp } = require('firebase/app');
const { getFirestore } = require('firebase/firestore');
require('dotenv').config();

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || "AIzaSyCIQTnZkvfiQEW1SsMygTqnGaN3Yj4lrFM",
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || "srikalyanijewellery-chitfund.firebaseapp.com",
  projectId: process.env.FIREBASE_PROJECT_ID || "srikalyanijewellery-chitfund",
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "srikalyanijewellery-chitfund.firebasestorage.app",
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "966692060880",
  appId: process.env.FIREBASE_APP_ID || "1:966692060880:web:284f7db94cb86ca475a8d5"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

module.exports = { db };
