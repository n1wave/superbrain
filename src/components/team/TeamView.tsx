import { Users, Server, AlertTriangle, Terminal, Copy, CheckCircle2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { getApiConfig, toggleApiConfig } from '../../lib/docs';

export function TeamView() {
    const [apiEnabled, setApiEnabled] = useState(true);
    const [isApiLoading, setIsApiLoading] = useState(true);
    const [copied, setCopied] = useState<string | false>(false);

    useEffect(() => {
        getApiConfig().then(config => {
            setApiEnabled(config.isEnabled);
            setIsApiLoading(false);
        }).catch(console.error);
    }, []);

    const handleToggleApi = async () => {
        const newState = !apiEnabled;
        setApiEnabled(newState);
        await toggleApiConfig(newState).catch(console.error);
    };

    const handleCopy = (endpointUrl: string, type: string) => {
        navigator.clipboard.writeText(`curl -X GET "https://[TWOJA-VERCEL-DOMENA].vercel.app${endpointUrl}" \\
     -H "Authorization: Bearer N1_SUPER_SECRET_KEY_123"`);
        setCopied(type);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h2 className="text-2xl font-bold tracking-tight text-brand-midnight dark:text-white flex items-center gap-3">
                    <Users className="w-6 h-6 text-brand-sea" />
                    Zespół i Dostęp
                </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* API Documentation Terminal */}
                <div className="bg-black rounded-xl border border-brand-midnight/50 shadow-xl overflow-hidden flex flex-col h-full">
                    <div className="bg-brand-midnight border-b border-brand-midnight/50 px-5 py-3.5 flex items-center gap-3">
                        <Terminal className="w-4 h-4 text-brand-turquoise" />
                        <span className="text-sm font-medium text-white font-mono tracking-tight">Dokumentacja API</span>
                    </div>
                    <div className="p-6 flex-1 overflow-auto">
                        <div className="space-y-6">
                            <div className="space-y-6">
                                {/* Endpoint 1 */}
                                <div>
                                    <h4 className="text-brand-turquoise font-mono text-sm mb-1.5 font-medium">1. Endpoint: GET /api/documents</h4>
                                    <p className="text-white/60 text-[13px] leading-relaxed mb-3">Pobiera całą listę dokumentów w ujednoliconym formacie JSON wraz z ich pełną treścią.</p>
                                    <div className="flex items-center justify-between mb-2">
                                        <h4 className="text-brand-sea font-mono text-xs font-medium">Przykładowe zapytanie (cURL):</h4>
                                        <button onClick={() => handleCopy('/api/documents', 'all')} className="p-1 rounded-md hover:bg-brand-midnight text-white/50 hover:text-white transition-all ring-1 ring-transparent hover:ring-brand-midnight/50" title="Kopiuj do schowka">
                                            {copied === 'all' ? <CheckCircle2 className="w-3.5 h-3.5 text-brand-turquoise" /> : <Copy className="w-3.5 h-3.5" />}
                                        </button>
                                    </div>
                                    <div className="bg-black p-3 rounded-lg border border-brand-midnight shadow-inner">
                                        <pre className="text-white/80 text-[12px] font-mono whitespace-pre-wrap break-all leading-relaxed">
                                            <code>curl -X GET "https://[TWOJA-VERCEL-DOMENA].vercel.app/api/documents" \
                                                -H "Authorization: <span className="text-brand-orange">Bearer N1_SUPER...</span>"</code>
                                        </pre>
                                    </div>
                                </div>

                                {/* Endpoint 2 */}
                                <div className="pt-4 border-t border-brand-midnight/50">
                                    <h4 className="text-brand-turquoise font-mono text-sm mb-1.5 font-medium">2. Endpoint: GET /api/documents-light</h4>
                                    <p className="text-white/60 text-[13px] leading-relaxed mb-3">Pobiera listę dokumentów <strong>bez ich pełnej treści</strong>. Idealny do szybkiego pobrania spisu treści i oszczędzania transferu.</p>
                                    <div className="flex items-center justify-between mb-2">
                                        <h4 className="text-brand-sea font-mono text-xs font-medium">Przykładowe zapytanie (cURL):</h4>
                                        <button onClick={() => handleCopy('/api/documents-light', 'light')} className="p-1 rounded-md hover:bg-brand-midnight text-white/50 hover:text-white transition-all ring-1 ring-transparent hover:ring-brand-midnight/50" title="Kopiuj do schowka">
                                            {copied === 'light' ? <CheckCircle2 className="w-3.5 h-3.5 text-brand-turquoise" /> : <Copy className="w-3.5 h-3.5" />}
                                        </button>
                                    </div>
                                    <div className="bg-black p-3 rounded-lg border border-brand-midnight shadow-inner">
                                        <pre className="text-white/80 text-[12px] font-mono whitespace-pre-wrap break-all leading-relaxed">
                                            <code>curl -X GET "https://[TWOJA-VERCEL-DOMENA].vercel.app/api/documents-light" \
                                                -H "Authorization: <span className="text-brand-orange">Bearer N1_SUPER...</span>"</code>
                                        </pre>
                                    </div>
                                </div>

                                {/* Endpoint 3 */}
                                <div className="pt-4 border-t border-brand-midnight/50">
                                    <h4 className="text-brand-turquoise font-mono text-sm mb-1.5 font-medium">3. Endpoint: GET /api/document?id=...</h4>
                                    <p className="text-white/60 text-[13px] leading-relaxed mb-3">Pobiera pełne dane pojedynczego dokumentu na podstawie jego systemowego ID.</p>
                                    <div className="flex items-center justify-between mb-2">
                                        <h4 className="text-brand-sea font-mono text-xs font-medium">Przykładowe zapytanie (cURL):</h4>
                                        <button onClick={() => handleCopy('/api/document?id=ID_Z_BAZY', 'doc')} className="p-1 rounded-md hover:bg-brand-midnight text-white/50 hover:text-white transition-all ring-1 ring-transparent hover:ring-brand-midnight/50" title="Kopiuj do schowka">
                                            {copied === 'doc' ? <CheckCircle2 className="w-3.5 h-3.5 text-brand-turquoise" /> : <Copy className="w-3.5 h-3.5" />}
                                        </button>
                                    </div>
                                    <div className="bg-black p-3 rounded-lg border border-brand-midnight shadow-inner">
                                        <pre className="text-white/80 text-[12px] font-mono whitespace-pre-wrap break-all leading-relaxed">
                                            <code>curl -X GET "https://[TWOJA-VERCEL-DOMENA].vercel.app/api/document?id=ID_Z_BAZY" \
                                                -H "Authorization: <span className="text-brand-orange">Bearer N1_SUPER...</span>"</code>
                                        </pre>
                                    </div>
                                </div>
                            </div>

                            <div className="text-[13px] text-brand-sea font-mono border-t border-brand-midnight/50 pt-5 mt-8 space-y-2">
                                <p>// Pamiętaj by podmienić [TWOJA-VERCEL-DOMENA] na aktualny link.</p>
                                <p>// Kod autoryzacji definiujesz w ustawieniach Vercel jako `API_SECRET_KEY`.</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* API Access Settings */}
                <div className="bg-white dark:bg-[#050B14]/50 rounded-xl border border-brand-sea/20 dark:border-white/10 shadow-sm p-8 relative flex flex-col">
                    <div className="flex items-start justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-brand-sea/10 rounded-lg flex items-center justify-center">
                                <Server className="w-6 h-6 text-brand-sea" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-brand-midnight dark:text-white">Zewnętrzne API</h3>
                                <p className="text-sm text-brand-navy/60 dark:text-gray-400">Dostęp do bazy dla asystentów Make/GPT.</p>
                            </div>
                        </div>
                        <button
                            type="button"
                            disabled={isApiLoading}
                            onClick={handleToggleApi}
                            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand-sea focus:ring-offset-2 disabled:opacity-50 ${apiEnabled ? 'bg-brand-sea' : 'bg-black/20'}`}
                        >
                            <span className="sr-only">Włącz lub wyłącz API</span>
                            <span
                                aria-hidden="true"
                                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${apiEnabled ? 'translate-x-5' : 'translate-x-0'}`}
                            />
                        </button>
                    </div>

                    <div className="flex-1 space-y-4">
                        <div className="bg-brand-sea/5 rounded-lg p-4 border border-brand-sea/10">
                            <p className="text-sm text-brand-navy/80 leading-relaxed">
                                Twój bezpieczny serwer API jest używany przez systemy automatyzacji. Kiedy przycisk obok <strong className="text-brand-sea">jest aktywny</strong>, platformy zewnętrzne korzystające z odpowiedniego hasła (tokena Bearer) mogą czytać bazę dokumentów.
                            </p>
                        </div>

                        <div className="bg-brand-orange/10 rounded-lg p-4 border border-brand-orange/20 flex gap-3">
                            <AlertTriangle className="w-5 h-5 text-brand-orange shrink-0 mt-0.5" />
                            <div className="text-sm text-brand-midnight dark:text-gray-200 leading-relaxed">
                                <strong className="text-brand-bordeaux dark:text-brand-orange">Bezpieczeństwo:</strong> Kiedy nie integrujesz bazy lub nie korzystasz chwilowo z zewnętrznych automatów, po prostu wyłącz ten przełącznik. Odetnie to system w ułamku sekundy, nawet dla programów ze skradzionym kluczem.
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
