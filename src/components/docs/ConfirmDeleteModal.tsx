
import { AlertTriangle, X } from 'lucide-react';

export function ConfirmDeleteModal({
    isOpen,
    onClose,
    onConfirm,
    docName,
    isDeleting
}: {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    docName: string;
    isDeleting: boolean;
}) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
            <div
                className="fixed inset-0 bg-brand-midnight/40 backdrop-blur-sm transition-opacity"
                onClick={!isDeleting ? onClose : undefined}
            />
            <div className="relative bg-white rounded-2xl shadow-xl border border-brand-sea/20 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="p-6">
                    <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 h-10 w-10 rounded-full bg-brand-bordeaux/10 flex items-center justify-center">
                            <AlertTriangle className="h-5 w-5 text-brand-bordeaux" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg font-semibold text-brand-midnight">
                                Usuń dokument
                            </h3>
                            <p className="mt-2 text-sm text-brand-navy/70">
                                Czy na pewno chcesz bezpowrotnie usunąć dokument <strong>{docName}</strong>? Ta operacja usunie również całą zapisaną w nim zawartość (Markdown) i nie można jej cofnąć.
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            disabled={isDeleting}
                            className="flex-shrink-0 p-1 rounded-full text-brand-navy/40 hover:bg-brand-sea/10 hover:text-brand-midnight transition-colors focus:outline-none focus:ring-2 focus:ring-brand-sea focus:ring-offset-2"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </div>
                <div className="bg-brand-sea/5 px-6 py-4 flex flex-col-reverse sm:flex-row sm:justify-end gap-3 border-t border-brand-sea/10">
                    <button
                        type="button"
                        disabled={isDeleting}
                        className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-brand-navy bg-white border border-brand-sea/20 rounded-lg hover:bg-brand-sea/5 hover:text-brand-midnight focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-sea disabled:opacity-50 transition-colors shadow-sm"
                        onClick={onClose}
                    >
                        Anuluj
                    </button>
                    <button
                        type="button"
                        disabled={isDeleting}
                        className="w-full sm:w-auto inline-flex justify-center items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-brand-bordeaux hover:bg-red-700 border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-bordeaux shadow-sm disabled:opacity-50 transition-colors"
                        onClick={onConfirm}
                    >
                        {isDeleting ? (
                            <>
                                <div className="h-4 w-4 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                                <span>Usuwanie...</span>
                            </>
                        ) : (
                            'Tak, usuń dokument'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
