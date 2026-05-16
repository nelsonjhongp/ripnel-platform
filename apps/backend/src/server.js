const app = require('./app');
const { env } = require('./config/env');

app.listen(env.port, () => {
  console.log(`Backend listening on port ${env.port}`);
});
