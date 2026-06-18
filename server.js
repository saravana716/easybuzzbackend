const path = require('path');
const express = require('express');
const cors = require('cors');
const config = require('./src/config/easebuzz');
const paymentRoutes = require('./src/routes/payment');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/health', (_req, res) => {
  res.json({
    success: true,
    message: 'Easebuzz payment server is running',
    env: config.env,
  });
});

app.use('/api/payment', paymentRoutes);

app.listen(PORT, () => {
  console.log(`Easebuzz server running at ${config.appBaseUrl}`);
  console.log(`Environment: ${config.env}`);
  console.log(`Open ${config.appBaseUrl} to test payments`);
});
