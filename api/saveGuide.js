
const admin = require('firebase-admin');

// Initialize Admin SDK via Environment Variable
// You must add FIREBASE_SERVICE_ACCOUNT to Vercel Environment Variables
// It should contain the JSON string of the service account.
if (!admin.apps.length) {
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
    } else {
        console.error("FIREBASE_SERVICE_ACCOUNT missing");
    }
}

const db = admin.firestore();

export default async function handler(req, res) {
    // CORS Configuration
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const guide = req.body;

        if (!guide.id) {
            return res.status(400).json({ error: 'Guide ID missing' });
        }

        // Write to Firestore with Admin Privileges
        await db.collection('guides').doc(guide.id).set(guide);

        return res.status(200).json({ success: true, id: guide.id });
    } catch (error) {
        console.error('Save error:', error);
        return res.status(500).json({ error: 'Failed to save guide', details: error.message });
    }
}
