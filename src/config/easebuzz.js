require('dotenv').config();

const ENV = process.env.EASEBUZZ_ENV || 'test';

const BASE_URLS = {
  test: 'https://testpay.easebuzz.in/',
  prod: 'https://pay.easebuzz.in/',
};

module.exports = {
  key: process.env.EASEBUZZ_KEY,
  salt: process.env.EASEBUZZ_SALT,
  env: ENV,
  baseUrl: BASE_URLS[ENV] || BASE_URLS.test,
  appBaseUrl: process.env.BASE_URL || 'http://localhost:3000',
  // UPI + Net Banking work for most Indian test merchants (cards may need Easebuzz activation)
  defaultPaymentModes: process.env.DEFAULT_PAYMENT_MODES || 'UPI,NB',
};
