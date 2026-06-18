const axios = require('axios');
const config = require('../config/easebuzz');
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

module.exports = {
  initiatePayment,
  validateCallbackResponse,
  buildPaymentPayload,
};
