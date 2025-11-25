import React, { useState, useRef, useEffect, useCallback } from 'react';
import { AnimatePresence, m } from 'framer-motion';
import clsx from 'clsx';
import { popoverVariants } from '../../utils/animationVariants';

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
    const popoverRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);

    const isControlled = controlledIsOpen !== undefined;
    const isOpen = isControlled ? controlledIsOpen : uncontrolledIsOpen;

    const setIsOpen = useCallback((value: boolean) => {
        if (!isControlled) {
            setUncontrolledIsOpen(value);
        }
        onOpenChange?.(value);
    }, [isControlled, onOpenChange]);

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

            <AnimatePresence>
                {isOpen && (
                    <m.div
                        ref={contentRef}
                        className={clsx(
                            "absolute top-full mt-2 z-50 min-w-[200px]",
                            // Use Liquid Glass elevated class for popovers
                            "glass-elevated rounded-xl",
                            alignmentStyles[align],
                            className
                        )}
                        variants={popoverVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                    >
                        {/* Inner glow overlay for glass depth */}
                        <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/40 via-transparent to-transparent dark:from-white/5 pointer-events-none" aria-hidden="true" />
                        <div className="relative">
                            {content}
                        </div>
                    </m.div>
                )}
            </AnimatePresence>
        </div>
    );
};
