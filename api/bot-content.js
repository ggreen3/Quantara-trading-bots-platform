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
    const token = JSON.stringify(accessToken);
    const tokenScript = `<script>window.__DERIV_TOKEN__=${token};document.addEventListener('DOMContentLoaded',()=>{const inp=document.getElementById('apiToken');if(inp){inp.value=${token};inp.style.display='none';}});</script>`;
    html = html.replace('</head>', tokenScript + '</head>');

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
