import express from 'express';
import { requireBearerToken } from './authMiddleware.js';
import { store } from './db.js';

export const resourceRouter = express.Router();

resourceRouter.get('/me', requireBearerToken('profile.read'), (req, res) => {
  const user = store.getUserById(req.auth.sub);
  if (!user) {
    return res.status(401).json({ error: 'invalid_token', error_description: 'Token subject no longer exists.' });
  }

  return res.json({
    id: user.id,
    username: user.username,
    display_name: user.display_name
  });
});

resourceRouter.get('/playlists', requireBearerToken('playlists.read'), (req, res) => {
  return res.json({
    items: store.getPlaylistsByUserId(req.auth.sub)
  });
});

