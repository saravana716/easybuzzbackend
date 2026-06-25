const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, getDocs, doc, getDoc } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyCIQTnZkvfiQEW1SsMygTqnGaN3Yj4lrFM",
  authDomain: "srikalyanijewellery-chitfund.firebaseapp.com",
  projectId: "srikalyanijewellery-chitfund",
  storageBucket: "srikalyanijewellery-chitfund.firebasestorage.app",
  messagingSenderId: "966692060880",
  appId: "1:966692060880:web:284f7db94cb86ca475a8d5"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
  // Query all transactions to see recent attempts
  const txnsSnap = await getDocs(collection(db, 'transactions'));
  console.log(`Found ${txnsSnap.size} total transactions in transactions collection:`);
  
  const txns = [];
  txnsSnap.forEach(doc => {
    txns.push({
      id: doc.id,
      amount: doc.data().amount,
      status: doc.data().status,
      udf1: doc.data().udf1,
      udf7: doc.data().udf7,
      error: doc.data().error || null,
      createdAt: doc.data().createdAt ? doc.data().createdAt.toDate() : null,
      updatedAt: doc.data().updatedAt ? (doc.data().updatedAt.toDate ? doc.data().updatedAt.toDate() : doc.data().updatedAt) : null
    });
  });

  // Sort by date desc
  txns.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  txns.slice(0, 10).forEach(t => {
    console.log(JSON.stringify(t, null, 2));
  });

  // Check specific scheme customer and plan purchase documents
  const customerSnap = await getDoc(doc(db, 'customers', 'VH4ifm6zxrKYcV2S36VN'));
  if (customerSnap.exists()) {
    console.log("Customer doc:", customerSnap.id, customerSnap.data());
  } else {
    console.log("Customer doc VH4ifm6zxrKYcV2S36VN not found");
  }

  const purchaseSnap = await getDoc(doc(db, 'planPurchases', 'VH4ifm6zxrKYcV2S36VN'));
  if (purchaseSnap.exists()) {
    console.log("Purchase doc:", purchaseSnap.id, purchaseSnap.data());
  } else {
    console.log("Purchase doc VH4ifm6zxrKYcV2S36VN not found");
  }

  // Query installments for this plan
  const instSnap = await getDocs(collection(db, 'installments'));
  console.log(`Found ${instSnap.size} total installments in database:`);
  instSnap.forEach(d => {
    if (d.data().planId === 'VH4ifm6zxrKYcV2S36VN') {
      console.log('Matching installment:', d.id, d.data());
    }
  });
}

run().catch(console.error);
