const axios = require('axios');
const config = require('../config/easebuzz');
const { db } = require('../config/firebase');
const { generateInitiateHash, verifyResponseHash } = require('../utils/hash');

function formatAmount(amount) {
  const numericAmount = Number(amount);
  if (Number.isNaN(numericAmount) || numericAmount <= 0) {
    throw new Error('Amount must be a positive number');
  }

  return numericAmount.toFixed(2);
}

function buildPaymentPayload(input) {
  const payload = {
    key: config.key,
    txnid: input.txnid,
    amount: formatAmount(input.amount),
    productinfo: input.productinfo,
    firstname: input.firstname,
    email: input.email,
    phone: String(input.phone).replace(/\D/g, '').slice(-10),
    surl: input.surl || `${config.appBaseUrl}/api/payment/success`,
    furl: input.furl || `${config.appBaseUrl}/api/payment/failure`,
    udf1: input.udf1 || '',
    udf2: input.udf2 || '',
    udf3: input.udf3 || '',
    udf4: input.udf4 || '',
    udf5: input.udf5 || '',
    udf6: input.udf6 || '',
    udf7: input.udf7 || '',
    udf8: input.udf8 || '',
    udf9: input.udf9 || '',
    udf10: input.udf10 || '',
  };

  if (input.show_payment_mode) {
    payload.show_payment_mode = input.show_payment_mode;
  } else if (config.defaultPaymentModes) {
    payload.show_payment_mode = config.defaultPaymentModes;
  }

  if (!/^\d{10}$/.test(payload.phone)) {
    throw new Error('Phone must be a valid 10-digit number');
  }

  payload.hash = generateInitiateHash(payload, config.salt);
  return payload;
}

async function initiatePayment(input) {
  const payload = buildPaymentPayload(input);
  const url = `${config.baseUrl}payment/initiateLink`;

  // Debug logging to isolate hash mismatch root cause
  console.log('--- Easebuzz Hash Debugging ---');
  console.log('API URL:', url);
  console.log('Config Key:', config.key);
  console.log('Config Salt:', config.salt);
  console.log('Config Env:', config.env);
  console.log('Payload Key:', payload.key);
  console.log('Payload TxnID:', payload.txnid);
  console.log('Payload Amount:', payload.amount);
  console.log('Payload ProductInfo:', payload.productinfo);
  console.log('Payload Name:', payload.firstname);
  console.log('Payload Email:', payload.email);
  console.log('Payload Phone:', payload.phone);
  console.log('Payload UDF1:', payload.udf1);
  console.log('Payload UDF2:', payload.udf2);
  console.log('Payload UDF3:', payload.udf3);
  console.log('Payload UDF4:', payload.udf4);
  console.log('Payload UDF5:', payload.udf5);
  console.log('Payload UDF6:', payload.udf6);
  console.log('Payload UDF7:', payload.udf7);
  console.log('Payload UDF8:', payload.udf8);
  console.log('Generated Hash:', payload.hash);
  console.log('--------------------------------');

  const response = await axios.post(url, new URLSearchParams(payload).toString(), {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
  });

  const result = response.data;

  if (result.status !== 1 || !result.data) {
    throw new Error(result.error_desc || result.data || 'Failed to initiate payment');
  }

  // Persist transaction to Firestore for reliability
  try {
    const { doc, setDoc, serverTimestamp } = require('firebase/firestore');
    await setDoc(doc(db, 'transactions', payload.txnid), {
      txnid: payload.txnid,
      amount: payload.amount,
      firstname: payload.firstname,
      email: payload.email,
      phone: payload.phone,
      productinfo: payload.productinfo,
      status: 'initiated',
      udf1: payload.udf1 || '',
      udf2: payload.udf2 || '',
      udf3: payload.udf3 || '',
      udf4: payload.udf4 || '',
      udf5: payload.udf5 || '',
      udf6: payload.udf6 || '',
      udf7: payload.udf7 || '',
      udf8: payload.udf8 || '',
      frontendUrl: input.frontendUrl || config.frontendUrl,
      createdAt: serverTimestamp()
    });
  } catch (fsError) {
    console.error('Firestore transaction logging failed:', fsError);
  }

  return {
    accessKey: result.data,
    paymentUrl: `${config.baseUrl}pay/${result.data}`,
    txnid: payload.txnid,
    amount: payload.amount,
    env: config.env,
  };
}

function validateCallbackResponse(responseBody) {
  if (!responseBody || typeof responseBody !== 'object') {
    return { valid: false, message: 'Empty response from Easebuzz' };
  }

  if (!verifyResponseHash(responseBody, config.salt)) {
    return { valid: false, message: 'Hash verification failed' };
  }

  return {
    valid: true,
    status: responseBody.status,
    txnid: responseBody.txnid,
    easepayid: responseBody.easepayid,
    amount: responseBody.amount,
    data: responseBody,
  };
}

