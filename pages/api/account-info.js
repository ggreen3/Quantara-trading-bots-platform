export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { access_token } = req.body;
  if (!access_token) return res.status(400).json({ error: 'Missing access_token' });

  try {
    const response = await fetch('https://api.deriv.com/v3/authorize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ authorize: access_token })
    });
    const data = await response.json();
    if (data.error) return res.status(401).json({ error: data.error.message });
    const auth = data.authorize;
    res.status(200).json({
      balance: parseFloat(auth.balance).toFixed(2),
      currency: auth.currency || 'USD',
      accountType: auth.landing_company === 'virtual' ? 'Demo Account' : 'Real Account',
      isDemo: auth.landing_company === 'virtual'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
