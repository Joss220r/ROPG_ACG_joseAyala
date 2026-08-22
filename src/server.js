import { config } from './config.js';
import { initializeDatabase } from './db.js';
import { createApp } from './app.js';

await initializeDatabase();

const app = createApp();
app.listen(config.port, () => {
  console.log(`MusicHub OAuth server running at http://127.0.0.1:${config.port}`);
});

