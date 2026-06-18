const crypto = require('crypto');

const INITIATE_HASH_SEQUENCE = [
  'key',
  'txnid',
  'amount',
  'productinfo',
  'firstname',
  'email',
  'udf1',
  'udf2',
  'udf3',
  'udf4',
  'udf5',
  'udf6',
  'udf7',
  'udf8',
  'udf9',
  'udf10',
];

const RESPONSE_HASH_SEQUENCE = [
  'udf10',
  'udf9',
  'udf8',
  'udf7',
  'udf6',
  'udf5',
  'udf4',
  'udf3',
  'udf2',
  'udf1',
  'email',
  'firstname',
  'productinfo',
  'amount',
  'txnid',
  'key',
];

function sha512(value) {
  return crypto.createHash('sha512').update(value).digest('hex').toLowerCase();
}

function generateInitiateHash(params, salt) {
  const parts = INITIATE_HASH_SEQUENCE.map((field) => params[field] || '');
  const hashString = `${parts.join('|')}|${salt}`;
  return sha512(hashString);
}

function verifyResponseHash(response, salt) {
  const reverseParts = RESPONSE_HASH_SEQUENCE.map((field) => response[field] || '');
  const hashString = `${salt}|${response.status}|${reverseParts.join('|')}`;
  const expectedHash = sha512(hashString);
  return expectedHash === (response.hash || '').toLowerCase();
}

module.exports = {
  generateInitiateHash,
  verifyResponseHash,
};
