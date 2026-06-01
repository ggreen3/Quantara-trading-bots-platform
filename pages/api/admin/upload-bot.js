import admin from 'firebase-admin';
import formidable from 'formidable-serverless';
import fs from 'fs';

if (!admin.apps.length) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_SDK);
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}
const db = admin.firestore();
export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();
    const password = req.headers['x-admin-password'];
    if (password !== process.env.ADMIN_PASS) return res.status(401).json({ error: 'Unauthorized' });
    const form = new formidable.IncomingForm();
    form.parse(req, async (err, fields, files) => {
        if (err) return res.status(500).json({ error: err.message });
        const { id, name, tier } = fields;
        const htmlFile = files.html;
        const htmlContent = fs.readFileSync(htmlFile.path, 'utf8');
        await db.collection('bots').doc(id).set({
            id, name, tier: tier || 'free', price: tier === 'free' ? 0 : null,
            htmlContent, createdAt: new Date().toISOString()
        });
        res.status(200).json({ success: true, id });
    });
}
