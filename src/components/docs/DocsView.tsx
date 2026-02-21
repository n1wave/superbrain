import { useState, useEffect } from 'react';
import { Trash2, Search, Plus, FileText, MessageSquare, Tag, X } from 'lucide-react';
import { getDocuments, deleteDocument } from '../../lib/docs';
import type { DocumentBase } from '../../lib/docs';
import { DocumentEditor } from './DocumentEditor';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import { ChatsView } from './ChatsView';

type Tab = 'docs' | 'chats';

export function DocsView({ initialTag, onTagFilterCleared }: {
    initialTag?: string;
    onTagFilterCleared?: () => void;
}) {
    const [activeTab, setActiveTab] = useState<Tab>('docs');
    const [documents, setDocuments] = useState<DocumentBase[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTagFilter, setActiveTagFilter] = useState<string | null>(initialTag ?? null);
    const [isEditing, setIsEditing] = useState(false);
    const [selectedDoc, setSelectedDoc] = useState<DocumentBase | null>(null);
    // When opening a doc from ChatsView, default to chat tab + load specific session
    const [openToChat, setOpenToChat] = useState(false);
    const [openToSessionId, setOpenToSessionId] = useState<string | null>(null);

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

    const handleOpenDocFromChat = (docId: string, sessionId?: string) => {
        const doc = documents.find(d => d.id === docId);
        if (doc) {
            setOpenToChat(true);
            setOpenToSessionId(sessionId ?? null);
            setSelectedDoc(doc);
        }
    };

    const formatDate = (dateData: any) => {
        if (!dateData) return 'N/A';
        if (dateData.toDate) {
            return dateData.toDate().toLocaleDateString('pl-PL', { year: 'numeric', month: 'short', day: 'numeric' });
        }
        return new Date(dateData).toLocaleDateString();
    };

    // Collect all unique tags from all documents
    const allTags = Array.from(
        new Set(documents.flatMap(d => d.tags ?? []).filter(Boolean))
    ).sort();

    const filteredDocs = documents.filter(doc => {
        const matchesSearch =
            doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            doc.description?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesTag = !activeTagFilter || (doc.tags ?? []).includes(activeTagFilter);
        return matchesSearch && matchesTag;
    });

    const clearTagFilter = () => {
        setActiveTagFilter(null);
        onTagFilterCleared?.();
    };

    // Document editor view
    if (isEditing || selectedDoc) {
        return (
            <DocumentEditor
                initialDoc={selectedDoc}
                defaultTab={openToChat ? 'chat' : 'preview'}
                defaultSessionId={openToSessionId ?? undefined}
                onBack={() => {
                    setIsEditing(false);
                    setSelectedDoc(null);
                    setOpenToChat(false);
                    setOpenToSessionId(null);
                }}
                onSaved={() => {
                    setIsEditing(false);
                    setSelectedDoc(null);
                    setOpenToChat(false);
                    setOpenToSessionId(null);
                    fetchDocuments();
                }}
            />
        );
    }

    const tabBtn = (tab: Tab) =>
        `flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === tab
            ? 'border-brand-sea text-brand-sea'
            : 'border-transparent text-brand-navy/60 hover:text-brand-midnight hover:border-brand-sea/30'
        }`;

    return (
        <div className="space-y-6">
            {/* Header row: Add button + tabs */}
            <div className="flex items-center justify-between">
                <button
                    onClick={() => setIsEditing(true)}
                    className="flex items-center gap-2 bg-brand-sea text-white px-4 py-2 rounded-md hover:bg-brand-navy transition-colors font-medium shadow-sm"
                >
                    <Plus className="h-4 w-4" />
                    Dodaj z dysku
                </button>

                {/* Tab switcher */}
                <div className="flex border-b border-brand-sea/10">
                    <button className={tabBtn('docs')} onClick={() => setActiveTab('docs')}>
                        <FileText className="h-4 w-4" />
                        Dokumenty
                    </button>
                    <button className={tabBtn('chats')} onClick={() => setActiveTab('chats')}>
                        <MessageSquare className="h-4 w-4" />
                        Chaty
                    </button>
                </div>
            </div>

            {/* ── Docs tab ── */}
            {activeTab === 'docs' && (
                <div className="bg-white p-6 rounded-xl border border-brand-sea/20 shadow-sm space-y-6">
                    {/* Search + tag filter */}
                    <div className="space-y-3">
                        <div className="relative max-w-md">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Search className="h-4 w-4 text-brand-navy/40" />
                            </div>
                            <input
                                type="text"
                                className="block w-full pl-10 pr-3 py-2 border border-brand-sea/20 rounded-md leading-5 bg-white placeholder-brand-navy/40 focus:outline-none focus:ring-1 focus:ring-brand-sea focus:border-brand-sea sm:text-sm transition-colors text-brand-midnight"
                                placeholder="Szukaj dokumentów po nazwie lub opisie..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                            />
                        </div>

                        {/* Tag filter chips */}
                        {allTags.length > 0 && (
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs text-brand-navy/50 flex items-center gap-1 shrink-0">
                                    <Tag className="h-3 w-3" /> Filtr:
                                </span>
                                {activeTagFilter && (
                                    <button
                                        onClick={clearTagFilter}
                                        className="inline-flex items-center gap-1 text-xs bg-brand-sea text-white px-2.5 py-1 rounded-full font-medium"
                                    >
                                        {activeTagFilter}
                                        <X className="h-3 w-3" />
                                    </button>
                                )}
                                {allTags.filter(t => t !== activeTagFilter).map(tag => (
                                    <button
                                        key={tag}
                                        onClick={() => setActiveTagFilter(tag)}
                                        className="inline-flex items-center text-xs bg-brand-sea/10 text-brand-sea px-2.5 py-1 rounded-full hover:bg-brand-sea/20 transition-colors"
                                    >
                                        {tag}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="overflow-x-auto rounded-lg border border-brand-sea/10">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-brand-navy uppercase bg-brand-sea/5 border-b border-brand-sea/10">
                                <tr>
                                    <th scope="col" className="px-6 py-4 font-semibold">Nazwa dokumentu</th>
                                    <th scope="col" className="px-6 py-4 font-semibold">Tagi</th>
                                    <th scope="col" className="px-6 py-4 font-semibold text-center">Dodano</th>
                                    <th scope="col" className="px-6 py-4 font-semibold text-right">Akcje</th>
                                </tr>
                            </thead>
                            <tbody>
                                {isLoading ? (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-8 text-center text-brand-navy/60">
                                            <div className="flex justify-center items-center gap-2">
                                                <div className="w-4 h-4 rounded-full bg-brand-sea/50 animate-ping" />
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
                                    filteredDocs.map(doc => (
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
                                            <td className="px-6 py-4">
                                                <div className="flex flex-wrap gap-1.5">
                                                    {(doc.tags ?? []).length > 0 ? (
                                                        (doc.tags ?? []).map((tag, i) => (
                                                            <button
                                                                key={i}
                                                                onClick={e => { e.stopPropagation(); setActiveTagFilter(tag); }}
                                                                className={`text-xs px-2.5 py-1 rounded-full transition-colors ${activeTagFilter === tag
                                                                        ? 'bg-brand-sea text-white'
                                                                        : 'bg-brand-sea/10 text-brand-sea hover:bg-brand-sea/20'
                                                                    }`}
                                                            >
                                                                {tag}
                                                            </button>
                                                        ))
                                                    ) : (
                                                        <span className="text-brand-navy/30 text-xs">—</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-brand-navy/60 whitespace-nowrap text-center">
                                                {formatDate(doc.createdAt)}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={e => promptDelete(e, doc)}
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
            )}

            {/* ── Chats tab ── */}
            {activeTab === 'chats' && (
                <ChatsView onOpenDocSession={(docId, sessionId) => handleOpenDocFromChat(docId, sessionId)} />
            )}

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
