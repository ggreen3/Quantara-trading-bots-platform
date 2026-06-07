import admin from 'firebase-admin';

if (!admin.apps.length) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_SDK);
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}
const db = admin.firestore();

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();
    const { id, name, tier, price, html, pass } = req.body;
    if (pass !== process.env.ADMIN_PASS) return res.status(401).json({ error: 'Unauthorized' });
    if (!id || !name || !html) return res.status(400).json({ error: 'Missing fields' });
    await db.collection('bots').doc(id).set({
        id, name, tier, price: price || 0, htmlContent: html, createdAt: new Date().toISOString()
    });
    res.status(200).json({ success: true });
}
