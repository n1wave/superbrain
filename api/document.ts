import { initializeApp, getApps } from "firebase/app";
import { getFirestore, doc, getDoc, Timestamp } from "firebase/firestore";

// Convert Firestore Timestamps to strings or numbers for JSON serialization
function serializeDates(obj: any): any {
    if (obj instanceof Timestamp) {
        return obj.toDate().toISOString();
    }
    if (Array.isArray(obj)) {
        return obj.map(serializeDates);
    }
    if (obj !== null && typeof obj === 'object') {
        const result: any = {};
        for (const [key, value] of Object.entries(obj)) {
            result[key] = serializeDates(value);
        }
        return result;
    }
    return obj;
}

export default async function handler(req: any, res: any) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed. Use GET.' });
    }

    const { id } = req.query;

    if (!id || typeof id !== 'string') {
        return res.status(400).json({ error: 'Bad Request: Missing or invalid document ID parameter ?id=...' });
    }

    const authHeader = req.headers.authorization;
    const secretKey = process.env.API_SECRET_KEY || 'N1_SUPER_SECRET_KEY_123';

    // Verify Authorization: Bearer <TOKEN>
    if (!authHeader || authHeader !== `Bearer ${secretKey}`) {
        return res.status(401).json({ error: 'Unauthorized: Invalid or missing API key.' });
    }

    try {
        const firebaseConfig = {
            apiKey: process.env.VITE_FIREBASE_API_KEY,
            authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
            projectId: process.env.VITE_FIREBASE_PROJECT_ID,
            storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
            messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
            appId: process.env.VITE_FIREBASE_APP_ID,
            measurementId: process.env.VITE_FIREBASE_MEASUREMENT_ID,
        };

        const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
        const db = getFirestore(app);

        // Check if API is enabled
        const configRef = doc(db, 'settings', 'api_config');
        const configSnap = await getDoc(configRef);
        if (configSnap.exists() && configSnap.data()?.isEnabled === false) {
            return res.status(403).json({ error: 'API is currently disabled.' });
        }

        const docRef = doc(db, 'documents', id);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
            return res.status(404).json({ error: 'Not Found: Document with specified ID does not exist.' });
        }

        let documentData = {
            id: docSnap.id,
            ...docSnap.data()
        };

        documentData = serializeDates(documentData);

        res.status(200).json({ document: documentData });
    } catch (error) {
        console.error("API endpoint error:", error);
        res.status(500).json({ error: 'Internal server error' });
    }
}
