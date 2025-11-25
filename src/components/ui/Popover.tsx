import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import clsx from 'clsx';

interface PopoverProps {
    trigger: React.ReactNode;
    content: React.ReactNode;
    isOpen?: boolean;
    onOpenChange?: (isOpen: boolean) => void;
    align?: 'left' | 'right' | 'center';
    className?: string;
}

export const Popover = ({
    trigger,
    content,
    isOpen: controlledIsOpen,
    onOpenChange,
    align = 'right',
    className
}: PopoverProps) => {
    const [uncontrolledIsOpen, setUncontrolledIsOpen] = useState(false);
    const [isClosing, setIsClosing] = useState(false);
    const popoverRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);

    const isControlled = controlledIsOpen !== undefined;
    const isOpen = isControlled ? controlledIsOpen : uncontrolledIsOpen;

    const setIsOpen = useCallback((value: boolean) => {
        if (!value && (isControlled ? controlledIsOpen : uncontrolledIsOpen)) {
            // Trigger exit animation
            setIsClosing(true);
            setTimeout(() => {
                setIsClosing(false);
                if (!isControlled) {
                    setUncontrolledIsOpen(false);
                }
                onOpenChange?.(false);
            }, 150); // Match animation duration
        } else {
            if (!isControlled) {
                setUncontrolledIsOpen(value);
            }
            onOpenChange?.(value);
        }
    }, [isControlled, controlledIsOpen, uncontrolledIsOpen, onOpenChange]);

    // Visible state accounts for closing animation
    const isVisible = useMemo(() => {
        return isOpen || isClosing;
    }, [isOpen, isClosing]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        const handleEscapeKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('keydown', handleEscapeKey);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscapeKey);
        };
    }, [isOpen, setIsOpen]);

    const alignmentStyles = {
        left: 'left-0 origin-top-left',
        right: 'right-0 origin-top-right',
        center: 'left-1/2 -translate-x-1/2 origin-top',
    };

    return (
        <div className="relative" ref={popoverRef}>
            <div onClick={() => setIsOpen(!isOpen)}>
                {trigger}
            </div>

            {isVisible && (
                <div
                    ref={contentRef}
                    className={clsx(
                        "absolute top-full mt-2 z-50 min-w-[200px]",
                        "bg-white dark:bg-stone-900 rounded-xl shadow-xl border border-stone-200 dark:border-stone-800",
                        "transition-all duration-150 ease-out",
                        isClosing
                            ? "opacity-0 scale-95"
                            : "opacity-100 scale-100 animate-in fade-in zoom-in-95 duration-200",
                        alignmentStyles[align],
                        className
                    )}
                >
                    {content}
                </div>
            )}
        </div>
    );
};
