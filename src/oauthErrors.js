export function oauthError(res, status, error, description) {
  return res.status(status).json({
    error,
    error_description: description
  });
}

export function invalidRequest(res, description) {
  return oauthError(res, 400, 'invalid_request', description);
}

export function invalidClient(res) {
  res.set('WWW-Authenticate', 'Basic realm="MusicHub OAuth"');
  return oauthError(res, 401, 'invalid_client', 'Client authentication failed.');
}

export function invalidGrant(res) {
  return oauthError(res, 400, 'invalid_grant', 'The authorization grant is invalid.');
}

export function invalidScope(res) {
  return oauthError(res, 400, 'invalid_scope', 'Requested scope is not allowed.');
}

export function unauthorizedClient(res) {
  return oauthError(res, 400, 'unauthorized_client', 'Client is not authorized for this grant.');
}

