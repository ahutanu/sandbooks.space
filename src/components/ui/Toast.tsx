import { type Toast as ToastType, toast as hotToast } from 'react-hot-toast';
import { VscClose, VscCheck, VscError, VscLoading } from 'react-icons/vsc';
import clsx from 'clsx';

interface ToastProps {
    t: ToastType;
    type?: 'success' | 'error' | 'loading' | 'custom';
    message: string | React.ReactNode;
}

export const Toast = ({ t, type = 'custom', message }: ToastProps) => {
    return (
        <div
            role="alert"
            aria-live={type === 'error' ? 'assertive' : 'polite'}
            aria-atomic="true"
            className={clsx(
                // Glass morphism: translucent background with blur
                'max-w-md w-full relative overflow-hidden',
                'backdrop-blur-xl bg-white/90 dark:bg-stone-800/90',
                // Elevation shadow for depth
                'shadow-[0_4px_6px_-2px_rgba(0,0,0,0.08),0_8px_16px_-4px_rgba(0,0,0,0.12)]',
                'dark:shadow-[0_4px_6px_-2px_rgba(0,0,0,0.2),0_8px_16px_-4px_rgba(0,0,0,0.3)]',
                // Subtle border for glass edge
                'rounded-xl border border-stone-200/40 dark:border-stone-700/40',
                'pointer-events-auto flex',
                // Animation
                'transition-all duration-300 ease-out transform',
                t.visible ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
            )}
        >
            {/* Inner glow overlay for glass depth */}
            <div
                className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/40 via-transparent to-transparent dark:from-white/10 pointer-events-none"
                aria-hidden="true"
            />
            <div className="relative flex-1 w-0 p-4">
                <div className="flex items-start">
                    <div className="flex-shrink-0 pt-0.5">
                        {type === 'success' && <VscCheck className="h-5 w-5 text-emerald-500" />}
                        {type === 'error' && <VscError className="h-5 w-5 text-red-500" />}
                        {type === 'loading' && <VscLoading className="h-5 w-5 text-blue-500 animate-spin" />}
                    </div>
                    <div className="ml-3 flex-1">
                        {typeof message === 'string' ? (
                            <p className="text-sm font-medium text-stone-900 dark:text-stone-100 font-mono break-words">
                                {message}
                            </p>
                        ) : (
                            <div className="text-sm font-medium text-stone-900 dark:text-stone-100 font-mono break-words">
                                {message}
                            </div>
                        )}
                    </div>
                </div>
            </div>
            <div className="relative flex border-l border-stone-200/40 dark:border-stone-700/40">
                <button
                    onClick={() => hotToast.dismiss(t.id)}
                    className="w-full border border-transparent rounded-none rounded-r-xl p-4 flex items-center justify-center text-sm font-medium text-stone-600 dark:text-stone-400 hover:text-stone-500 dark:hover:text-stone-300 hover:bg-stone-100/50 dark:hover:bg-stone-700/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-colors"
                    aria-label="Dismiss"
                >
                    <VscClose className="h-5 w-5" />
                </button>
            </div>
        </div>
    );
};
