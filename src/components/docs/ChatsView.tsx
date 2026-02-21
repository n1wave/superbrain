import { useState, useEffect } from 'react';
import { MessageSquare, Search, ExternalLink, BarChart2 } from 'lucide-react';
import { getAllChatSessions, type SessionWithDoc } from '../../lib/docs';

export function ChatsView({ onOpenDocSession }: {
    onOpenDocSession: (docId: string, sessionId: string) => void;
}) {
    const [sessions, setSessions] = useState<SessionWithDoc[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        getAllChatSessions()
            .then(setSessions)
            .catch(console.error)
            .finally(() => setIsLoading(false));
    }, []);

    const formatDate = (d: any) => {
        if (!d) return '—';
        const date = d.toDate ? d.toDate() : new Date(d);
        return date.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    const filtered = sessions.filter(s =>
        s.docName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.title?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="bg-white p-6 rounded-xl border border-brand-sea/20 shadow-sm space-y-6">
            <div className="relative max-w-md">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-4 w-4 text-brand-navy/40" />
                </div>
                <input
                    type="text"
                    className="block w-full pl-10 pr-3 py-2 border border-brand-sea/20 rounded-md text-sm bg-white placeholder-brand-navy/40 focus:outline-none focus:ring-1 focus:ring-brand-sea focus:border-brand-sea transition-colors text-brand-midnight"
                    placeholder="Szukaj po nazwie dokumentu lub sesji..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                />
            </div>

            <div className="overflow-x-auto rounded-lg border border-brand-sea/10">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-brand-navy uppercase bg-brand-sea/5 border-b border-brand-sea/10">
                        <tr>
                            <th className="px-6 py-4 font-semibold">Sesja</th>
                            <th className="px-6 py-4 font-semibold">Dokument</th>
                            <th className="px-6 py-4 font-semibold text-center">Wiad.</th>
                            <th className="px-6 py-4 font-semibold text-center">Analiza</th>
                            <th className="px-6 py-4 font-semibold">Data</th>
                            <th className="px-6 py-4 font-semibold text-right">Akcje</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-8 text-center text-brand-navy/60">
                                    <div className="flex justify-center items-center gap-2">
                                        <div className="w-4 h-4 rounded-full bg-brand-sea/50 animate-ping" />
                                        Ładowanie sesji...
                                    </div>
                                </td>
                            </tr>
                        ) : filtered.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-12 text-center">
                                    <div className="mx-auto w-12 h-12 bg-brand-sea/5 rounded-full flex items-center justify-center mb-3">
                                        <MessageSquare className="h-6 w-6 text-brand-sea/50" />
                                    </div>
                                    <p className="text-brand-midnight font-medium">Brak sesji chatów</p>
                                    <p className="text-brand-navy/50 text-sm mt-1">
                                        Otwórz dokument → Chat → Nowa sesja
                                    </p>
                                </td>
                            </tr>
                        ) : (
                            filtered.map(s => (
                                <tr
                                    key={`${s.docId}-${s.id}`}
                                    className="bg-white border-b border-brand-sea/5 hover:bg-brand-sea/5 cursor-pointer transition-colors"
                                    onClick={() => onOpenDocSession(s.docId, s.id!)}
                                >
                                    <td className="px-6 py-4 font-medium text-brand-midnight">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-brand-turquoise/10 rounded-md text-brand-turquoise shrink-0">
                                                <MessageSquare className="h-4 w-4" />
                                            </div>
                                            <span className="truncate max-w-[200px]">{s.title || 'Bez tytułu'}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-brand-navy/60 text-xs truncate max-w-[160px]">
                                        {s.docName}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-brand-sea/10 text-brand-sea font-semibold text-xs">
                                            {s.messageCount ?? 0}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        {s.analysis
                                            ? <span className="text-xs bg-brand-turquoise/10 text-brand-turquoise px-2 py-0.5 rounded-full flex items-center gap-1 justify-center"><BarChart2 className="h-3 w-3" /> Gotowa</span>
                                            : <span className="text-xs text-brand-navy/40">—</span>
                                        }
                                    </td>
                                    <td className="px-6 py-4 text-brand-navy/60 text-xs whitespace-nowrap">
                                        {formatDate(s.createdAt)}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={e => { e.stopPropagation(); onOpenDocSession(s.docId, s.id!); }}
                                            className="p-2 text-brand-sea hover:bg-brand-sea/10 rounded-md transition-colors"
                                            title="Otwórz sesję"
                                        >
                                            <ExternalLink className="h-4 w-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
