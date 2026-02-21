import React, { useState } from 'react';
import mammoth from 'mammoth';
import TurndownService from 'turndown';
import { ArrowLeft, Save, FileText, Eye, Edit3 } from 'lucide-react';
import { saveDocument } from '../../lib/docs';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export function DocumentEditor({
    onBack,
    onSaved
}: {
    onBack: () => void;
    onSaved: () => void;
}) {
    const [file, setFile] = useState<File | null>(null);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [content, setContent] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [previewMode, setPreviewMode] = useState<'edit' | 'preview'>('preview');

    // Funkcja czytająca zawartość w zależności od formatu pliku
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;

        setFile(selectedFile);
        if (!name) setName(selectedFile.name);

        setIsLoading(true);
        try {
            if (selectedFile.name.endsWith('.docx')) {
                const arrayBuffer = await selectedFile.arrayBuffer();
                // Konwersja na HTML z zachowaniem pogrubień, ale ignorująca obrazki na poziomie mammoth
                const options = {
                    ignoreEmptyParagraphs: false,
                    convertImage: mammoth.images.imgElement(function (_image) {
                        return Promise.resolve({ src: "" }); // lub pominięcie, aczkolwiek pusty src zniweluje wielkie stringi
                    })
                };
                const result = await mammoth.convertToHtml({ arrayBuffer }, options);
                // Konwersja HTML -> Markdown
                const turndownService = new TurndownService({
                    headingStyle: 'atx',
                    bulletListMarker: '-',
                    codeBlockStyle: 'fenced'
                });
                // Usuwamy tagi img z HTML, aby zapobiec dodawania długich tekstów Base64 do Markdowna
                turndownService.remove('img');
                const markdown = turndownService.turndown(result.value);
                setContent(markdown);
            } else if (selectedFile.name.endsWith('.txt') || selectedFile.type === 'text/plain') {
                const text = await selectedFile.text();
                setContent(text);
            } else {
                alert("Niewspierany format. Obsługujemy .txt i .docx.");
            }
        } catch (err) {
            console.error("Błąd parsowania pliku:", err);
            alert("Wystąpił błąd podczas odczytu pliku.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        if (!file || !content.trim()) {
            alert("Wybierz plik i upewnij się, że ma zawartość.");
            return;
        }

        setIsLoading(true);
        try {
            await saveDocument({
                name: name || file.name,
                description,
                content,
                size: file.size,
                type: file.type || file.name.split('.').pop() || 'text/plain'
            });
            onSaved();
        } catch (err) {
            console.error("Błąd podczas zapisywania:", err);
            alert("Nie udało się zapisać dokumentu.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-6 w-full">
            <div className="flex items-center gap-4">
                <button
                    onClick={onBack}
                    className="p-2 hover:bg-brand-sea/5 rounded-full transition-colors text-brand-sea"
                >
                    <ArrowLeft className="h-5 w-5" />
                </button>
                <h2 className="text-2xl font-bold tracking-tight text-brand-midnight flex-1">
                    Dodaj nowy dokument
                </h2>
                <button
                    onClick={handleSave}
                    disabled={isLoading || !content.trim()}
                    className="flex items-center gap-2 bg-brand-sea text-white px-4 py-2 rounded-md hover:bg-brand-navy transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Save className="h-4 w-4" />
                    Zapisz w bazie
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <div className="lg:col-span-1 space-y-4">
                    <div className="rounded-xl border border-brand-sea/20 bg-white p-6 shadow-sm">
                        <h3 className="font-semibold text-brand-midnight mb-4 flex items-center gap-2">
                            <FileText className="h-4 w-4 text-brand-sea" />
                            1. Wybierz plik
                        </h3>
                        <input
                            type="file"
                            accept=".txt,.docx,text/plain"
                            onChange={handleFileChange}
                            className="block w-full text-sm text-brand-navy/80
                file:mr-4 file:py-2 file:px-4
                file:rounded-md file:border-0
                file:text-sm file:font-medium
                file:bg-brand-sea/10 file:text-brand-sea
                hover:file:bg-brand-sea/20 cursor-pointer"
                        />
                        <p className="text-xs text-brand-navy/60 mt-2">Dozwolone: .txt, .docx (Max 1MB w tekście)</p>
                    </div>

                    <div className="rounded-xl border border-brand-sea/20 bg-white p-6 shadow-sm space-y-4">
                        <h3 className="font-semibold text-brand-midnight flex items-center gap-2">
                            <FileText className="h-4 w-4 text-brand-sea" />
                            2. Metadane
                        </h3>
                        <div>
                            <label className="block text-sm font-medium text-brand-navy mb-1">Nazwa dokumentu</label>
                            <input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                autoComplete="off"
                                className="w-full border border-brand-sea/20 rounded-md p-2 text-sm focus:border-brand-sea outline-none transition-colors text-brand-midnight"
                                placeholder="Np. Regulamin v2"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-brand-navy mb-1">Krótki opis</label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="w-full border border-brand-sea/20 rounded-md p-2 text-sm focus:border-brand-sea outline-none transition-colors text-brand-midnight resize-none h-24"
                                placeholder="Opcjonalny opis zawartości..."
                            />
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-3">
                    <div className="rounded-xl border border-brand-sea/20 bg-white shadow-sm flex flex-col h-[600px] lg:h-[800px] overflow-hidden">
                        <div className="p-4 border-b border-brand-sea/10 bg-brand-sea/5 flex items-center justify-between">
                            <div>
                                <h3 className="font-semibold text-brand-midnight">3. Edycja i podgląd (Markdown)</h3>
                                <p className="text-xs text-brand-navy/60">Tekst wczytany z pliku. Możesz go zapisać w bieżącej formie bazy danych.</p>
                            </div>
                            <div className="flex bg-white rounded-lg p-1 border border-brand-sea/20">
                                <button
                                    onClick={() => setPreviewMode('edit')}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${previewMode === 'edit' ? 'bg-brand-sea/10 text-brand-sea' : 'text-brand-navy/60 hover:text-brand-midnight hover:bg-brand-sea/5'}`}
                                >
                                    <Edit3 className="h-4 w-4" />
                                    Edycja
                                </button>
                                <button
                                    onClick={() => setPreviewMode('preview')}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${previewMode === 'preview' ? 'bg-brand-sea/10 text-brand-sea' : 'text-brand-navy/60 hover:text-brand-midnight hover:bg-brand-sea/5'}`}
                                >
                                    <Eye className="h-4 w-4" />
                                    Podgląd
                                </button>
                            </div>
                        </div>
                        <div className="flex-1 p-0 relative bg-white overflow-hidden">
                            {isLoading && (
                                <div className="absolute inset-0 bg-white/50 flex items-center justify-center z-10 backdrop-blur-sm">
                                    <div className="text-brand-sea font-medium flex items-center gap-2">
                                        <div className="h-4 w-4 border-2 border-brand-sea border-t-transparent rounded-full animate-spin"></div>
                                        Przetwarzanie dokumentu...
                                    </div>
                                </div>
                            )}
                            {previewMode === 'edit' ? (
                                <textarea
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                    className="w-full h-full p-6 resize-none outline-none text-brand-midnight font-mono text-sm leading-relaxed"
                                    placeholder="Wybierz plik z dysku, aby wczytać jego treść..."
                                />
                            ) : (
                                <div className="absolute inset-0 p-6 overflow-y-auto">
                                    <div className="prose prose-sm md:prose-base max-w-none text-brand-midnight whitespace-pre-wrap leading-relaxed">
                                        {content ? (
                                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                {content}
                                            </ReactMarkdown>
                                        ) : (
                                            <span className="text-brand-navy/40 italic">Brak treści do podglądu...</span>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
