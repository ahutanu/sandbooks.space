import React from 'react';
import clsx from 'clsx';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'default' | 'ghost' | 'outline' | 'secondary' | 'danger' | 'primary-subtle';
    size?: 'sm' | 'md' | 'lg' | 'icon';
    isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = 'default', size = 'md', isLoading, children, disabled, ...props }, ref) => {
        const baseStyles = "inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-blue-600 focus-visible:ring-offset-3 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none";

        const variants = {
            default: "bg-stone-900 text-stone-50 hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-200 shadow-sm hover:shadow-md",
            ghost: "text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 hover:text-stone-900 dark:hover:text-stone-200",
            outline: "border border-stone-200 dark:border-stone-700 bg-transparent hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300",
            secondary: "bg-stone-100 text-stone-900 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-100 dark:hover:bg-stone-700",
            danger: "bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30",
            'primary-subtle': "bg-stone-100 text-stone-700 hover:bg-emerald-50 hover:text-emerald-700 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-emerald-900/30 dark:hover:text-emerald-300 border border-stone-200 dark:border-stone-700 hover:border-emerald-300 dark:hover:border-emerald-700",
        };

        const sizes = {
            sm: "h-8 px-3 text-xs",
            md: "h-10 px-4 py-2 text-sm",
            lg: "h-12 px-6 text-base",
            icon: "h-11 w-11 p-2.5",
        };

        return (
            <button
                ref={ref}
                className={clsx(
                    baseStyles,
                    variants[variant],
                    sizes[size],
                    className
                )}
                disabled={disabled || isLoading}
                {...props}
            >
                {isLoading ? (
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ) : null}
                {children}
            </button>
        );
    }
);

Button.displayName = 'Button';
