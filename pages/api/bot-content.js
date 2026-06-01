import admin from 'firebase-admin';

if (!admin.apps.length) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_SDK);
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}
const db = admin.firestore();

export default async function handler(req, res) {
    const { id } = req.query;
    const accessToken = req.headers.authorization?.replace('Bearer ', '');
    if (!accessToken) return res.status(401).json({ error: 'Missing token' });
    const doc = await db.collection('bots').doc(id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Bot not found' });
    let html = doc.data().htmlContent;
    const tokenScript = `<script>window.__DERIV_TOKEN__='${accessToken}';document.addEventListener('DOMContentLoaded',()=>{let inp=document.getElementById('apiToken');if(inp){inp.value='${accessToken}';inp.style.display='none';}});</script>`;
    html = html.replace('</head>', tokenScript + '</head>');
    const domainLock = `<script>if(!['${process.env.VERCEL_URL}','localhost'].includes(location.hostname)){document.body.innerHTML='<h1>Unauthorized</h1>';throw new Error('Domain not allowed');}</script>`;
    html = html.replace('</head>', domainLock + '</head>');
    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(html);
}
