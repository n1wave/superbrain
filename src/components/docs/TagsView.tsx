import { useState, useEffect } from 'react';
import { Tag, Search, Check, X, Loader2 } from 'lucide-react';
import { getAllTags, renameTagInAllDocs, type TagInfo } from '../../lib/docs';

export function TagsView({
    onNavigateToDocsWithTag,
}: {
    onNavigateToDocsWithTag: (tag: string) => void;
}) {
    const [tags, setTags] = useState<TagInfo[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [editingTag, setEditingTag] = useState<string | null>(null);
    const [editValue, setEditValue] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const load = () => {
        setIsLoading(true);
        getAllTags()
            .then(setTags)
            .catch(console.error)
            .finally(() => setIsLoading(false));
    };

    useEffect(() => { load(); }, []);

    const startEdit = (tag: TagInfo) => {
        setEditingTag(tag.name);
        setEditValue(tag.name);
    };

    const cancelEdit = () => {
        setEditingTag(null);
        setEditValue('');
    };

    const saveEdit = async (oldName: string) => {
        const newName = editValue.trim();
        if (!newName || newName === oldName) { cancelEdit(); return; }
        setIsSaving(true);
        try {
            await renameTagInAllDocs(oldName, newName);
            cancelEdit();
            load();
        } catch (e) {
            console.error(e);
            alert('Nie udało się zmienić nazwy tagu.');
        } finally {
            setIsSaving(false);
        }
    };

    const filtered = tags.filter(t =>
        t.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h2 className="text-2xl font-bold text-brand-midnight tracking-tight">Tagi</h2>
                    <p className="text-sm text-brand-navy/60 mt-0.5">{tags.length} unikalnych tagów w bazie</p>
                </div>
            </div>

            {/* Search */}
            <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-navy/40" />
                <input
                    type="text"
                    className="block w-full pl-10 pr-3 py-2 border border-brand-sea/20 rounded-md text-sm bg-white placeholder-brand-navy/40 focus:outline-none focus:ring-1 focus:ring-brand-sea focus:border-brand-sea text-brand-midnight"
                    placeholder="Szukaj tagu..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                />
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-brand-sea/20 shadow-sm overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-brand-navy uppercase bg-brand-sea/5 border-b border-brand-sea/10">
                        <tr>
                            <th className="px-6 py-4 font-semibold">Tag</th>
                            <th className="px-6 py-4 font-semibold text-center">Dokumenty</th>
                            <th className="px-6 py-4 font-semibold text-right">Akcje</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <tr>
                                <td colSpan={3} className="px-6 py-8 text-center text-brand-navy/60">
                                    <div className="flex justify-center items-center gap-2">
                                        <Loader2 className="h-4 w-4 animate-spin text-brand-sea" />
                                        Ładowanie tagów...
                                    </div>
                                </td>
                            </tr>
                        ) : filtered.length === 0 ? (
                            <tr>
                                <td colSpan={3} className="px-6 py-12 text-center">
                                    <div className="mx-auto w-12 h-12 bg-brand-sea/5 rounded-full flex items-center justify-center mb-3">
                                        <Tag className="h-6 w-6 text-brand-sea/50" />
                                    </div>
                                    <p className="text-brand-midnight font-medium">Brak tagów</p>
                                    <p className="text-brand-navy/50 text-xs mt-1">Tagi pojawią się po uruchomieniu Analizy AI na dokumentach</p>
                                </td>
                            </tr>
                        ) : filtered.map(tag => (
                            <tr key={tag.name} className="border-b border-brand-sea/5 hover:bg-brand-sea/5 transition-colors">
                                {/* Tag name — editable */}
                                <td className="px-6 py-4">
                                    {editingTag === tag.name ? (
                                        <input
                                            autoFocus
                                            value={editValue}
                                            onChange={e => setEditValue(e.target.value)}
                                            onKeyDown={e => {
                                                if (e.key === 'Enter') saveEdit(tag.name);
                                                if (e.key === 'Escape') cancelEdit();
                                            }}
                                            className="border border-brand-sea rounded-md px-2 py-1 text-sm text-brand-midnight focus:outline-none focus:ring-1 focus:ring-brand-sea w-48"
                                        />
                                    ) : (
                                        <button
                                            onClick={() => onNavigateToDocsWithTag(tag.name)}
                                            className="inline-flex items-center gap-1.5 bg-brand-sea/10 text-brand-sea text-xs px-3 py-1.5 rounded-full hover:bg-brand-sea/20 transition-colors font-medium"
                                        >
                                            <Tag className="h-3 w-3" />
                                            {tag.name}
                                        </button>
                                    )}
                                </td>

                                {/* Count */}
                                <td className="px-6 py-4 text-center">
                                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-brand-sea/10 text-brand-sea font-semibold text-xs">
                                        {tag.count}
                                    </span>
                                </td>

                                {/* Actions */}
                                <td className="px-6 py-4 text-right">
                                    {editingTag === tag.name ? (
                                        <div className="flex items-center justify-end gap-1">
                                            <button
                                                onClick={() => saveEdit(tag.name)}
                                                disabled={isSaving}
                                                className="p-1.5 text-green-600 hover:bg-green-50 rounded-md transition-colors disabled:opacity-50"
                                                title="Zapisz"
                                            >
                                                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                                            </button>
                                            <button
                                                onClick={cancelEdit}
                                                className="p-1.5 text-brand-navy/60 hover:bg-brand-sea/10 rounded-md transition-colors"
                                                title="Anuluj"
                                            >
                                                <X className="h-4 w-4" />
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => startEdit(tag)}
                                            className="text-xs text-brand-navy/50 hover:text-brand-midnight hover:bg-brand-sea/10 px-2 py-1 rounded-md transition-colors"
                                        >
                                            Zmień nazwę
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
