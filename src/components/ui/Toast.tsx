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
            className={clsx(
                'max-w-md w-full bg-white dark:bg-stone-800 shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5 dark:ring-white dark:ring-opacity-10 transition-all duration-300 ease-out transform',
                t.visible ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
            )}
        >
            <div className="flex-1 w-0 p-4">
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
            <div className="flex border-l border-stone-200 dark:border-stone-700">
                <button
                    onClick={() => hotToast.dismiss(t.id)}
                    className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-stone-600 dark:text-stone-400 hover:text-stone-500 dark:hover:text-stone-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    aria-label="Dismiss"
                >
                    <VscClose className="h-5 w-5" />
                </button>
            </div>
        </div>
    );
};