async function processChitfundPayment(paymentData) {
  const { doc, getDoc, updateDoc, setDoc, collection, query, orderBy, getDocs, limit, serverTimestamp, increment } = require('firebase/firestore');

  const {
    amount,
    udf1: schemeId,
    udf2: linked_user_id,
    udf3: userName,
    udf4: mobile,
    udf5: planName,
    udf6: accountNo,
    udf7: type,
    udf8: baseAmountParam,
    txnid,
    easepayid,
    mode,
    updatedAt
  } = paymentData;

  if (!schemeId || !linked_user_id) {
    console.log('[processChitfundPayment] Missing schemeId or linked_user_id. Skipping Firestore update.');
    return;
  }

  console.log(`[processChitfundPayment] Starting secure Firestore update for transaction ${txnid}, Scheme: ${schemeId}`);

  // 1. Fetch current gold rate from Firestore
  let currentGoldRate = 0;
  const goldRateQuery = query(collection(db, 'goldRates'), orderBy('createdAt', 'desc'), limit(1));
  const goldRateSnap = await getDocs(goldRateQuery);
  if (!goldRateSnap.empty) {
    currentGoldRate = Number(goldRateSnap.docs[0].data().goldRate);
  } else {
    console.warn('[processChitfundPayment] No gold rate found in Firestore! Using 0.');
  }

  // 2. Parse amounts
  const cleanAmount = parseFloat(String(amount).replace(/[^\d.]/g, '')) || 0;
  const cleanBaseAmount = baseAmountParam
    ? parseFloat(String(baseAmountParam).replace(/[^\d.]/g, ''))
    : (cleanAmount / 1.03);

  const baseAmount = Number(cleanBaseAmount.toFixed(2));
  const weightBought = currentGoldRate > 0 ? Number((baseAmount / currentGoldRate).toFixed(3)) : 0;

  console.log(`[processChitfundPayment] Calculated: Total Paid = ₹${cleanAmount}, Base = ₹${baseAmount}, Gold Rate = ₹${currentGoldRate}/g, Weight = ${weightBought}g`);

  const schemeRef = doc(db, 'customers', schemeId);
  const snap = await getDoc(schemeRef);
  if (!snap.exists()) {
    throw new Error(`Scheme customer record with ID ${schemeId} not found in Firestore`);
  }

  const existingData = snap.data();
  // Logic: Check if it's an existing active plan
  const isInstallment = type === 'Installment' || 
                       (existingData.status === 'Active' && (existingData.paidInstallments || 0) > 0);

  const method = mode || 'Easebuzz';

  // 3. Update customers and planPurchases
  if (isInstallment) {
    const currentPaid = existingData.paidInstallments || 0;
    const isDaily = existingData.plan === 'Daily';
    const totalInstallments = isDaily ? 365 : 11;
    const nextPaidCount = currentPaid + 1;

    const updates = {
      paidInstallments: increment(1),
      lastPaymentDate: serverTimestamp(),
      paymentStatus: 'Paid',
      paymentMethod: method,
      savedWeight: increment(weightBought),
      savedAmount: increment(baseAmount)
    };

    if (existingData.status === 'Pending') {
      updates.status = 'Active';
    }

    if (nextPaidCount >= totalInstallments) {
      updates.status = 'Closed';
      updates.maturityDate = new Date().toLocaleDateString('en-GB');
    }

    await updateDoc(schemeRef, updates);
    await updateDoc(doc(db, 'planPurchases', schemeId), updates);
  } else {
    // New Scheme Join
    const joinUpdates = {
      status: 'Active',
      paymentStatus: 'Paid',
      paidInstallments: 1,
      lastPaymentDate: serverTimestamp(),
      paymentMethod: method,
      savedWeight: weightBought,
      savedAmount: baseAmount
    };

    await updateDoc(schemeRef, joinUpdates);
    await updateDoc(doc(db, 'planPurchases', schemeId), joinUpdates);
  }

  // 4. Fetch updated paidInstallments for history
  const freshSnap = await getDoc(schemeRef);
  const instNo = freshSnap.exists() ? String(freshSnap.data().paidInstallments || 1) : '1';

  // 5. Add installment record to installments collection
  const paymentHistoryRef = doc(collection(db, 'installments'));
  const dateStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-');

  const installmentData = {
    installmentNo: instNo,
    dueDate: dateStr,
    paidDate: dateStr,
    amount: `₹ ${cleanAmount.toFixed(2)}`,
    baseAmount: `₹ ${baseAmount.toFixed(2)}`,
    gstAmount: `₹ ${(cleanAmount - baseAmount).toFixed(2)}`,
    goldRate: currentGoldRate,
    weightBought: `${weightBought} g`,
    mode: method,
    status: 'Paid',
    customerId: linked_user_id || '',
    planId: schemeId || '',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    accountNo: accountNo || '',
    paymentId: paymentHistoryRef.id,
    userId: linked_user_id || '',
    userMobile: mobile || '',
    userName: userName || '',
    type: isInstallment ? 'Installment' : 'Scheme Join',
    planName: planName || ''
  };

  await setDoc(paymentHistoryRef, installmentData);

  // 6. Add record to payments audit collection
  const paymentRecordRef = doc(collection(db, 'payments'));
  await setDoc(paymentRecordRef, {
    customerName: userName || '',
    chitPlan: planName || '',
    dueAmount: `₹ ${baseAmount.toFixed(2)}`,
    paidAmount: `₹ ${cleanAmount.toFixed(2)}`,
    dueDate: dateStr,
    status: 'Completed',
    createdAt: serverTimestamp()
  });

  // 7. Add app notification
  try {
    const notificationRef = doc(collection(db, 'app_notifications'));
    await setDoc(notificationRef, {
      userId: linked_user_id || '',
      title: isInstallment ? 'Installment Paid' : 'Scheme Joined',
      message: isInstallment
        ? `Payment of ₹${cleanAmount.toFixed(2)} for ${planName} was successful. (Inst #${instNo})`
        : `Welcome! You've successfully joined ${planName} with a payment of ₹${cleanAmount.toFixed(2)}.`,
      type: 'payment',
      isRead: false,
      timestamp: serverTimestamp()
    });
  } catch (notifyErr) {
    console.error('Non-critical: Failed to create notification doc:', notifyErr);
  }

  console.log(`[processChitfundPayment] Secure Firestore updates completed successfully for txn ${txnid}!`);
}

module.exports = {
  initiatePayment,
  validateCallbackResponse,
  buildPaymentPayload,
  processChitfundPayment,
};
