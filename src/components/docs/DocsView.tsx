import React, { useState, useEffect } from 'react';
import { Trash2, Search, Plus, FileText } from 'lucide-react';
import { getDocuments, deleteDocument } from '../../lib/docs';
import type { DocumentBase } from '../../lib/docs';
import { DocumentEditor } from './DocumentEditor';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export function DocsView() {
    const [documents, setDocuments] = useState<DocumentBase[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [selectedDoc, setSelectedDoc] = useState<DocumentBase | null>(null);

    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [docToDelete, setDocToDelete] = useState<DocumentBase | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const fetchDocuments = async () => {
        setIsLoading(true);
        try {
            const docs = await getDocuments();
            setDocuments(docs);
        } catch (error) {
            console.error("Error fetching documents:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchDocuments();
    }, []);

    const promptDelete = (e: React.MouseEvent, doc: DocumentBase) => {
        e.stopPropagation();
        setDocToDelete(doc);
        setDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!docToDelete || !docToDelete.id) return;
        setIsDeleting(true);
        try {
            await deleteDocument(docToDelete.id);
            setDocuments(docs => docs.filter(d => d.id !== docToDelete.id));
            if (selectedDoc && selectedDoc.id === docToDelete.id) setSelectedDoc(null);
        } catch (error) {
            console.error("Error deleting document:", error);
            alert("Nie udało się usunąć dokumentu.");
        } finally {
            setIsDeleting(false);
            setDeleteModalOpen(false);
            setDocToDelete(null);
        }
    };



    const formatDate = (dateData: any) => {
        if (!dateData) return 'N/A';
        if (dateData.toDate) {
            return dateData.toDate().toLocaleDateString('pl-PL', { year: 'numeric', month: 'short', day: 'numeric' });
        }
        return new Date(dateData).toLocaleDateString();
    };

    const filteredDocs = documents.filter(doc =>
        doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (isEditing) {
        return (
            <DocumentEditor
                onBack={() => setIsEditing(false)}
                onSaved={() => {
                    setIsEditing(false);
                    fetchDocuments();
                }}
            />
        );
    }

    // Jeśli wybraliśmy dokument, pokazujemy go tylko do odczytu z przyciskiem powrotu.
    if (selectedDoc) {
        return (
            <div className="space-y-6 w-full">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setSelectedDoc(null)}
                        className="p-2 hover:bg-brand-sea/5 rounded-full transition-colors text-brand-sea border border-brand-sea/20"
                    >
                        ← Wróć do listy
                    </button>
                    <div className="flex-1">
                        <h2 className="text-2xl font-bold tracking-tight text-brand-midnight">
                            {selectedDoc.name}
                        </h2>
                        {selectedDoc.description && (
                            <p className="text-brand-navy/60 text-sm mt-1">{selectedDoc.description}</p>
                        )}
                    </div>
                </div>

                <div className="rounded-xl border border-brand-sea/20 bg-white shadow-sm flex flex-col min-h-[500px] max-h-[800px] overflow-hidden">
                    <div className="p-4 border-b border-brand-sea/10 bg-brand-sea/5 flex justify-between items-center z-10">
                        <h3 className="font-semibold text-brand-midnight">Treść dokumentu (Markdown / Tekst)</h3>
                        <span className="text-xs text-brand-navy/60">{formatDate(selectedDoc.createdAt)}</span>
                    </div>
                    <div className="flex-1 p-0 relative bg-white">
                        <div className="absolute inset-0 p-6 overflow-y-auto">
                            <div className="prose prose-sm md:prose-base max-w-none text-brand-midnight whitespace-pre-wrap leading-relaxed">
                                {selectedDoc.content ? (
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                        {selectedDoc.content}
                                    </ReactMarkdown>
                                ) : (
                                    "Brak treści do wyświetlenia."
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-start">
                <button
                    onClick={() => setIsEditing(true)}
                    className="flex items-center gap-2 bg-brand-sea text-white px-4 py-2 rounded-md hover:bg-brand-navy transition-colors font-medium shadow-sm"
                >
                    <Plus className="h-4 w-4" />
                    Dodaj z dysku
                </button>
            </div>

            <div className="bg-white p-6 rounded-xl border border-brand-sea/20 shadow-sm space-y-6">

                {/* Search */}
                <div className="relative max-w-md">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-4 w-4 text-brand-navy/40" />
                    </div>
                    <input
                        type="text"
                        className="block w-full pl-10 pr-3 py-2 border border-brand-sea/20 rounded-md leading-5 bg-white placeholder-brand-navy/40 focus:outline-none focus:ring-1 focus:ring-brand-sea focus:border-brand-sea sm:text-sm transition-colors text-brand-midnight"
                        placeholder="Szukaj dokumentów po nazwie lub opisie..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                {/* Table */}
                <div className="overflow-x-auto rounded-lg border border-brand-sea/10">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-brand-navy uppercase bg-brand-sea/5 border-b border-brand-sea/10">
                            <tr>
                                <th scope="col" className="px-6 py-4 font-semibold">Nazwa dokumentu</th>
                                <th scope="col" className="px-6 py-4 font-semibold">Opis (Metadane)</th>
                                <th scope="col" className="px-6 py-4 font-semibold text-center">Dodano</th>
                                <th scope="col" className="px-6 py-4 font-semibold text-right">Akcje</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-8 text-center text-brand-navy/60">
                                        <div className="flex justify-center items-center gap-2">
                                            <div className="w-4 h-4 rounded-full bg-brand-sea/50 animate-ping"></div>
                                            Ładowanie bazy wiedzy...
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredDocs.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center">
                                        <div className="mx-auto w-12 h-12 bg-brand-sea/5 rounded-full flex items-center justify-center mb-3">
                                            <FileText className="h-6 w-6 text-brand-sea/50" />
                                        </div>
                                        <p className="text-brand-midnight font-medium">Brak dodanych dokumentów</p>
                                        <p className="text-brand-navy/50 text-sm mt-1">Dodaj swój pierwszy plik z dysku, aby wczytać tekst.</p>
                                    </td>
                                </tr>
                            ) : (
                                filteredDocs.map((doc) => (
                                    <tr
                                        key={doc.id}
                                        className="bg-white border-b border-brand-sea/5 hover:bg-brand-sea/5 cursor-pointer transition-colors"
                                        onClick={() => setSelectedDoc(doc)}
                                    >
                                        <td className="px-6 py-4 font-medium text-brand-midnight flex items-center gap-3">
                                            <div className="p-2 bg-brand-sea/10 rounded-md text-brand-sea">
                                                <FileText className="h-4 w-4" />
                                            </div>
                                            <span className="truncate max-w-[250px]">{doc.name}</span>
                                        </td>
                                        <td className="px-6 py-4 text-brand-navy/60 truncate max-w-[300px]">
                                            {doc.description || '-'}
                                        </td>
                                        <td className="px-6 py-4 text-brand-navy/60 whitespace-nowrap text-center">
                                            {formatDate(doc.createdAt)}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={(e) => promptDelete(e, doc)}
                                                    className="p-2 text-brand-bordeaux hover:bg-brand-bordeaux/10 rounded-md transition-colors"
                                                    title="Usuń z bazy"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <ConfirmDeleteModal
                isOpen={deleteModalOpen}
                onClose={() => setDeleteModalOpen(false)}
                onConfirm={confirmDelete}
                docName={docToDelete?.name || ''}
                isDeleting={isDeleting}
            />
        </div>
    );
}
