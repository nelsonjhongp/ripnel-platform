const app = require('./app');
const { env } = require('./config/env');
const { processPendingReceiptQueue } = require('./modules/sales/sales.service');

function startReceiptRetryWorker() {
  if (!env.apiSunatRetryJobEnabled) {
    return;
  }

  const intervalMs = Math.max(15000, Number(env.apiSunatRetryIntervalMs) || 300000);
  const run = async () => {
    try {
      const result = await processPendingReceiptQueue({
        limit: env.apiSunatRetryBatchSize,
      });

      if (!result.skipped && (result.processed > 0 || result.failed > 0)) {
        console.log(
          `[sales] Receipt retry worker processed=${result.processed} failed=${result.failed} total=${result.total}`
        );
      }
    } catch (error) {
      console.warn(
        `[sales] Receipt retry worker failed: ${(error && error.message) || 'Unknown error'}`
      );
    }
  };

  setTimeout(run, 2000);
  const timer = setInterval(run, intervalMs);
  timer.unref();
}

startReceiptRetryWorker();

app.listen(env.port, () => {
  console.log(`Backend listening on port ${env.port}`);
});
