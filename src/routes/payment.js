const express = require('express');
const crypto = require('crypto');
const {
  initiatePayment,
  validateCallbackResponse,
} = require('../services/easebuzzService');

const router = express.Router();
const transactions = new Map();

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
    });

    transactions.set(txnid, {
      txnid,
      amount: payment.amount,
      status: 'initiated',
      createdAt: new Date().toISOString(),
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

function handleCallback(req, res, outcome) {
  const validation = validateCallbackResponse(req.body);

  if (!validation.valid) {
    return res.status(400).send(`
      <html>
        <body style="font-family: sans-serif; padding: 40px;">
          <h2>Payment verification failed</h2>
          <p>${validation.message}</p>
          <a href="/">Go back</a>
        </body>
      </html>
    `);
  }

  const existing = transactions.get(validation.txnid) || {};
  transactions.set(validation.txnid, {
    ...existing,
    ...validation.data,
    status: validation.status,
    verified: true,
    outcome,
    updatedAt: new Date().toISOString(),
  });

  const isSuccess = validation.status === 'success';
  const title = isSuccess ? 'Payment Successful' : 'Payment Failed';
  const color = isSuccess ? '#16a34a' : '#dc2626';

  return res.send(`
    <html>
      <body style="font-family: sans-serif; padding: 40px; max-width: 600px; margin: 0 auto;">
        <h2 style="color: ${color};">${title}</h2>
        <p><strong>Transaction ID:</strong> ${validation.txnid}</p>
        <p><strong>Easepay ID:</strong> ${validation.easepayid || 'N/A'}</p>
        <p><strong>Amount:</strong> INR ${validation.amount}</p>
        <p><strong>Status:</strong> ${validation.status}</p>
        <br />
        <a href="/" style="color: #2563eb;">Make another payment</a>
      </body>
    </html>
  `);
}

router.post('/success', (req, res) => handleCallback(req, res, 'success'));
router.post('/failure', (req, res) => handleCallback(req, res, 'failure'));

router.get('/status/:txnid', (req, res) => {
  const transaction = transactions.get(req.params.txnid);

  if (!transaction) {
    return res.status(404).json({
      success: false,
      message: 'Transaction not found',
    });
  }

  return res.json({
    success: true,
    data: transaction,
  });
});

router.get('/transactions', (_req, res) => {
  return res.json({
    success: true,
    data: Array.from(transactions.values()),
  });
});

module.exports = router;
