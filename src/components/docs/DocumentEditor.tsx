import { useState, useRef, useEffect, useMemo } from 'react';
import mammoth from 'mammoth';
import TurndownService from 'turndown';
import {
    ArrowLeft, Save, Eye, Edit3, Sparkles,
    Tag, Lightbulb, Wrench, CheckSquare, BookOpen, Upload,
    MessageSquare, Send, Loader2, BarChart2, Clock, Plus, Pencil, Check, X, AlertCircle
} from 'lucide-react';
import {
    saveDocument, updateDocument,
    getChatSessions, getChatMessagesBySession,
    createChatSession, saveChatMessage, updateChatSession, saveChatAnalysisToSession,
    type DocumentBase, type ChatMessage, type ChatSession, type ChatAnalysis
} from '../../lib/docs';
import { analyzeDocumentWithAI, chatWithDocument, analyzeChatWithAI } from '../../lib/ai';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

type ViewMode = 'edit' | 'preview' | 'chat';

export interface DocumentEditorHandle {
    save: () => Promise<boolean>;
}

export function DocumentEditor({
    onBack,
    onSaved,
    onUnsavedChanges,
    editorRef,
    initialDoc,
    defaultTab = 'preview',
    defaultSessionId,
}: {
    onBack: () => void;
    onSaved: () => void;
    onUnsavedChanges?: (hasChanges: boolean) => void;
    editorRef?: React.MutableRefObject<DocumentEditorHandle | null>;
    initialDoc?: DocumentBase | null;
    defaultTab?: ViewMode;
    defaultSessionId?: string;
}) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const chatEndRef = useRef<HTMLDivElement>(null);

    // ── Document state ──
    const [file, setFile] = useState<File | null>(null);
    const [name, setName] = useState(initialDoc?.name || '');
    const [description] = useState(initialDoc?.description || '');
    const [content, setContent] = useState(initialDoc?.content || '');
    const [isCompany, setIsCompany] = useState(initialDoc?.isCompany ?? false);
    const [isLoading, setIsLoading] = useState(false);
    const [viewMode, setViewMode] = useState<ViewMode>(defaultTab);

    // ── Document AI fields ──
    const [documentType, setDocumentType] = useState(initialDoc?.documentType || '');
    const [mainTopic, setMainTopic] = useState(initialDoc?.mainTopic || '');
    const [tags, setTags] = useState(initialDoc?.tags?.join(', ') || '');
    const [tldr, setTldr] = useState(initialDoc?.tldr || '');
    const [keyFindings, setKeyFindings] = useState(initialDoc?.keyFindings?.join('\n') || '');
    const [usage, setUsage] = useState(initialDoc?.usage || '');
    const [actionItems, setActionItems] = useState(initialDoc?.actionItems?.join('\n') || '');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [docMetrics, setDocMetrics] = useState<DocumentBase['docMetrics']>(initialDoc?.docMetrics);

    // ── Chat state ──
    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [chatInput, setChatInput] = useState('');
    const [isChatLoading, setIsChatLoading] = useState(false);
    const [sessionsLoaded, setSessionsLoaded] = useState(false);

    // ── Metric Editing state ──
    const [editingDocMetric, setEditingDocMetric] = useState<keyof NonNullable<DocumentBase['docMetrics']> | null>(null);
    const [editingDocMetricValue, setEditingDocMetricValue] = useState<string>('');
    const [editingChatMetric, setEditingChatMetric] = useState<keyof ChatAnalysis['metrics'] | null>(null);
    const [editingChatMetricValue, setEditingChatMetricValue] = useState<string>('');

    // ── Track unsaved changes ──
    const [showUnsavedModal, setShowUnsavedModal] = useState(false);

    const hasUnsavedChanges = useMemo(() => {
        if (!initialDoc) {
            // New document: any content means unsaved changes
            return name !== '' || description !== '' || content !== '' || file !== null;
        }
        // Existing document: compare fields
        return name !== (initialDoc.name || '')
            || description !== (initialDoc.description || '')
            || content !== (initialDoc.content || '')
            || isCompany !== (initialDoc.isCompany ?? false)
            || documentType !== (initialDoc.documentType || '')
            || mainTopic !== (initialDoc.mainTopic || '')
            || tags !== (initialDoc.tags?.join(', ') || '')
            || tldr !== (initialDoc.tldr || '')
            || keyFindings !== (initialDoc.keyFindings?.join('\n') || '')
            || usage !== (initialDoc.usage || '')
            || actionItems !== (initialDoc.actionItems?.join('\n') || '')
            || JSON.stringify(docMetrics || {}) !== JSON.stringify(initialDoc.docMetrics || {});
    }, [initialDoc, name, description, content, file, isCompany, documentType, mainTopic, tags, tldr, keyFindings, usage, actionItems, docMetrics]);

    useEffect(() => {
        onUnsavedChanges?.(hasUnsavedChanges);
    }, [hasUnsavedChanges, onUnsavedChanges]);

    // ── Chat analysis state ──
    const [chatAnalysis, setChatAnalysis] = useState<ChatAnalysis | null>(null);
    const [isAnalyzingChat, setIsAnalyzingChat] = useState(false);

    // ── Load sessions on mount (not just when Chat tab opened) ──
    useEffect(() => {
        if (initialDoc?.id && !sessionsLoaded) {
            getChatSessions(initialDoc.id).then(async s => {
                setSessions(s);
                setSessionsLoaded(true);
                // Auto-load a specific session if provided (e.g. from ChatsView)
                if (defaultSessionId) {
                    const target = s.find(sess => sess.id === defaultSessionId);
                    if (target) {
                        const msgs = await getChatMessagesBySession(initialDoc.id!, defaultSessionId);
                        setActiveSessionId(defaultSessionId);
                        setChatMessages(msgs);
                        setChatAnalysis(target.analysis ?? null);
                    }
                }
            }).catch(console.error);
        }
    }, [initialDoc?.id, sessionsLoaded, defaultSessionId]);

    // ── Auto-create session when entering Chat tab ──
    useEffect(() => {
        if (viewMode === 'chat' && sessionsLoaded && !activeSessionId && initialDoc?.id && !defaultSessionId) {
            createChatSession(initialDoc.id).then(sessionId => {
                const newSession: ChatSession = {
                    id: sessionId,
                    title: `Sesja ${new Date().toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' })} ${new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}`,
                    messageCount: 0,
                    lastMessageAt: null,
                    createdAt: new Date(),
                };
                setSessions(prev => [newSession, ...prev]);
                setActiveSessionId(sessionId);
                setChatMessages([]);
                setChatAnalysis(null);
            }).catch(console.error);
        }
    }, [viewMode, sessionsLoaded, activeSessionId, initialDoc?.id, defaultSessionId]);

    // ── Auto scroll ──
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatMessages]);

    // ── File handling ──
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;
        setFile(selectedFile);
        if (!name) setName(selectedFile.name);
        setIsLoading(true);
        try {
            if (selectedFile.name.endsWith('.docx')) {
                const arrayBuffer = await selectedFile.arrayBuffer();
                const result = await mammoth.convertToHtml({ arrayBuffer }, {
                    ignoreEmptyParagraphs: false,
                    convertImage: mammoth.images.imgElement(() => Promise.resolve({ src: '' }))
                });
                const td = new TurndownService({ headingStyle: 'atx', bulletListMarker: '-', codeBlockStyle: 'fenced' });
                td.remove('img');
                setContent(td.turndown(result.value));
            } else if (selectedFile.name.endsWith('.txt') || selectedFile.type === 'text/plain') {
                setContent(await selectedFile.text());
            } else {
                alert('Niewspierany format. Obsługujemy .txt i .docx.');
            }
        } catch (err) {
            console.error(err);
            alert('Wystąpił błąd podczas odczytu pliku.');
        } finally {
            setIsLoading(false);
        }
    };

    // ── Document AI analysis ──
    const handleAnalyzeAI = async () => {
        if (!content.trim()) return;
        setIsAnalyzing(true);
        try {
            const result = await analyzeDocumentWithAI(content);
            setDocumentType(result.documentType || '');
            setMainTopic(result.mainTopic || '');
            setTags(result.tags?.join(', ') || '');
            setTldr(result.tldr || '');
            setKeyFindings(result.keyFindings?.join('\n') || '');
            setUsage(result.usage || '');
            setActionItems(result.actionItems?.join('\n') || '');
            if (result.metrics) setDocMetrics(result.metrics);
        } catch (error) {
            console.error(error);
            alert('Nie udało się przeprowadzić analizy AI.');
        } finally {
            setIsAnalyzing(false);
        }
    };

    // ── Save document ──
    const handleSave = async (): Promise<boolean> => {
        if (!content.trim()) { alert('Upewnij się, że dokument ma treść do zapisu.'); return false; }
        setIsLoading(true);
        try {
            const dataToSave = {
                name: name || file?.name || 'Bez nazwy',
                description, content,
                size: file?.size || initialDoc?.size || 0,
                type: file?.type || initialDoc?.type || 'text/plain',
                documentType, mainTopic,
                tags: tags.split(',').map(t => t.trim()).filter(Boolean),
                tldr,
                keyFindings: keyFindings.split('\n').map(t => t.trim()).filter(Boolean),
                usage,
                actionItems: actionItems.split('\n').map(t => t.trim()).filter(Boolean),
                isCompany,
                ...(docMetrics ? { docMetrics } : {}),
            };
            if (initialDoc?.id) await updateDocument(initialDoc.id, dataToSave);
            else await saveDocument(dataToSave);

            // Re-sync local state so hasUnsavedChanges returns false immediately
            if (initialDoc) {
                initialDoc.name = dataToSave.name;
                initialDoc.description = dataToSave.description;
                initialDoc.content = dataToSave.content;
                initialDoc.isCompany = dataToSave.isCompany;
                initialDoc.documentType = dataToSave.documentType;
                initialDoc.mainTopic = dataToSave.mainTopic;
                initialDoc.tags = dataToSave.tags;
                initialDoc.tldr = dataToSave.tldr;
                initialDoc.keyFindings = dataToSave.keyFindings;
                initialDoc.usage = dataToSave.usage;
                initialDoc.actionItems = dataToSave.actionItems;
                initialDoc.docMetrics = dataToSave.docMetrics;
            }

            onSaved();
            return true;
        } catch (err) {
            console.error(err);
            alert('Nie udało się zapisać dokumentu.');
            return false;
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (editorRef) {
            editorRef.current = { save: handleSave };
        }
    }, [editorRef, handleSave]);

    // ── Start new chat session ──
    const handleNewSession = async () => {
        if (!initialDoc?.id) { alert('Zapisz dokument przed rozpoczęciem czatu.'); return; }
        const sessionId = await createChatSession(initialDoc.id);
        const newSession: ChatSession = {
            id: sessionId,
            title: `Sesja ${new Date().toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' })} ${new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}`,
            messageCount: 0,
            lastMessageAt: null,
            createdAt: new Date(),
        };
        setSessions(prev => [newSession, ...prev]);
        setActiveSessionId(sessionId);
        setChatMessages([]);
        setChatAnalysis(null);
    };

    // ── Load session ──
    const handleLoadSession = async (session: ChatSession) => {
        if (!initialDoc?.id || !session.id) return;
        const msgs = await getChatMessagesBySession(initialDoc.id, session.id);
        setActiveSessionId(session.id);
        setChatMessages(msgs);
        setChatAnalysis(session.analysis ?? null);
    };

    // ── Send chat message ──
    const handleSendChat = async () => {
        const msg = chatInput.trim();
        if (!msg || !content.trim() || !activeSessionId || !initialDoc?.id) return;

        const userMsg: ChatMessage = { sessionId: activeSessionId, role: 'user', text: msg, createdAt: new Date() };
        setChatMessages(prev => [...prev, userMsg]);
        setChatInput('');
        setIsChatLoading(true);

        saveChatMessage(initialDoc.id, { sessionId: activeSessionId, role: 'user', text: msg }).catch(console.error);

        try {
            const history = chatMessages.map(m => ({ role: m.role, text: m.text }));
            const aiText = await chatWithDocument(content, name || 'Dokument', msg, history);
            const aiMsg: ChatMessage = { sessionId: activeSessionId, role: 'model', text: aiText, createdAt: new Date() };
            setChatMessages(prev => [...prev, aiMsg]);
            saveChatMessage(initialDoc.id, { sessionId: activeSessionId, role: 'model', text: aiText }).catch(console.error);

            // Update session meta
            const newCount = chatMessages.length + 2;
            updateChatSession(initialDoc.id, activeSessionId, {
                messageCount: newCount,
                lastMessageAt: new Date(),
            }).catch(console.error);
            setSessions(prev => prev.map(s => s.id === activeSessionId ? { ...s, messageCount: newCount } : s));
        } catch (err) {
            console.error(err);
            setChatMessages(prev => [...prev, { sessionId: activeSessionId, role: 'model', text: '⚠️ Błąd komunikacji z AI.', createdAt: new Date() }]);
        } finally {
            setIsChatLoading(false);
        }
    };

    // ── Analyze chat ──
    const handleAnalyzeChat = async () => {
        if (!initialDoc?.id || !activeSessionId || chatMessages.length < 2) return;
        setIsAnalyzingChat(true);
        try {
            const result = await analyzeChatWithAI(
                chatMessages.map(m => ({ role: m.role, text: m.text })),
                name || 'Dokument'
            );
            const analysis: ChatAnalysis = {
                title: result.title,
                tags: result.tags,
                situationSummary: result.situationSummary,
                progressAndResults: result.progressAndResults,
                openIssues: result.openIssues,
                metrics: result.metrics,
            };
            setChatAnalysis(analysis);
            await saveChatAnalysisToSession(initialDoc.id, activeSessionId, analysis);
            // Update sessions list title
            setSessions(prev => prev.map(s => s.id === activeSessionId ? { ...s, title: result.title, analysis } : s));
        } catch (err) {
            console.error(err);
            alert('Nie udało się przeprowadzić analizy chatu.');
        } finally {
            setIsAnalyzingChat(false);
        }
    };

    // ── Style helpers ──
    const card = 'rounded-xl border border-brand-sea/20 bg-white p-4 shadow-sm';
    const inp = 'w-full border border-brand-sea/20 rounded-md p-2 text-sm focus:border-brand-sea outline-none transition-colors text-brand-midnight';
    const lbl = 'block text-sm font-medium text-brand-navy mb-1';
    const btnBase = 'flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-colors text-sm whitespace-nowrap';
    const tabBtn = (active: boolean) =>
        `flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${active ? 'bg-brand-sea/10 text-brand-sea' : 'text-brand-navy/60 hover:text-brand-midnight hover:bg-brand-sea/5'}`;

    const formatDate = (d: any) => {
        if (!d) return '';
        const date = d.toDate ? d.toDate() : new Date(d);
        return date.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="space-y-4 w-full">

            {/* ══ HEADER ══ */}
            <div className="flex items-center gap-3 flex-wrap">
                <button
                    onClick={() => hasUnsavedChanges ? setShowUnsavedModal(true) : onBack()}
                    className="p-2 hover:bg-brand-sea/5 rounded-full transition-colors text-brand-sea shrink-0"
                >
                    <ArrowLeft className="h-5 w-5" />
                </button>
                <h2 className="text-xl font-bold tracking-tight text-brand-midnight flex-1 min-w-0 truncate">
                    {initialDoc ? 'Edycja dokumentu' : 'Dodaj nowy dokument'}
                </h2>
                {/* Dokument firmowy checkbox */}
                <label className="flex items-center gap-1.5 cursor-pointer select-none shrink-0">
                    <input
                        type="checkbox"
                        checked={isCompany}
                        onChange={e => setIsCompany(e.target.checked)}
                        className="w-4 h-4 rounded border-brand-sea/30 text-brand-sea accent-brand-sea cursor-pointer"
                    />
                    <span className="text-sm text-brand-midnight font-medium whitespace-nowrap">N1</span>
                </label>
                <input
                    value={name}
                    onChange={e => setName(e.target.value)}
                    autoComplete="off"
                    className="border border-brand-sea/20 rounded-md px-3 py-2 text-sm focus:border-brand-sea outline-none transition-colors text-brand-midnight w-44"
                    placeholder="Nazwa dokumentu..."
                />
                <input ref={fileInputRef} type="file" accept=".txt,.docx,text/plain" onChange={handleFileChange} className="hidden" />
                <button onClick={() => fileInputRef.current?.click()} className={`${btnBase} border border-brand-sea/30 text-brand-sea hover:bg-brand-sea/5`}>
                    <Upload className="h-4 w-4" />
                    {file ? file.name.slice(0, 14) + (file.name.length > 14 ? '…' : '') : 'Wybierz plik'}
                </button>
                <button onClick={handleAnalyzeAI} disabled={isAnalyzing || !content.trim()}
                    className={`${btnBase} bg-gradient-to-r from-brand-turquoise to-brand-sea text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed`}>
                    <Sparkles className="h-4 w-4" />
                    {isAnalyzing ? 'Analizowanie...' : 'Uruchom Analizę AI'}
                </button>
                <button onClick={handleSave} disabled={isLoading || !content.trim()}
                    className={`${btnBase} bg-brand-sea text-white hover:bg-brand-navy disabled:opacity-50 disabled:cursor-not-allowed`}>
                    <Save className="h-4 w-4" />
                    {initialDoc ? 'Zapisz zmiany' : 'Zapisz w bazie'}
                </button>
            </div>

            {/* ══ WIERSZ 0: Metryki AI dokumentu — widoczne po analizie ══ */}
            {docMetrics && (
                <>
                    <div className="grid grid-cols-4 gap-4">
                        {[
                            {
                                id: 'actionability' as const,
                                label: 'Gotowość do działania',
                                score: docMetrics.actionability,
                                note: docMetrics.actionabilityNote,
                                desc: 'czy dokument to gotowa instrukcja SOP/checklista, czy tylko ramy strategiczne?',
                            },
                            {
                                id: 'impact' as const,
                                label: 'Siła wpływu',
                                score: docMetrics.impact,
                                note: docMetrics.impactNote,
                                desc: 'czy to game-changer w swojej dziedzinie, czy drobna optymalizacja?',
                            },
                            {
                                id: 'ease' as const,
                                label: 'Łatwość wdrożenia',
                                score: docMetrics.ease,
                                note: docMetrics.easeNote,
                                desc: 'im wyżej, tym łatwiej — czy możesz wdrożyć to dziś wieczór?',
                            },
                            {
                                id: 'evergreen' as const,
                                label: 'Termin ważności',
                                score: docMetrics.evergreen,
                                note: docMetrics.evergreenNote,
                                desc: 'czy ta wiedza będzie aktualna za 5 lat, czy wygaśnie za kilka miesięcy?',
                            },
                        ].map(m => (
                            <div key={m.label} className={`${card} flex flex-col`}>
                                <div className="flex items-start justify-between mb-1">
                                    <span className="text-sm font-semibold text-brand-midnight leading-tight">{m.label}</span>
                                    <button
                                        onClick={() => { setEditingDocMetric(m.id); setEditingDocMetricValue(String(m.score)); }}
                                        className="text-brand-sea/50 hover:text-brand-sea p-1"
                                    >
                                        <Pencil className="w-3 h-3" />
                                    </button>
                                </div>
                                <div className="flex items-center gap-2 my-1.5 min-h-[28px]">
                                    {editingDocMetric === m.id ? (
                                        <div className="flex items-center gap-1 w-full">
                                            <input
                                                type="number" min="1" max="10" step="0.1" autoFocus
                                                value={editingDocMetricValue}
                                                onChange={e => setEditingDocMetricValue(e.target.value)}
                                                className="w-16 border border-brand-sea/30 rounded px-1 text-sm font-bold text-brand-sea outline-none focus:border-brand-sea"
                                            />
                                            <button
                                                onClick={() => {
                                                    setDocMetrics(prev => prev ? { ...prev, [m.id]: Number(editingDocMetricValue) || 0 } : prev);
                                                    setEditingDocMetric(null);
                                                }}
                                                className="text-green-600 hover:bg-green-50 rounded p-1"
                                            >
                                                <Check className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => setEditingDocMetric(null)} className="text-brand-navy/60 hover:bg-brand-sea/10 rounded p-1">
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            <span className="text-2xl font-bold text-brand-sea">{m.score}</span>
                                            <span className="text-brand-navy/40 text-sm">/10</span>
                                            <div className="flex-1 bg-brand-sea/10 rounded-full h-1.5 ml-1">
                                                <div className="bg-brand-sea rounded-full h-1.5 transition-all" style={{ width: `${m.score * 10}%` }} />
                                            </div>
                                        </>
                                    )}
                                </div>
                                {m.note && <p className="text-[11px] text-brand-navy/70 leading-snug italic border-l-2 border-brand-sea/20 pl-2 mb-1">{m.note}</p>}
                                <p className="text-[10px] text-brand-navy/35 leading-snug mt-auto">{m.desc}</p>
                            </div>
                        ))}
                    </div>

                    {/* Overall score */}
                    <div className={`${card} flex items-center justify-between gap-6`}>
                        <div>
                            <div className="flex items-center gap-2 mb-0.5">
                                <h3 className="font-semibold text-brand-midnight flex items-center gap-2">
                                    <BarChart2 className="h-4 w-4 text-brand-turquoise" /> Ocena ogólna dokumentu
                                </h3>
                                <button
                                    onClick={() => { setEditingDocMetric('overall'); setEditingDocMetricValue(String(docMetrics.overall.toFixed(1))); }}
                                    className="text-brand-sea/50 hover:text-brand-sea p-1"
                                >
                                    <Pencil className="w-3 h-3" />
                                </button>
                            </div>
                            <p className="text-xs text-brand-navy/50">Średnia arytmetyczna 4 metryk: Gotowość · Wpływ · Łatwość · Trwałość</p>
                        </div>
                        <div className="shrink-0 text-right">
                            {editingDocMetric === 'overall' ? (
                                <div className="flex items-center justify-end gap-1 mb-1">
                                    <input
                                        type="number" min="1" max="10" step="0.1" autoFocus
                                        value={editingDocMetricValue}
                                        onChange={e => setEditingDocMetricValue(e.target.value)}
                                        className="w-20 border border-brand-sea/30 rounded px-1 text-2xl font-bold text-brand-sea outline-none focus:border-brand-sea text-right"
                                    />
                                    <button
                                        onClick={() => {
                                            setDocMetrics(prev => prev ? { ...prev, overall: Number(editingDocMetricValue) || 0 } : prev);
                                            setEditingDocMetric(null);
                                        }}
                                        className="text-green-600 hover:bg-green-50 rounded p-1"
                                    >
                                        <Check className="w-5 h-5" />
                                    </button>
                                    <button onClick={() => setEditingDocMetric(null)} className="text-brand-navy/60 hover:bg-brand-sea/10 rounded p-1">
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <span className="text-4xl font-bold text-brand-sea">{docMetrics.overall.toFixed(1)}</span>
                                    <span className="text-brand-navy/40 text-lg ml-1">/10</span>
                                    <div className="w-40 bg-brand-sea/10 rounded-full h-2 mt-1">
                                        <div className="bg-gradient-to-r from-brand-turquoise to-brand-sea rounded-full h-2 transition-all" style={{ width: `${docMetrics.overall * 10}%` }} />
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </>
            )}

            {/* ══ WIERSZ 1: TL;DR | Typ i temat | Tagi ══ */}
            <div className="grid grid-cols-3 gap-4">
                <div className={card}>
                    <h3 className="font-semibold text-brand-midnight flex items-center gap-2 mb-2">
                        <Sparkles className="h-4 w-4 text-brand-turquoise" /> TL;DR (Abstrakt)
                    </h3>
                    <textarea value={tldr} onChange={e => setTldr(e.target.value)} className={`${inp} resize-none h-36`} placeholder="Krótkie podsumowanie..." />
                </div>
                <div className={`${card} space-y-2`}>
                    <h3 className="font-semibold text-brand-midnight flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-brand-turquoise" /> Typ i temat
                    </h3>
                    <div>
                        <label className={lbl}>Typ dokumentu</label>
                        <input value={documentType} onChange={e => setDocumentType(e.target.value)} className={inp} placeholder="np. Raport, Umowa..." />
                    </div>
                    <div>
                        <label className={lbl}>Temat główny</label>
                        <input value={mainTopic} onChange={e => setMainTopic(e.target.value)} className={inp} placeholder="np. Marketing, AI..." />
                    </div>
                </div>
                <div className={card}>
                    <h3 className="font-semibold text-brand-midnight flex items-center gap-2 mb-2">
                        <Tag className="h-4 w-4 text-brand-turquoise" /> Tagi
                    </h3>
                    {/* Pills preview */}
                    {tags && (
                        <div className="flex flex-wrap gap-1.5 mb-2">
                            {tags.split(',').map(t => t.trim()).filter(Boolean).map((tag, i) => (
                                <span key={i} className="text-xs bg-brand-sea/10 text-brand-sea px-2.5 py-1 rounded-full">
                                    {tag}
                                </span>
                            ))}
                        </div>
                    )}
                    <input value={tags} onChange={e => setTags(e.target.value)} className={inp} placeholder="tag1, tag2, tag3..." />
                    <p className="text-xs text-brand-navy/50 mt-1">Oddziel przecinkami</p>
                </div>
            </div>

            {/* ══ WIERSZ 2: Wykorzystanie | Kluczowe Wnioski | Wymagane Akcje ══ */}
            <div className="grid grid-cols-3 gap-4">
                <div className={card}>
                    <h3 className="font-semibold text-brand-midnight flex items-center gap-2 mb-2">
                        <Wrench className="h-4 w-4 text-brand-turquoise" /> Wykorzystanie / Użycie
                    </h3>
                    <textarea value={usage} onChange={e => setUsage(e.target.value)} className={`${inp} resize-none h-52`} placeholder="Jak można wykorzystać ten dokument..." />
                </div>
                <div className={card}>
                    <h3 className="font-semibold text-brand-midnight flex items-center gap-2 mb-2">
                        <Lightbulb className="h-4 w-4 text-brand-turquoise" /> Kluczowe Wnioski
                    </h3>
                    <textarea value={keyFindings} onChange={e => setKeyFindings(e.target.value)} className={`${inp} resize-none h-52`} placeholder="Najważniejsze wnioski..." />
                </div>
                <div className={card}>
                    <h3 className="font-semibold text-brand-midnight flex items-center gap-2 mb-2">
                        <CheckSquare className="h-4 w-4 text-brand-turquoise" /> Wymagane Akcje
                    </h3>
                    <textarea value={actionItems} onChange={e => setActionItems(e.target.value)} className={`${inp} resize-none h-52`} placeholder="Co należy zrobić..." />
                </div>
            </div>

            {/* ══ WIERSZ 3: Edytor / Podgląd / Chat ══ */}
            <div className="rounded-xl border border-brand-sea/20 bg-white shadow-sm flex flex-col h-[640px] overflow-hidden">
                {/* Toolbar */}
                <div className="p-4 border-b border-brand-sea/10 bg-brand-sea/5 flex items-center justify-between shrink-0">
                    <div>
                        <h3 className="font-semibold text-brand-midnight">Treść dokumentu</h3>
                        <p className="text-xs text-brand-navy/60">
                            {viewMode === 'chat'
                                ? (activeSessionId ? `Aktywna sesja: ${sessions.find(s => s.id === activeSessionId)?.title ?? ''}` : 'Wybierz lub utwórz sesję')
                                : 'Markdown — edytuj lub podgląd'}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* Chat-specific buttons */}
                        {viewMode === 'chat' && (
                            <>
                                <button
                                    onClick={handleNewSession}
                                    className={`${btnBase} border border-brand-sea/30 text-brand-sea hover:bg-brand-sea/5 text-xs px-3 py-1.5`}
                                >
                                    <Plus className="h-3.5 w-3.5" /> Nowa sesja
                                </button>
                                <button
                                    onClick={handleAnalyzeChat}
                                    disabled={isAnalyzingChat || chatMessages.length < 2}
                                    className={`${btnBase} bg-gradient-to-r from-brand-turquoise to-brand-sea text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-xs px-3 py-1.5`}
                                >
                                    <BarChart2 className="h-3.5 w-3.5" />
                                    {isAnalyzingChat ? 'Analizuję...' : 'Analizuj Chat'}
                                </button>
                            </>
                        )}
                        {/* Tab switcher */}
                        <div className="flex bg-white rounded-lg p-1 border border-brand-sea/20 gap-0.5">
                            <button onClick={() => setViewMode('edit')} className={tabBtn(viewMode === 'edit')}>
                                <Edit3 className="h-4 w-4" /> Edycja
                            </button>
                            <button onClick={() => setViewMode('preview')} className={tabBtn(viewMode === 'preview')}>
                                <Eye className="h-4 w-4" /> Podgląd
                            </button>
                            <button onClick={() => setViewMode('chat')} className={tabBtn(viewMode === 'chat')}>
                                <MessageSquare className="h-4 w-4" /> Chat
                            </button>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 relative bg-white overflow-hidden">
                    {isLoading && (
                        <div className="absolute inset-0 bg-white/50 flex items-center justify-center z-10 backdrop-blur-sm">
                            <div className="text-brand-sea font-medium flex items-center gap-2">
                                <div className="h-4 w-4 border-2 border-brand-sea border-t-transparent rounded-full animate-spin" />
                                Przetwarzanie...
                            </div>
                        </div>
                    )}

                    {/* Edit */}
                    {viewMode === 'edit' && (
                        <textarea value={content} onChange={e => setContent(e.target.value)}
                            className="w-full h-full p-6 resize-none outline-none text-brand-midnight font-mono text-sm leading-relaxed"
                            placeholder="Wybierz plik z dysku, aby wczytać jego treść..." />
                    )}

                    {/* Preview */}
                    {viewMode === 'preview' && (
                        <div className="absolute inset-0 p-6 overflow-y-auto">
                            <div className="prose prose-sm md:prose-base max-w-none text-brand-midnight leading-relaxed">
                                {content
                                    ? <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
                                    : <span className="text-brand-navy/40 italic">Brak treści do podglądu...</span>}
                            </div>
                        </div>
                    )}

                    {/* Chat */}
                    {viewMode === 'chat' && (
                        <div className="absolute inset-0 flex flex-col">
                            {/* No session selected */}
                            {!activeSessionId && (
                                <div className="flex-1 flex flex-col items-center justify-center gap-3">
                                    <div className="w-12 h-12 bg-brand-turquoise/10 rounded-full flex items-center justify-center">
                                        <MessageSquare className="h-6 w-6 text-brand-turquoise" />
                                    </div>
                                    <p className="text-brand-midnight font-medium">Wybierz sesję lub utwórz nową</p>
                                    <p className="text-brand-navy/50 text-sm">Użyj przycisku „Nowa sesja" powyżej</p>
                                </div>
                            )}

                            {/* Messages */}
                            {activeSessionId && (
                                <>
                                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                                        {chatMessages.length === 0 && (
                                            <div className="text-center text-brand-navy/50 text-sm mt-8">
                                                Nowa sesja — zadaj pierwsze pytanie o ten dokument.
                                            </div>
                                        )}
                                        {chatMessages.map((msg, i) => (
                                            <div key={msg.id || i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                                <div className={`max-w-[75%] rounded-xl px-4 py-2.5 text-sm leading-relaxed ${msg.role === 'user'
                                                    ? 'bg-brand-sea text-white rounded-br-none'
                                                    : 'bg-brand-sea/5 text-brand-midnight border border-brand-sea/10 rounded-bl-none'
                                                    }`}>
                                                    <div className="prose prose-sm max-w-none">
                                                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.text}</ReactMarkdown>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        {isChatLoading && (
                                            <div className="flex justify-start">
                                                <div className="bg-brand-sea/5 border border-brand-sea/10 rounded-xl rounded-bl-none px-4 py-2.5 flex items-center gap-2">
                                                    <Loader2 className="h-4 w-4 text-brand-turquoise animate-spin" />
                                                    <span className="text-sm text-brand-navy/60">AI pisze...</span>
                                                </div>
                                            </div>
                                        )}
                                        <div ref={chatEndRef} />
                                    </div>

                                    {/* Input */}
                                    <div className="p-3 border-t border-brand-sea/10 flex gap-2 shrink-0">
                                        {!content.trim() ? (
                                            <p className="text-xs text-brand-bordeaux self-center">Wczytaj treść dokumentu, aby uruchomić chat.</p>
                                        ) : (
                                            <>
                                                <input
                                                    value={chatInput}
                                                    onChange={e => setChatInput(e.target.value)}
                                                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendChat(); } }}
                                                    placeholder="Zadaj pytanie o dokument... (Enter = wyślij)"
                                                    className="flex-1 border border-brand-sea/20 rounded-lg px-3 py-2 text-sm focus:border-brand-sea outline-none transition-colors text-brand-midnight"
                                                />
                                                <button onClick={handleSendChat} disabled={!chatInput.trim() || isChatLoading}
                                                    className="flex items-center gap-1.5 bg-brand-sea text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-navy transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                                                    <Send className="h-4 w-4" /> Wyślij
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* ══ WIERSZ 4: Tabela sesji — zawsze widoczna gdy dokument jest zapisany ══ */}
            {initialDoc?.id && (
                <div className={card}>
                    <h3 className="font-semibold text-brand-midnight flex items-center gap-2 mb-3">
                        <Clock className="h-4 w-4 text-brand-turquoise" /> Historia sesji tego dokumentu
                    </h3>
                    {sessions.length === 0 ? (
                        <p className="text-sm text-brand-navy/50 py-4 text-center">Brak sesji — utwórz pierwszą klikając „Nowa sesja"</p>
                    ) : (
                        <div className="overflow-x-auto rounded-lg border border-brand-sea/10">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-brand-navy uppercase bg-brand-sea/5 border-b border-brand-sea/10">
                                    <tr>
                                        <th className="px-4 py-3 font-semibold">Tytuł sesji</th>
                                        <th className="px-4 py-3 font-semibold text-center">Wiadomości</th>
                                        <th className="px-4 py-3 font-semibold">Data</th>
                                        <th className="px-4 py-3 font-semibold">Analiza</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sessions.map(session => (
                                        <tr
                                            key={session.id}
                                            onClick={() => handleLoadSession(session)}
                                            className={`border-b border-brand-sea/5 cursor-pointer transition-colors ${activeSessionId === session.id
                                                ? 'bg-brand-sea/10'
                                                : 'hover:bg-brand-sea/5'
                                                }`}
                                        >
                                            <td className="px-4 py-3 font-medium text-brand-midnight flex items-center gap-2">
                                                <MessageSquare className="h-3.5 w-3.5 text-brand-turquoise shrink-0" />
                                                {session.title}
                                                {activeSessionId === session.id && (
                                                    <span className="text-xs bg-brand-sea text-white px-1.5 py-0.5 rounded-md ml-1">aktywna</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-brand-sea/10 text-brand-sea font-semibold text-xs">
                                                    {session.messageCount}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-brand-navy/60 text-xs whitespace-nowrap">
                                                {formatDate(session.createdAt)}
                                            </td>
                                            <td className="px-4 py-3">
                                                {session.analysis ? (
                                                    <span className="text-xs bg-brand-turquoise/10 text-brand-turquoise px-2 py-0.5 rounded-full">✓ Gotowa</span>
                                                ) : (
                                                    <span className="text-xs text-brand-navy/40">—</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* ══ Analiza chatu — widoczna gdy gotowa ══ */}
            {chatAnalysis && (
                <>
                    {/* Row 5: Metryki ROI — 4 karty */}
                    {chatAnalysis.metrics && (
                        <>
                            <div className="grid grid-cols-4 gap-4">
                                {[
                                    {
                                        id: 'timeSavings' as const,
                                        label: 'Zaoszczędzony czas',
                                        score: chatAnalysis.metrics.timeSavings,
                                        weight: '×0.4',
                                        note: chatAnalysis.metrics.timeSavingsNote,
                                        desc: 'ile godzin lub dni musiałbyś poświęcić na samodzielne szukanie i testowanie, gdybyś nie miał pomocy AI?',
                                    },
                                    {
                                        id: 'completeness' as const,
                                        label: 'Gotowość do użycia',
                                        score: chatAnalysis.metrics.completeness,
                                        weight: '×0.3',
                                        note: chatAnalysis.metrics.completenessNote,
                                        desc: 'czy dostałeś finalne gotowe rozwiązanie podane na tacy, czy tylko ogólną wskazówkę do dalszej pracy?',
                                    },
                                    {
                                        id: 'criticality' as const,
                                        label: 'Waga problemu',
                                        score: chatAnalysis.metrics.criticality,
                                        weight: '×0.2',
                                        note: chatAnalysis.metrics.criticalityNote,
                                        desc: 'czy ten problem całkowicie wstrzymywał twoją pracę, czy była to luźna ciekawostka lub opcjonalna poprawka?',
                                    },
                                    {
                                        id: 'transferability' as const,
                                        label: 'Przydatność na przyszłość',
                                        score: chatAnalysis.metrics.transferability,
                                        weight: '×0.1',
                                        note: chatAnalysis.metrics.transferabilityNote,
                                        desc: 'czy wypracowana tu wiedza przyda się wielokrotnie w innych projektach, czy to jednorazowa akcja?',
                                    },
                                ].map(m => (
                                    <div key={m.label} className={`${card} flex flex-col`}>
                                        <div className="flex items-start justify-between mb-1">
                                            <span className="text-sm font-semibold text-brand-midnight leading-tight">{m.label}</span>
                                            <div className="flex items-center gap-1">
                                                <span className="text-xs text-brand-navy/40 shrink-0">{m.weight}</span>
                                                <button
                                                    onClick={() => { setEditingChatMetric(m.id); setEditingChatMetricValue(String(m.score)); }}
                                                    className="text-brand-sea/50 hover:text-brand-sea p-1"
                                                >
                                                    <Pencil className="w-3 h-3" />
                                                </button>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 my-1.5 min-h-[28px]">
                                            {editingChatMetric === m.id ? (
                                                <div className="flex items-center gap-1 w-full">
                                                    <input
                                                        type="number" min="1" max="10" step="0.1" autoFocus
                                                        value={editingChatMetricValue}
                                                        onChange={e => setEditingChatMetricValue(e.target.value)}
                                                        className="w-16 border border-brand-sea/30 rounded px-1 text-sm font-bold text-brand-sea outline-none focus:border-brand-sea"
                                                    />
                                                    <button
                                                        onClick={() => {
                                                            setChatAnalysis(prev => prev ? {
                                                                ...prev,
                                                                metrics: { ...prev.metrics, [m.id]: Number(editingChatMetricValue) || 0 }
                                                            } : prev);
                                                            setEditingChatMetric(null);
                                                        }}
                                                        className="text-green-600 hover:bg-green-50 rounded p-1"
                                                    >
                                                        <Check className="w-4 h-4" />
                                                    </button>
                                                    <button onClick={() => setEditingChatMetric(null)} className="text-brand-navy/60 hover:bg-brand-sea/10 rounded p-1">
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <>
                                                    <span className="text-2xl font-bold text-brand-sea">{m.score}</span>
                                                    <span className="text-brand-navy/40 text-sm">/10</span>
                                                    <div className="flex-1 bg-brand-sea/10 rounded-full h-1.5 ml-1">
                                                        <div className="bg-brand-sea rounded-full h-1.5 transition-all" style={{ width: `${m.score * 10}%` }} />
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                        {m.note && <p className="text-[11px] text-brand-navy/70 leading-snug italic border-l-2 border-brand-sea/20 pl-2 mb-1">{m.note}</p>}
                                        <p className="text-[10px] text-brand-navy/35 leading-snug mt-auto">{m.desc}</p>
                                    </div>
                                ))}
                            </div>

                            {/* ROI summary */}
                            <div className={`${card} flex items-center justify-between gap-6`}>
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="font-semibold text-brand-midnight flex items-center gap-2">
                                            <BarChart2 className="h-4 w-4 text-brand-turquoise" /> Wartość chatu (ROI)
                                        </h3>
                                        <button
                                            onClick={() => { setEditingChatMetric('roi'); setEditingChatMetricValue(String(chatAnalysis.metrics.roi.toFixed(1))); }}
                                            className="text-brand-sea/50 hover:text-brand-sea p-1"
                                        >
                                            <Pencil className="w-3 h-3" />
                                        </button>
                                    </div>
                                    <p className="text-xs text-brand-navy/50">{chatAnalysis.metrics.roiBreakdown}</p>
                                </div>
                                <div className="shrink-0 text-right">
                                    {editingChatMetric === 'roi' ? (
                                        <div className="flex items-center justify-end gap-1 mb-1">
                                            <input
                                                type="number" min="1" max="10" step="0.1" autoFocus
                                                value={editingChatMetricValue}
                                                onChange={e => setEditingChatMetricValue(e.target.value)}
                                                className="w-20 border border-brand-sea/30 rounded px-1 text-2xl font-bold text-brand-sea outline-none focus:border-brand-sea text-right"
                                            />
                                            <button
                                                onClick={() => {
                                                    setChatAnalysis(prev => prev ? {
                                                        ...prev,
                                                        metrics: { ...prev.metrics, roi: Number(editingChatMetricValue) || 0 }
                                                    } : prev);
                                                    setEditingChatMetric(null);
                                                }}
                                                className="text-green-600 hover:bg-green-50 rounded p-1"
                                            >
                                                <Check className="w-5 h-5" />
                                            </button>
                                            <button onClick={() => setEditingChatMetric(null)} className="text-brand-navy/60 hover:bg-brand-sea/10 rounded p-1">
                                                <X className="w-5 h-5" />
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            <span className="text-4xl font-bold text-brand-sea">{chatAnalysis.metrics.roi.toFixed(1)}</span>
                                            <span className="text-brand-navy/40 text-lg ml-1">/10</span>
                                            <div className="w-40 bg-brand-sea/10 rounded-full h-2 mt-1">
                                                <div className="bg-gradient-to-r from-brand-turquoise to-brand-sea rounded-full h-2 transition-all" style={{ width: `${chatAnalysis.metrics.roi * 10}%` }} />
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </>
                    )}

                    {/* Row 6: Tytuł | Tagi | Zarys sytuacji */}
                    <div className="grid grid-cols-3 gap-4">
                        <div className={card}>
                            <h3 className="font-semibold text-brand-midnight flex items-center gap-2 mb-2">
                                <BarChart2 className="h-4 w-4 text-brand-turquoise" /> Tytuł rozmowy
                            </h3>
                            <p className="text-sm text-brand-midnight font-medium">{chatAnalysis.title}</p>
                        </div>
                        <div className={card}>
                            <h3 className="font-semibold text-brand-midnight flex items-center gap-2 mb-2">
                                <Tag className="h-4 w-4 text-brand-turquoise" /> Tagi
                            </h3>
                            <div className="flex flex-wrap gap-1.5">
                                {chatAnalysis.tags.map((t, i) => (
                                    <span key={i} className="text-xs bg-brand-sea/10 text-brand-sea px-2 py-1 rounded-full">{t}</span>
                                ))}
                            </div>
                        </div>
                        <div className={card}>
                            <h3 className="font-semibold text-brand-midnight flex items-center gap-2 mb-2">
                                <Lightbulb className="h-4 w-4 text-brand-turquoise" /> Zarys sytuacji
                            </h3>
                            <p className="text-sm text-brand-navy/80 leading-relaxed">{chatAnalysis.situationSummary}</p>
                        </div>
                    </div>

                    {/* Row 7: Przebieg i wynik | Otwarte kwestie */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className={card}>
                            <h3 className="font-semibold text-brand-midnight flex items-center gap-2 mb-2">
                                <CheckSquare className="h-4 w-4 text-brand-turquoise" /> Przebieg i wynik
                            </h3>
                            <div className="prose prose-sm max-w-none text-brand-navy/80">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>{chatAnalysis.progressAndResults}</ReactMarkdown>
                            </div>
                        </div>
                        <div className={card}>
                            <h3 className="font-semibold text-brand-midnight flex items-center gap-2 mb-2">
                                <Wrench className="h-4 w-4 text-brand-turquoise" /> Otwarte kwestie
                            </h3>
                            <p className="text-sm text-brand-navy/80 leading-relaxed">{chatAnalysis.openIssues}</p>
                        </div>
                    </div>
                </>
            )}

            {/* Unsaved Changes Warning Modal */}
            {showUnsavedModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-brand-midnight/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6">
                            <div className="flex items-center gap-4 mb-4 text-amber-600">
                                <div className="p-3 bg-amber-50 rounded-full">
                                    <AlertCircle className="w-6 h-6" />
                                </div>
                                <h3 className="text-xl font-bold text-brand-midnight">Niezapisane zmiany</h3>
                            </div>
                            <p className="text-brand-navy/80 mb-6">
                                Masz niezapisane zmiany w aktualnym dokumencie. Jeśli wyjdziesz z edytora bez zapisu, zmiany zostaną utracone. Czy na pewno chcesz opuścić edytor?
                            </p>
                            <div className="flex justify-end gap-3 flex-wrap">
                                <button
                                    onClick={() => setShowUnsavedModal(false)}
                                    className="px-4 py-2 text-sm font-medium text-brand-navy hover:text-brand-midnight bg-brand-sea/5 hover:bg-brand-sea/10 border border-brand-sea/10 transition-colors rounded-lg"
                                >
                                    Dokończ edycję
                                </button>
                                <button
                                    onClick={() => { setShowUnsavedModal(false); onBack(); }}
                                    className="px-4 py-2 text-sm font-medium text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 transition-colors rounded-lg"
                                >
                                    Porzuć zmiany
                                </button>
                                <button
                                    onClick={async () => {
                                        const success = await handleSave();
                                        if (success) {
                                            setShowUnsavedModal(false);
                                        }
                                    }}
                                    className="px-4 py-2 text-sm font-bold text-white bg-brand-sea hover:bg-brand-sea/90 transition-colors rounded-lg shadow-sm"
                                >
                                    Zapisz i kontynuuj
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
