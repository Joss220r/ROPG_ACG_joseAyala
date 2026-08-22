import express from 'express';
import { oauthRouter } from './oauthRoutes.js';
import { resourceRouter } from './resourceRoutes.js';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(express.urlencoded({ extended: false }));
  app.use(express.json());

  app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/oauth', oauthRouter);
  app.use('/api', resourceRouter);

  app.use((req, res) => {
    res.status(404).json({ error: 'not_found' });
  });

  return app;
}

