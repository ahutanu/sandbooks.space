import { useState, useRef, useCallback, useEffect } from 'react';
import toast from 'react-hot-toast';

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
      className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white dark:bg-stone-800 rounded-2xl p-8 max-w-lg w-full mx-4 shadow-elevation-5 animate-scaleIn">
        <h3 className="text-xl font-semibold mb-6 text-stone-900 dark:text-stone-50">
          Insert Image
        </h3>

        {/* Tab-like section headers */}
        <div className="space-y-6">
          {/* URL Input Section */}
          <div>
            <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-2">
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
              className="w-full px-4 py-3 border-2 border-stone-300 dark:border-stone-600 rounded-lg bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-50 placeholder-stone-400 dark:placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
              aria-label="Image URL"
              autoFocus
              disabled={isProcessing}
            />
          </div>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-stone-200 dark:border-stone-700" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white dark:bg-stone-800 text-stone-500 dark:text-stone-400">
                or
              </span>
            </div>
          </div>

          {/* File Upload Section */}
          <div>
            <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-2">
              Upload from Computer
            </label>

            {/* Drag & Drop Zone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`
                relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200
                ${isDragging
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-stone-300 dark:border-stone-600 hover:border-stone-400 dark:hover:border-stone-500'
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
                  <div className="w-12 h-12 mx-auto border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm text-stone-600 dark:text-stone-400">
                    Processing images...
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <svg
                    className="w-12 h-12 mx-auto text-stone-400 dark:text-stone-500"
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
                  <div>
                    <p className="text-stone-700 dark:text-stone-300 font-medium">
                      {isDragging ? 'Drop images here' : 'Click to upload or drag & drop'}
                    </p>
                    <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">
                      PNG, JPEG, GIF, or WebP (max 5MB each)
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 justify-end mt-8">
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="px-5 py-2.5 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700 rounded-lg transition-all duration-200 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-blue-600 focus-visible:ring-offset-3 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Cancel image insertion"
          >
            Cancel
          </button>
          <button
            onClick={handleUrlInsert}
            disabled={isProcessing || !imageUrl.trim()}
            className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-elevation-1 hover:shadow-elevation-2 transition-all duration-200 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-blue-600 focus-visible:ring-offset-3 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Insert image from URL"
          >
            {isProcessing ? 'Processing...' : 'Insert from URL'}
          </button>
        </div>
      </div>
    </div>
  );
};
