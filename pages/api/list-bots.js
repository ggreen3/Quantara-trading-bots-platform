import admin from 'firebase-admin';

if (!admin.apps.length) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_SDK);
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}
const db = admin.firestore();

export default async function handler(req, res) {
    const snapshot = await db.collection('bots').get();
    const bots = [];
    snapshot.forEach(doc => {
        const data = doc.data();
        bots.push({ id: doc.id, name: data.name, tier: data.tier });
    });
    res.status(200).json(bots);
}
