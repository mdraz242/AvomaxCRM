import app from './app.js';
import { env, validateRequiredEnv } from './config/env.js';

try {
  validateRequiredEnv();
} catch (err) {
  console.error('Startup configuration error:', err.message);
  process.exit(1);
}

app.listen(env.port, () => {
  console.log(`AvomaxCRM API listening on port ${env.port} (${env.nodeEnv})`);
});

