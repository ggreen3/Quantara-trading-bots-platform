export default async function handler(req, res) {
  const accessToken = req.body?.access_token || req.headers.authorization?.replace('Bearer ', '');
  if (!accessToken) return res.status(400).json({ error: 'Missing access_token' });

  try {
    const response = await fetch('https://api.derivws.com/trading/v1/options/accounts', {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({ error: data.error?.message || data.message || 'Authorization failed' });
    }

    const accounts = data.data || [];
    if (!accounts.length) return res.status(404).json({ error: 'No trading accounts found' });

    const preferred = req.body?.account_type || req.query?.account_type || 'demo';
    const account = accounts.find(a => a.account_type === preferred) ||
                    accounts.find(a => a.account_type === 'demo') ||
                    accounts[0];
    const isDemo = account.account_type === 'demo';

    return res.status(200).json({
      accountId: account.account_id,
      balance: parseFloat(account.balance).toFixed(2),
      currency: account.currency || 'USD',
      accountType: isDemo ? 'Demo Account' : 'Real Account',
      isDemo
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
