
const admin = require('firebase-admin');

// Initialize (Reusing the logic from saveGuide check)
if (!admin.apps.length) {
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
    } else {
        // Fallback for local testing if env is missing (will fail but safe)
        console.error("FIREBASE_SERVICE_ACCOUNT missing");
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

    const { id } = req.query;

    if (!id) {
        return res.status(400).json({ error: 'Missing guide ID' });
    }

    try {
        const doc = await db.collection('guides').doc(id).get();
        if (!doc.exists) {
            return res.status(404).json({ error: 'Guide not found' });
        }
        return res.status(200).json(doc.data());
    } catch (error) {
        console.error('Get guide error:', error);
        return res.status(500).json({ error: 'Failed to fetch guide' });
    }
}
