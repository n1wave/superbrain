import { collection, addDoc, getDocs, deleteDoc, doc, serverTimestamp, query, orderBy, updateDoc } from "firebase/firestore";
import { db } from "./firebase";

export interface DocumentBase {
    id?: string;
    name: string;
    description: string;
    content: string;
    createdAt: any;
    updatedAt: any;
    size: number;
    type: string;

    // AI Metadata (Optional)
    documentType?: string;
    mainTopic?: string;
    tags?: string[];
    tldr?: string;
    keyFindings?: string[];
    usage?: string;
    actionItems?: string[];
    // AI Document Metrics (Optional)
    docMetrics?: {
        actionability: number;
        impact: number;
        ease: number;
        evergreen: number;
        overall: number;
        actionabilityNote: string;
        impactNote: string;
        easeNote: string;
        evergreenNote: string;
    };
}

const COLLECTION_NAME = "documents";

export const saveDocument = async (
    docDataToSave: Omit<DocumentBase, 'id' | 'createdAt' | 'updatedAt'>
): Promise<DocumentBase> => {
    const docData = {
        ...docDataToSave,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    };
    const docRef = await addDoc(collection(db, COLLECTION_NAME), docData);
    return { id: docRef.id, ...docData };
};

export const getDocuments = async (): Promise<DocumentBase[]> => {
    const q = query(collection(db, COLLECTION_NAME), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    const docs: DocumentBase[] = [];
    querySnapshot.forEach((docSnap) => {
        docs.push({ id: docSnap.id, ...docSnap.data() } as DocumentBase);
    });
    return docs;
};

export const updateDocument = async (
    id: string,
    docDataToUpdate: Partial<Omit<DocumentBase, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<void> => {
    const docRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(docRef, { ...docDataToUpdate, updatedAt: serverTimestamp() });
};

export const deleteDocument = async (id: string): Promise<void> => {
    await deleteDoc(doc(db, COLLECTION_NAME, id));
};

// ════════════════════════════════════════
// Chat Messages  (documents/{docId}/chats)
// ════════════════════════════════════════

export interface ChatMessage {
    id?: string;
    sessionId: string;
    role: 'user' | 'model';
    text: string;
    createdAt: any;
}

export const saveChatMessage = async (
    docId: string,
    message: Omit<ChatMessage, 'id' | 'createdAt'>
): Promise<ChatMessage> => {
    const data = { ...message, createdAt: serverTimestamp() };
    const ref = await addDoc(collection(db, COLLECTION_NAME, docId, 'chats'), data);
    return { id: ref.id, ...data };
};

export const getChatMessagesBySession = async (
    docId: string,
    sessionId: string
): Promise<ChatMessage[]> => {
    const q = query(
        collection(db, COLLECTION_NAME, docId, 'chats'),
        orderBy('createdAt', 'asc')
    );
    const snap = await getDocs(q);
    return snap.docs
        .map(d => ({ id: d.id, ...d.data() } as ChatMessage))
        .filter(m => m.sessionId === sessionId);
};

// ════════════════════════════════════════
// Chat Sessions  (documents/{docId}/chatSessions)
// ════════════════════════════════════════

export interface ChatAnalysis {
    title: string;
    tags: string[];
    situationSummary: string;
    progressAndResults: string;
    openIssues: string;
    metrics?: {
        timeSavings: number;
        completeness: number;
        criticality: number;
        transferability: number;
        roi: number;
        roiBreakdown: string;
        timeSavingsNote?: string;
        completenessNote?: string;
        criticalityNote?: string;
        transferabilityNote?: string;
    };
}

export interface ChatSession {
    id?: string;
    title: string;
    messageCount: number;
    lastMessageAt: any;
    createdAt: any;
    analysis?: ChatAnalysis;
}

export const createChatSession = async (docId: string): Promise<string> => {
    const now = new Date();
    const title = `Sesja ${now.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' })} ${now.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}`;
    const ref = await addDoc(
        collection(db, COLLECTION_NAME, docId, 'chatSessions'),
        { title, messageCount: 0, lastMessageAt: serverTimestamp(), createdAt: serverTimestamp() }
    );
    return ref.id;
};

export const getChatSessions = async (docId: string): Promise<ChatSession[]> => {
    const q = query(
        collection(db, COLLECTION_NAME, docId, 'chatSessions'),
        orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as ChatSession));
};

export const updateChatSession = async (
    docId: string,
    sessionId: string,
    data: Partial<Omit<ChatSession, 'id' | 'createdAt'>>
): Promise<void> => {
    await updateDoc(doc(db, COLLECTION_NAME, docId, 'chatSessions', sessionId), data);
};

export const saveChatAnalysisToSession = async (
    docId: string,
    sessionId: string,
    analysis: ChatAnalysis
): Promise<void> => {
    await updateDoc(
        doc(db, COLLECTION_NAME, docId, 'chatSessions', sessionId),
        { analysis }
    );
};

// ════════════════════════════════════════
// Chats Overview for DocsView
// ════════════════════════════════════════

export interface ChatOverview {
    docId: string;
    docName: string;
    messageCount: number;
    lastMessage: string;
    lastMessageAt: any;
}

export const getChatsOverview = async (): Promise<ChatOverview[]> => {
    const docs = await getDocuments();
    const docMap = new Map(docs.map(d => [d.id!, d]));

    const { collectionGroup: firestoreCollectionGroup } = await import('firebase/firestore');
    const snap = await getDocs(firestoreCollectionGroup(db, 'chats'));

    const grouped = new Map<string, { count: number; lastText: string; lastAt: any }>();
    snap.docs.forEach(d => {
        const docId = d.ref.parent.parent?.id;
        if (!docId) return;
        const data = d.data();
        const existing = grouped.get(docId);
        grouped.set(docId, {
            count: (existing?.count ?? 0) + 1,
            lastText: data.text ?? '',
            lastAt: data.createdAt,
        });
    });

    const result: ChatOverview[] = [];
    grouped.forEach((val, docId) => {
        const doc = docMap.get(docId);
        result.push({
            docId,
            docName: doc?.name ?? 'Nieznany dokument',
            messageCount: val.count,
            lastMessage: val.lastText.slice(0, 120),
            lastMessageAt: val.lastAt,
        });
    });

    return result.sort((a, b) => {
        const tA = a.lastMessageAt?.toDate?.()?.getTime() ?? 0;
        const tB = b.lastMessageAt?.toDate?.()?.getTime() ?? 0;
        return tB - tA;
    });
};

// ── All sessions across all documents (for ChatsView) ──

export interface SessionWithDoc extends ChatSession {
    docId: string;
    docName: string;
}

export const getAllChatSessions = async (): Promise<SessionWithDoc[]> => {
    const docs = await getDocuments();
    const docMap = new Map(docs.map(d => [d.id!, d]));

    const { collectionGroup: cg } = await import('firebase/firestore');
    const snap = await getDocs(cg(db, 'chatSessions'));

    const result: SessionWithDoc[] = snap.docs.map(d => {
        const docId = d.ref.parent.parent?.id ?? '';
        const doc = docMap.get(docId);
        return {
            id: d.id,
            docId,
            docName: doc?.name ?? 'Nieznany dokument',
            ...(d.data() as Omit<ChatSession, 'id'>),
        };
    });

    return result.sort((a, b) => {
        const tA = a.createdAt?.toDate?.()?.getTime() ?? 0;
        const tB = b.createdAt?.toDate?.()?.getTime() ?? 0;
        return tB - tA;
    });
};

// ── Tags ──

export interface TagInfo {
    name: string;
    count: number;
    docIds: string[];
}

export const getAllTags = async (): Promise<TagInfo[]> => {
    const docs = await getDocuments();
    const map = new Map<string, { count: number; docIds: string[] }>();
    for (const d of docs) {
        for (const tag of d.tags ?? []) {
            if (!tag) continue;
            const existing = map.get(tag) ?? { count: 0, docIds: [] };
            existing.count++;
            existing.docIds.push(d.id!);
            map.set(tag, existing);
        }
    }
    return Array.from(map.entries())
        .map(([name, { count, docIds }]) => ({ name, count, docIds }))
        .sort((a, b) => b.count - a.count);
};

export const renameTagInAllDocs = async (oldTag: string, newTag: string): Promise<void> => {
    const docs = await getDocuments();
    const affected = docs.filter(d => d.tags?.includes(oldTag));
    await Promise.all(
        affected.map(d =>
            updateDocument(d.id!, {
                tags: (d.tags ?? []).map(t => (t === oldTag ? newTag.trim() : t)),
            })
        )
    );
};
