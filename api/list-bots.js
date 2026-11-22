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
  try {
    const snapshot = await getDb().collection('bots').get();
    const bots = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      bots.push({ id: doc.id, name: data.name, tier: data.tier, price: data.price || 0, engine: data.engine || 'legacy' });
    });
    return res.status(200).json(bots);
  } catch (err) {
    return res.status(503).json({ error: err.message });
  }
}
