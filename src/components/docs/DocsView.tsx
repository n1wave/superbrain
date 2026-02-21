import { useState, useEffect, useRef } from 'react';
import { Trash2, Search, Plus, FileText, MessageSquare, Tag, X, Pencil, Loader2, Check, Upload, Sparkles } from 'lucide-react';
import mammoth from 'mammoth';
import TurndownService from 'turndown';
import { getDocuments, deleteDocument, updateDocument, saveDocument } from '../../lib/docs';
import type { DocumentBase } from '../../lib/docs';
import { DocumentEditor, type DocumentEditorHandle } from './DocumentEditor';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import { ChatsView } from './ChatsView';

import { analyzeDocumentWithAI } from '../../lib/ai';

type Tab = 'docs' | 'chats';

export function DocsView({ initialTag, onTagFilterCleared, onUnsavedChanges, forceResetTrigger, editorRef }: {
    initialTag?: string;
    onTagFilterCleared?: () => void;
    onUnsavedChanges?: (hasChanges: boolean) => void;
    forceResetTrigger?: number;
    editorRef?: React.MutableRefObject<DocumentEditorHandle | null>;
}) {
    const [activeTab, setActiveTab] = useState<Tab>('docs');
    const [documents, setDocuments] = useState<DocumentBase[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isBulkUploading, setIsBulkUploading] = useState(false);
    const bulkFileInputRef = useRef<HTMLInputElement>(null);
    const [analyzingDocId, setAnalyzingDocId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTagFilter, setActiveTagFilter] = useState<string | null>(initialTag ?? null);
    const [showCompanyOnly, setShowCompanyOnly] = useState(false);
    type SortCol = 'name' | 'tags' | 'date';
    const [sortCol, setSortCol] = useState<SortCol>('date');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
    const [isEditing, setIsEditing] = useState(false);
    const [selectedDoc, setSelectedDoc] = useState<DocumentBase | null>(null);
    // When opening a doc from ChatsView, default to chat tab + load specific session
    const [openToChat, setOpenToChat] = useState(false);
    const [openToSessionId, setOpenToSessionId] = useState<string | null>(null);

    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [docToDelete, setDocToDelete] = useState<DocumentBase | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Inline rename state
    const [editingDocId, setEditingDocId] = useState<string | null>(null);
    const [editDocName, setEditDocName] = useState('');
    const [isRenaming, setIsRenaming] = useState(false);

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

    const handleBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        setIsBulkUploading(true);
        let uploadedCount = 0;

        try {
            for (const file of files) {
                let content = '';

                if (file.name.endsWith('.docx')) {
                    const arrayBuffer = await file.arrayBuffer();
                    const result = await mammoth.convertToHtml({ arrayBuffer }, {
                        ignoreEmptyParagraphs: false,
                        convertImage: mammoth.images.imgElement(() => Promise.resolve({ src: '' }))
                    });
                    const td = new TurndownService({ headingStyle: 'atx', bulletListMarker: '-', codeBlockStyle: 'fenced' });
                    td.remove('img');
                    content = td.turndown(result.value);
                } else if (file.name.endsWith('.txt') || file.type === 'text/plain') {
                    content = await file.text();
                } else {
                    console.warn(`Pominięto ${file.name}: Niewspierany format.`);
                    continue;
                }

                if (!content.trim()) continue;

                await saveDocument({
                    name: file.name,
                    description: '',
                    content,
                    size: file.size,
                    type: file.type || 'text/plain',
                    documentType: '',
                    mainTopic: '',
                    tags: [],
                    tldr: '',
                    keyFindings: [],
                    usage: '',
                    actionItems: [],
                    isCompany: false,
                });

                uploadedCount++;
            }

            if (uploadedCount > 0) {
                await fetchDocuments();
            } else {
                alert('Nie udało się wczytać żadnego pliku (nieobsługiwany format lub pusty plik).');
            }
        } catch (error) {
            console.error("Błąd podczas bulk uploadu:", error);
            alert("Wystąpił błąd podczas wgrywania plików.");
        } finally {
            setIsBulkUploading(false);
            if (bulkFileInputRef.current) bulkFileInputRef.current.value = '';
        }
    };

    useEffect(() => {
        fetchDocuments();
    }, []);

    useEffect(() => {
        if (forceResetTrigger && forceResetTrigger > 0) {
            setIsEditing(false);
            setSelectedDoc(null);
            setOpenToChat(false);
            setOpenToSessionId(null);
        }
    }, [forceResetTrigger]);

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

    const startRename = (e: React.MouseEvent, doc: DocumentBase) => {
        e.stopPropagation();
        setEditingDocId(doc.id!);
        setEditDocName(doc.name);
    };

    const cancelRename = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        setEditingDocId(null);
        setEditDocName('');
    };

    const saveRename = async (e: React.MouseEvent, doc: DocumentBase) => {
        e.stopPropagation();
        const newName = editDocName.trim();
        if (!newName || newName === doc.name) { cancelRename(); return; }
        setIsRenaming(true);
        try {
            await updateDocument(doc.id!, { name: newName });
            setDocuments(docs => docs.map(d => d.id === doc.id ? { ...d, name: newName } : d));
            if (selectedDoc && selectedDoc.id === doc.id) {
                setSelectedDoc(prev => prev ? ({ ...prev, name: newName } as DocumentBase) : null);
            }
            cancelRename();
        } catch (error) {
            console.error("Error renaming document:", error);
            alert("Nie udało się zmienić nazwy dokumentu.");
        } finally {
            setIsRenaming(false);
        }
    };

    const handleInlineAnalyze = async (e: React.MouseEvent, doc: DocumentBase) => {
        e.stopPropagation();
        if (!doc.id || !doc.content) {
            alert('Dokument nie posiada treści do analizy.');
            return;
        }

        setAnalyzingDocId(doc.id);
        try {
            const result = await analyzeDocumentWithAI(doc.content);
            const updates = {
                documentType: result.documentType || '',
                mainTopic: result.mainTopic || '',
                tags: result.tags || [],
                tldr: result.tldr || '',
                keyFindings: result.keyFindings || [],
                usage: result.usage || '',
                actionItems: result.actionItems || [],
                docMetrics: result.metrics,
            };

            await updateDocument(doc.id, updates);
            setDocuments(docs => docs.map(d => d.id === doc.id ? { ...d, ...updates } : d));

            if (activeTagFilter && !updates.tags.includes(activeTagFilter)) {
                // if we filtered by tag, it might disappear from the view, which is fine
            }
        } catch (error) {
            console.error("Błąd podczas analizy AI:", error);
            alert("Nie udało się przeanalizować dokumentu.");
        } finally {
            setAnalyzingDocId(null);
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

    const toggleSort = (col: 'name' | 'tags' | 'date') => {
        if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setSortCol(col); setSortDir('asc'); }
    };
    const sortIcon = (col: 'name' | 'tags' | 'date') =>
        sortCol === col ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ' ↕';

    const filteredDocs = documents
        .filter(doc => {
            const matchesSearch =
                doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                doc.description?.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesTag = !activeTagFilter || (doc.tags ?? []).includes(activeTagFilter);
            const matchesCompany = !showCompanyOnly || !!doc.isCompany;
            return matchesSearch && matchesTag && matchesCompany;
        })
        .sort((a, b) => {
            let cmp = 0;
            if (sortCol === 'name') cmp = (a.name ?? '').localeCompare(b.name ?? '');
            else if (sortCol === 'tags') cmp = ((a.tags ?? []).join(',').localeCompare((b.tags ?? []).join(',')));
            else {
                const tA = (a.createdAt as any)?.toDate?.()?.getTime?.() ?? new Date(a.createdAt as any).getTime() ?? 0;
                const tB = (b.createdAt as any)?.toDate?.()?.getTime?.() ?? new Date(b.createdAt as any).getTime() ?? 0;
                cmp = tA - tB;
            }
            return sortDir === 'asc' ? cmp : -cmp;
        });

    const clearTagFilter = () => {
        setActiveTagFilter(null);
        onTagFilterCleared?.();
    };

    // Document editor view
    if (isEditing || selectedDoc) {
        return (
            <DocumentEditor
                editorRef={editorRef}
                initialDoc={selectedDoc}
                defaultTab={openToChat ? 'chat' : 'preview'}
                defaultSessionId={openToSessionId ?? undefined}
                onUnsavedChanges={onUnsavedChanges}
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
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setIsEditing(true)}
                        className="flex items-center gap-2 bg-brand-sea text-white px-4 py-2 rounded-md hover:bg-brand-navy transition-colors font-medium shadow-sm"
                    >
                        <Plus className="h-4 w-4" />
                        Dodaj
                    </button>

                    <input
                        ref={bulkFileInputRef}
                        type="file"
                        accept=".txt,.docx,text/plain"
                        multiple
                        onChange={handleBulkUpload}
                        className="hidden"
                    />
                    <button
                        onClick={() => bulkFileInputRef.current?.click()}
                        disabled={isBulkUploading}
                        className="flex items-center gap-2 bg-white text-brand-sea border border-brand-sea/20 px-4 py-2 rounded-md hover:bg-brand-sea/5 transition-colors font-medium shadow-sm disabled:opacity-50"
                    >
                        {isBulkUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                        {isBulkUploading ? 'Wgrywanie...' : 'Dodaj bulk'}
                    </button>
                </div>

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
                <div className="space-y-6">
                    {/* Search bar outside card */}
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

                    <div className="bg-white p-6 rounded-xl border border-brand-sea/20 shadow-sm space-y-6">
                        {/* Tag filter & Firmowy */}
                        <div className="space-y-3">

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

                            {/* Firmowy checkbox */}
                            <label className="flex items-center gap-2 cursor-pointer select-none w-fit">
                                <input
                                    type="checkbox"
                                    checked={showCompanyOnly}
                                    onChange={e => setShowCompanyOnly(e.target.checked)}
                                    className="w-4 h-4 rounded accent-brand-sea cursor-pointer"
                                />
                                <span className="text-sm text-brand-midnight font-medium">N1</span>
                            </label>
                        </div>

                        <div className="overflow-x-auto rounded-lg border border-brand-sea/10">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-brand-navy uppercase bg-brand-sea/5 border-b border-brand-sea/10">
                                    <tr>
                                        <th scope="col" className="px-6 py-4 font-semibold">
                                            <button onClick={() => toggleSort('name')} className="hover:text-brand-sea transition-colors">
                                                Nazwa dokumentu{sortIcon('name')}
                                            </button>
                                        </th>
                                        <th scope="col" className="px-6 py-4 font-semibold w-[40%]">
                                            TL;DR
                                        </th>
                                        <th scope="col" className="px-6 py-4 font-semibold w-[20%]">
                                            <button onClick={() => toggleSort('tags')} className="hover:text-brand-sea transition-colors">
                                                Tagi{sortIcon('tags')}
                                            </button>
                                        </th>
                                        <th scope="col" className="px-6 py-4 font-semibold text-center">
                                            <button onClick={() => toggleSort('date')} className="hover:text-brand-sea transition-colors">
                                                Dodano{sortIcon('date')}
                                            </button>
                                        </th>
                                        <th scope="col" className="px-6 py-4 font-semibold text-right">Akcje</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {isLoading ? (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-8 text-center text-brand-navy/60">
                                                <div className="flex justify-center items-center gap-2">
                                                    <div className="w-4 h-4 rounded-full bg-brand-sea/50 animate-ping" />
                                                    Ładowanie bazy wiedzy...
                                                </div>
                                            </td>
                                        </tr>
                                    ) : filteredDocs.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-12 text-center">
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
                                                    <div className="p-2 bg-brand-sea/10 rounded-md text-brand-sea shrink-0">
                                                        <FileText className="h-4 w-4" />
                                                    </div>
                                                    {editingDocId === doc.id ? (
                                                        <input
                                                            autoFocus
                                                            value={editDocName}
                                                            onChange={e => setEditDocName(e.target.value)}
                                                            onClick={e => e.stopPropagation()}
                                                            onKeyDown={e => {
                                                                if (e.key === 'Enter') saveRename(e as any, doc);
                                                                if (e.key === 'Escape') cancelRename(e as any);
                                                            }}
                                                            className="border border-brand-sea rounded-md px-2 py-1 text-sm text-brand-midnight focus:outline-none focus:ring-1 focus:ring-brand-sea w-full max-w-[250px]"
                                                        />
                                                    ) : (
                                                        <span className="truncate max-w-[250px]">{doc.name}</span>
                                                    )}
                                                    {doc.isCompany && (
                                                        <span className="shrink-0 text-[10px] bg-brand-bordeaux/10 text-brand-bordeaux px-2 py-0.5 rounded-full font-semibold uppercase tracking-wide">Firmowy</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-brand-navy/80 text-[12px] leading-tight align-top">
                                                    {doc.tldr ? <div className="whitespace-pre-wrap">{doc.tldr}</div> : <span className="text-brand-navy/30">—</span>}
                                                </td>
                                                <td className="px-6 py-4 align-top">
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
                                                    {editingDocId === doc.id ? (
                                                        <div className="flex items-center justify-end gap-1">
                                                            <button
                                                                onClick={e => saveRename(e, doc)}
                                                                disabled={isRenaming}
                                                                className="p-1.5 text-green-600 hover:bg-green-50 rounded-md transition-colors disabled:opacity-50"
                                                                title="Zapisz"
                                                            >
                                                                {isRenaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                                                            </button>
                                                            <button
                                                                onClick={cancelRename}
                                                                className="p-1.5 text-brand-navy/60 hover:bg-brand-sea/10 rounded-md transition-colors"
                                                                title="Anuluj"
                                                            >
                                                                <X className="h-4 w-4" />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center justify-end gap-1">
                                                            <button
                                                                onClick={e => handleInlineAnalyze(e, doc)}
                                                                disabled={analyzingDocId === doc.id}
                                                                className="p-1.5 text-brand-turquoise hover:text-white hover:bg-brand-turquoise rounded-md transition-colors disabled:opacity-50"
                                                                title="Analiza AI"
                                                            >
                                                                {analyzingDocId === doc.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                                                            </button>
                                                            <button
                                                                onClick={e => startRename(e, doc)}
                                                                className="p-1.5 text-brand-navy/50 hover:text-brand-midnight hover:bg-brand-sea/10 rounded-md transition-colors"
                                                                title="Zmień nazwę"
                                                            >
                                                                <Pencil className="h-4 w-4" />
                                                            </button>
                                                            <button
                                                                onClick={e => promptDelete(e, doc)}
                                                                className="p-1.5 text-brand-bordeaux hover:bg-brand-bordeaux/10 rounded-md transition-colors"
                                                                title="Usuń z bazy"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </button>
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )
            }

            {/* ── Chats tab ── */}
            {
                activeTab === 'chats' && (
                    <ChatsView onOpenDocSession={(docId, sessionId) => handleOpenDocFromChat(docId, sessionId)} />
                )
            }

            <ConfirmDeleteModal
                isOpen={deleteModalOpen}
                onClose={() => setDeleteModalOpen(false)}
                onConfirm={confirmDelete}
                docName={docToDelete?.name || ''}
                isDeleting={isDeleting}
            />
        </div >
    );
}
