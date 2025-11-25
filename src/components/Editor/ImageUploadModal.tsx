import { useState, useRef, useCallback, useEffect, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { showToast as toast } from '../../utils/toast';

interface ImageUploadModalProps {
  onInsert: (src: string) => void;
  onClose: () => void;
  initialFiles?: FileList | null;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB in bytes
const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];

export const ImageUploadModal = ({ onInsert, onClose, initialFiles }: ImageUploadModalProps) => {
  const [imageUrl, setImageUrl] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<Element | null>(null);

  const validateImageUrl = useCallback((url: string): boolean => {
    // Basic URL validation
    try {
      new URL(url);
      // Check if URL likely points to an image
      const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'];
      return imageExtensions.some(ext => url.toLowerCase().includes(ext));
    } catch {
      return false;
    }
  }, []);

  const validateFile = useCallback((file: File): { valid: boolean; error?: string } => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return {
        valid: false,
        error: `Unsupported file type. Please upload: PNG, JPEG, GIF, or WebP`
      };
    }

    if (file.size > MAX_FILE_SIZE) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
      return {
        valid: false,
        error: `File too large (${sizeMB}MB). Maximum size is 5MB`
      };
    }

    return { valid: true };
  }, []);

  const convertFileToBase64 = useCallback((file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error('Failed to convert image'));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  }, []);

  const handleFileUpload = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setIsProcessing(true);

    try {
      const filesArray = Array.from(files);

      // Validate all files first
      for (const file of filesArray) {
        const validation = validateFile(file);
        if (!validation.valid) {
          toast.error(validation.error || 'Invalid file');
          setIsProcessing(false);
          return;
        }
      }

      // Convert and insert all valid files
      for (const file of filesArray) {
        const base64 = await convertFileToBase64(file);
        onInsert(base64);
      }

      if (filesArray.length === 1) {
        toast.success('Image uploaded successfully');
      } else {
        toast.success(`${filesArray.length} images uploaded successfully`);
      }

      onClose();
    } catch (error) {
      console.error('Image upload error:', error);
      toast.error('Failed to upload image');
    } finally {
      setIsProcessing(false);
    }
  }, [validateFile, convertFileToBase64, onInsert, onClose]);

  // Auto-process initial files if provided (from drag-drop onto editor)
  useEffect(() => {
    if (initialFiles) {
      handleFileUpload(initialFiles);
    }
  }, [initialFiles, handleFileUpload]);

  // Global Escape key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isProcessing) {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose, isProcessing]);

  // Focus trap and restore focus on close
  useEffect(() => {
    previousActiveElement.current = document.activeElement;

    // Trap focus within modal
    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !modalRef.current) return;

      const focusable = modalRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const firstElement = focusable[0];
      const lastElement = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement?.focus();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement?.focus();
      }
    };

    document.addEventListener('keydown', handleTabKey);
    return () => {
      document.removeEventListener('keydown', handleTabKey);
      // Restore focus to previous element
      if (previousActiveElement.current instanceof HTMLElement) {
        previousActiveElement.current.focus();
      }
    };
  }, []);

  // Keyboard handler for drop zone (accessibility)
  const handleDropZoneKeyDown = useCallback((e: ReactKeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ' ') && !isProcessing) {
      e.preventDefault();
      fileInputRef.current?.click();
    }
  }, [isProcessing]);

  const handleUrlInsert = useCallback(() => {
    if (!imageUrl.trim()) {
      toast.error('Please enter an image URL');
      return;
    }

    if (!validateImageUrl(imageUrl)) {
      toast.error('Please enter a valid image URL');
      return;
    }

    onInsert(imageUrl);
    toast.success('Image inserted');
    onClose();
  }, [imageUrl, validateImageUrl, onInsert, onClose]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    handleFileUpload(e.dataTransfer.files);
  }, [handleFileUpload]);

  return (
    <div
      className="fixed inset-0 bg-stone-900/40 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isProcessing) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="image-upload-modal-title"
    >
      <div
        ref={modalRef}
        className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 p-6 max-w-md w-full mx-4 shadow-elevation-4 animate-scaleIn"
      >
        <h3
          id="image-upload-modal-title"
          className="text-lg font-bold mb-5 text-stone-900 dark:text-stone-50 tracking-tight"
        >
          Insert Image
        </h3>

        {/* Tab-like section headers */}
        <div className="space-y-5">
          {/* URL Input Section */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-2">
              Image URL
            </label>
            <input
              type="text"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleUrlInsert();
                } else if (e.key === 'Escape') {
                  onClose();
                }
              }}
              placeholder="https://example.com/image.png"
              className="w-full px-3 py-2.5 text-sm border border-stone-200 dark:border-stone-700 rounded-lg bg-stone-50 dark:bg-stone-800/50 text-stone-900 dark:text-stone-50 placeholder-stone-400 dark:placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all duration-200"
              aria-label="Image URL"
              autoFocus
              disabled={isProcessing}
            />
          </div>

          {/* Divider */}
          <div className="relative py-1">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-stone-200 dark:border-stone-800" />
            </div>
            <div className="relative flex justify-center text-xs uppercase tracking-wider font-medium">
              <span className="px-3 bg-white dark:bg-stone-900 text-stone-400 dark:text-stone-500">
                or
              </span>
            </div>
          </div>

          {/* File Upload Section */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-2">
              Upload from Computer
            </label>

            {/* Drag & Drop Zone */}
            <div
              ref={dropZoneRef}
              role="button"
              tabIndex={isProcessing ? -1 : 0}
              aria-label="Drop zone for image upload. Click or press Enter to select files"
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onKeyDown={handleDropZoneKeyDown}
              className={`
                relative border-2 border-dashed rounded-xl p-6 text-center transition-all duration-200 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 focus-visible:border-blue-500
                ${isDragging
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-stone-200 dark:border-stone-700 hover:border-stone-400 dark:hover:border-stone-600 hover:bg-stone-50 dark:hover:bg-stone-800/50'
                }
                ${isProcessing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
              onClick={() => !isProcessing && fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_TYPES.join(',')}
                multiple
                onChange={(e) => handleFileUpload(e.target.files)}
                className="hidden"
                disabled={isProcessing}
              />

              {isProcessing ? (
                <div className="space-y-3">
                  <div className="w-8 h-8 mx-auto border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs font-medium text-stone-600 dark:text-stone-400">
                    Processing...
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="w-10 h-10 mx-auto rounded-full bg-stone-100 dark:bg-stone-800 flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                    <svg
                      className="w-5 h-5 text-stone-500 dark:text-stone-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-stone-700 dark:text-stone-300">
                      Click to upload
                    </p>
                    <p className="text-xs text-stone-500 dark:text-stone-500 mt-1">
                      PNG, JPG, GIF (max 5MB)
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 justify-end mt-8">
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="px-4 py-2 text-sm font-medium text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400"
            aria-label="Cancel image insertion"
          >
            Cancel
          </button>
          <button
            onClick={handleUrlInsert}
            disabled={isProcessing || !imageUrl.trim()}
            className="px-4 py-2 text-sm font-medium bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 rounded-lg hover:bg-stone-800 dark:hover:bg-white shadow-sm hover:shadow transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
            aria-label="Insert image from URL"
          >
            {isProcessing ? 'Processing...' : 'Insert Image'}
          </button>
        </div>
      </div>
    </div>
  );
};
