// api/exchange.js
export default async function handler(req, res) {
  // Allow only POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { code, codeVerifier } = req.body;

  if (!code || !codeVerifier) {
    return res.status(400).json({ error: 'Missing code or codeVerifier' });
  }

  try {
    // Exchange the code for an access token
    const tokenResponse = await fetch('https://auth.deriv.com/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: process.env.DERIV_CLIENT_ID,    // Set in Vercel
        code: code,
        code_verifier: codeVerifier,
        redirect_uri: process.env.DERIV_REDIRECT_URI, // Set in Vercel
      }).toString(),
    });

    const data = await tokenResponse.json();

    if (!tokenResponse.ok) {
      console.error('Token exchange error:', data);
      return res.status(tokenResponse.status).json({ error: data.error_description || 'Token exchange failed' });
    }

    // Return the access_token to the frontend
    return res.status(200).json({ access_token: data.access_token, expires_in: data.expires_in });
  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
