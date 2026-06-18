# Easebuzz Payment Gateway (Node.js + Express)

A working Easebuzz payment gateway backend with a simple test checkout page.

## Setup

```bash
npm install
cp .env.example .env
npm start
```

Open [http://localhost:3000](http://localhost:3000)

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/payment/initiate` | Start a payment |
| POST | `/api/payment/success` | Success callback (surl) |
| POST | `/api/payment/failure` | Failure callback (furl) |
| GET | `/api/payment/status/:txnid` | Get transaction status |
| GET | `/api/health` | Health check |

## Initiate Payment Example

```bash
curl -X POST http://localhost:3000/api/payment/initiate \
  -H "Content-Type: application/json" \
  -d '{
    "amount": "10.00",
    "firstname": "Dinesh",
    "email": "test@example.com",
    "phone": "9876543210",
    "productinfo": "Test Product"
  }'
```

Response:

```json
{
  "success": true,
  "data": {
    "accessKey": "...",
    "paymentUrl": "https://testpay.easebuzz.in/pay/...",
    "txnid": "TXN...",
    "amount": "10.00",
    "env": "test"
  }
}
```

Redirect the user to `paymentUrl` to complete payment.

## Test Cards

- **Mastercard:** 5553 0422 4198 4105 | Exp: 07/2028 | CVV: 123
- **Visa:** 4012 8888 8888 1881 | Exp: 07/2028 | CVV: 123

> **Note:** If you see error `GC0C05 - International Cards not supported`, your merchant account does not have card payments enabled yet. Use **UPI** or **Net Banking** for testing instead, or contact Easebuzz support to enable domestic cards.

## Recommended Test Flow

1. Select **UPI + Net Banking** on the checkout page
2. On the Easebuzz page, choose UPI or Net Banking
3. Complete the sandbox flow shown on screen

## Environment Variables

| Variable | Description |
|----------|-------------|
| `EASEBUZZ_KEY` | Merchant key |
| `EASEBUZZ_SALT` | Merchant salt |
| `EASEBUZZ_ENV` | `test` or `prod` |
| `DEFAULT_PAYMENT_MODES` | e.g. `UPI,NB` (limits checkout to UPI + Net Banking) |
| `BASE_URL` | Your server URL (for callbacks) |
| `PORT` | Server port (default: 3000) |

## Production Notes

1. Set `EASEBUZZ_ENV=prod` and use live credentials.
2. Set `BASE_URL` to your public HTTPS domain.
3. Easebuzz must be able to reach your `surl` and `furl` callbacks.
