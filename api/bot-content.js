import admin from 'firebase-admin';

let db = null;
let initError = null;

function getDb() {
  if (db) return db;
  if (!process.env.FIREBASE_ADMIN_SDK) {
    throw new Error('FIREBASE_ADMIN_SDK is not configured');
  }
  if (!admin.apps.length) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_SDK);
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  }
  db = admin.firestore();
  return db;
}

export default async function handler(req, res) {
  const { id } = req.query;
  const accessToken = req.headers.authorization?.replace('Bearer ', '');
  if (!accessToken) return res.status(401).json({ error: 'Missing token' });

  try {
    const doc = await getDb().collection('bots').doc(id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Bot not found' });

    let html = doc.data().htmlContent || '';
    const config = {
      token: accessToken,
      accountId: req.headers['x-deriv-account-id'] || '',
      appId: process.env.DERIV_APP_ID || '32FdjBnT7wM8d88xwBoOQ',
      balance: req.headers['x-deriv-balance'] || '0'
    };
    const bridgeScript = `<script>window.__QUANTARA__=${JSON.stringify(config)};</script><script src="/bridge.js"></script>`;
    html = html.replace('</head>', bridgeScript + '</head>');

    const allowed = ['localhost', '127.0.0.1', process.env.VERCEL_URL].filter(Boolean);
    if (allowed.length) {
      const domainLock = `<script>if(!${JSON.stringify(allowed)}.includes(location.hostname)){document.body.innerHTML='<h1>Unauthorized</h1>';throw new Error('Domain not allowed');}</script>`;
      html = html.replace('</head>', domainLock + '</head>');
    }

    res.setHeader('Content-Type', 'text/html');
    return res.status(200).send(html);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
