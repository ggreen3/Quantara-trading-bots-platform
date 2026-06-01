export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { code, codeVerifier } = req.body;
  if (!code || !codeVerifier) return res.status(400).json({ error: 'Missing code or codeVerifier' });

  // Log environment variables (remove after debugging)
  console.log('DERIV_CLIENT_ID exists?', !!process.env.DERIV_CLIENT_ID);
  console.log('DERIV_REDIRECT_URI exists?', !!process.env.DERIV_REDIRECT_URI);

  try {
    const tokenResponse = await fetch('https://auth.deriv.com/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: process.env.DERIV_CLIENT_ID,
        code: code,
        code_verifier: codeVerifier,
        redirect_uri: process.env.DERIV_REDIRECT_URI,
      }).toString(),
    });

    const data = await tokenResponse.json();
    console.log('Token exchange status:', tokenResponse.status, data);

    if (!tokenResponse.ok) {
      return res.status(tokenResponse.status).json({ error: data.error_description || 'Token exchange failed' });
    }

    return res.status(200).json({ access_token: data.access_token, expires_in: data.expires_in });
  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
