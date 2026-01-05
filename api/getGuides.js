
const admin = require('firebase-admin');

if (!admin.apps.length) {
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
    }
}

const db = admin.firestore();

export default async function handler(req, res) {
    // CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    const { userId } = req.query;

    if (!userId) {
        return res.status(400).json({ error: 'Missing userId' });
    }

    try {
        const snapshot = await db.collection('guides').where('userId', '==', userId).get();
        const guides = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            guides.push({
                id: data.id,
                title: data.title,
                filename: data.filename || 'Unknown File',
                created_at: data.created_at
            });
        });
        // Sort by newest first
        guides.sort((a, b) => b.created_at - a.created_at);

        return res.status(200).json({ guides });
    } catch (error) {
        console.error('Get guides error:', error);
        return res.status(500).json({ error: 'Failed to fetch guides' });
    }
}
