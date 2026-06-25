const express = require('express');
const crypto = require('crypto');
const config = require('../config/easebuzz');
const { db } = require('../config/firebase');
const { doc, getDoc, setDoc, serverTimestamp } = require('firebase/firestore');
const {
  initiatePayment,
  validateCallbackResponse,
  processChitfundPayment,
} = require('../services/easebuzzService');

const router = express.Router();

function generateTxnId() {
  return `TXN${Date.now()}${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
}

router.post('/initiate', async (req, res) => {
  try {
    const { amount, firstname, email, phone, productinfo } = req.body;

    if (!amount || !firstname || !email || !phone || !productinfo) {
      return res.status(400).json({
        success: false,
        message: 'Required fields: amount, firstname, email, phone, productinfo',
      });
    }

    const txnid = generateTxnId();
    const payment = await initiatePayment({
      txnid,
      amount,
      firstname,
      email,
      phone,
      productinfo,
      show_payment_mode: req.body.show_payment_mode,
      udf1: req.body.udf1,
      udf2: req.body.udf2,
      udf3: req.body.udf3,
      udf4: req.body.udf4,
      udf5: req.body.udf5,
      udf6: req.body.udf6,
      udf7: req.body.udf7,
      udf8: req.body.udf8,
      frontendUrl: req.body.frontendUrl,
    });

    return res.json({
      success: true,
      message: 'Payment initiated successfully',
      data: payment,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Payment initiation failed',
    });
  }
});

async function handleCallback(req, res, outcome) {
  try {
    const validation = validateCallbackResponse(req.body);
    
    // Fetch transaction from Firestore to get frontendUrl and configuration details
    let frontendUrl = config.frontendUrl;
    let existingTxn = {};
    
    if (validation.txnid) {
      try {
        const txnSnap = await getDoc(doc(db, 'transactions', validation.txnid));
        if (txnSnap.exists()) {
          existingTxn = txnSnap.data();
          frontendUrl = existingTxn.frontendUrl || config.frontendUrl;
        }
      } catch (fsErr) {
        console.error('Error fetching transaction from Firestore in callback:', fsErr);
      }
    }

    if (!validation.valid) {
      const errorMsg = encodeURIComponent(validation.message || 'Payment verification failed');
      
      // Update transaction status to failed in Firestore
      if (validation.txnid) {
        try {
          await setDoc(doc(db, 'transactions', validation.txnid), {
            status: 'failed',
            error: validation.message || 'Verification failed',
            updatedAt: serverTimestamp()
          }, { merge: true });
        } catch (fsErr) {
          console.error('Failed to log transaction failure to Firestore:', fsErr);
        }
      }

      return res.redirect(`${frontendUrl}/checkout?step=5&error=${errorMsg}`);
    }

    const isSuccess = validation.status === 'success';

    // Update main transaction status in Firestore
    try {
      await setDoc(doc(db, 'transactions', validation.txnid), {
        status: validation.status,
        easepayid: validation.easepayid,
        mode: validation.data.mode,
        verified: true,
        outcome,
        updatedAt: serverTimestamp(),
        rawCallbackData: validation.data
      }, { merge: true });
    } catch (fsErr) {
      console.error('Failed to log transaction success/failure status to Firestore:', fsErr);
    }

    if (isSuccess) {
      // Securely update Chit Fund details on the server side
      try {
        await processChitfundPayment({
          ...existingTxn,
          amount: validation.amount,
          easepayid: validation.easepayid,
          mode: validation.data.mode,
          txnid: validation.txnid,
          updatedAt: new Date().toISOString()
        });
      } catch (chitfundErr) {
        console.error('Error processing secure chitfund payment updates:', chitfundErr);
      }

      return res.redirect(`${frontendUrl}/checkout?step=6&txnid=${validation.txnid}`);
    } else {
      return res.redirect(`${frontendUrl}/checkout?step=5&txnid=${validation.txnid}&error=payment_failed`);
    }
  } catch (error) {
    console.error('Callback handling critical error:', error);
    return res.redirect(`${config.frontendUrl}/checkout?step=5&error=critical_callback_error`);
  }
}

router.post('/success', (req, res) => handleCallback(req, res, 'success'));
router.post('/failure', (req, res) => handleCallback(req, res, 'failure'));

router.get('/status/:txnid', async (req, res) => {
  try {
    const txnSnap = await getDoc(doc(db, 'transactions', req.params.txnid));

    if (!txnSnap.exists()) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found',
      });
    }

    return res.json({
      success: true,
      data: txnSnap.data(),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch transaction status',
    });
  }
});

router.get('/transactions', async (req, res) => {
  try {
    return res.json({
      success: false,
      message: 'Use Firestore dashboard directly to view all historical transactions',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

module.exports = router;
