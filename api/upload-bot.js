import admin from 'firebase-admin';

let db = null;

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
  if (req.method !== 'POST') return res.status(405).end();

  const { id, name, tier, price, html, pass } = req.body || {};
  if (!process.env.ADMIN_PASS) return res.status(500).json({ error: 'ADMIN_PASS is not configured' });
  if (pass !== process.env.ADMIN_PASS) return res.status(401).json({ error: 'Unauthorized' });
  if (!id || !name || !html) return res.status(400).json({ error: 'Missing fields' });

  try {
    await getDb().collection('bots').doc(id).set({
      id, name, tier, price: price || 0, htmlContent: html, createdAt: new Date().toISOString()
    });
    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
