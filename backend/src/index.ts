import createApp from './app';
import env from './config/env';
import logger from './utils/logger';
import hopxService from './services/hopx.service';
import terminalSessionManager from './services/terminalSessionManager';
import { getErrorMessage } from './utils/errorUtils';

const app = createApp();

const server = app.listen(env.PORT, () => {
  logger.info(`🚀 Server started on port ${env.PORT}`);
  logger.info(`📝 Frontend URL: ${env.FRONTEND_URL}`);
  logger.info(`🔧 Environment: ${env.NODE_ENV}`);
});

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  logger.info(`${signal} received, shutting down gracefully`);

  // Cleanup terminal sessions first
  try {
    await terminalSessionManager.shutdown();
  } catch (error: unknown) {
    logger.error('Error shutting down terminal manager', { error: getErrorMessage(error) });
  }

  // Cleanup Hopx sandbox
  try {
    await hopxService.cleanup();
  } catch (error: unknown) {
    logger.error('Error cleaning up Hopx service', { error: getErrorMessage(error) });
  }

  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });

  setTimeout(() => {
    logger.error('Forced shutdown due to timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught exception:');
  console.error(error);
  logger.error('Uncaught exception', { error: error.message, stack: error.stack });
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('❌ Unhandled rejection:');
  console.error(reason);
  logger.error('Unhandled rejection', { reason });
  process.exit(1);
});
