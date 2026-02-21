import { collection, addDoc, getDocs, deleteDoc, doc, serverTimestamp, query, orderBy } from "firebase/firestore";
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

export const deleteDocument = async (id: string): Promise<void> => {
    // Delete only from Firestore
    await deleteDoc(doc(db, COLLECTION_NAME, id));
};

