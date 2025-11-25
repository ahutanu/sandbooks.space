import { useEditor, EditorContent } from '@tiptap/react';
import { Logo } from '../ui/Logo';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Highlight from '@tiptap/extension-highlight';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import Typography from '@tiptap/extension-typography';
import Link from '@tiptap/extension-link';
import Color from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import FontFamily from '@tiptap/extension-font-family';
import Superscript from '@tiptap/extension-superscript';
import Subscript from '@tiptap/extension-subscript';
import TextAlign from '@tiptap/extension-text-align';
import { Table } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import YouTube from '@tiptap/extension-youtube';
import Mention from '@tiptap/extension-mention';
import CharacterCount from '@tiptap/extension-character-count';
import Focus from '@tiptap/extension-focus';
import Dropcursor from '@tiptap/extension-dropcursor';
import Gapcursor from '@tiptap/extension-gapcursor';
import { DragHandle } from '@tiptap/extension-drag-handle-react';
import equal from 'fast-deep-equal';
import { ExecutableCodeBlock } from './executableCodeBlockExtension';
import { MarkdownInputRules } from './markdownInputRules';
import { SmartWritingBehaviors } from './smartWritingBehaviors';
import { SlashCommands } from './extensions/slashCommands';
import { FocusMode } from './extensions/FocusMode';
import { FontSize } from './extensions/FontSize';
import { Video } from './extensions/Video';
import { Audio } from './extensions/Audio';
import { File } from './extensions/File';
import { MinimalTagDisplay } from '../Tags';
import { ImageUploadModal } from './ImageUploadModal';
import { Markdown } from '@tiptap/markdown';
import { useTypewriterMode } from '../../hooks/useTypewriterMode';
import { useNotesStore } from '../../store/notesStore';
import type { Note } from '../../types';
import type { JSONContent } from '@tiptap/core';
import { useEffect, useState, useCallback, useRef } from 'react';
import { LinkPopover } from './LinkPopover';
import { BubbleMenu } from './BubbleMenu';
import { FloatingMenu } from './FloatingMenu';
import { EditorToolbar } from './EditorToolbar';

interface EditorProps {
  note: Note;
  onUpdate: (content: JSONContent) => void;
  readOnly?: boolean;
}

export const Editor = ({ note, onUpdate, readOnly = false }: EditorProps) => {
  const { typewriterModeEnabled, focusModeEnabled } = useNotesStore();
  const [showImageModal, setShowImageModal] = useState(false);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [droppedFiles, setDroppedFiles] = useState<FileList | null>(null);
  const [showLinkPopover, setShowLinkPopover] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false, // Disable default code block (using custom)
        underline: false, // Use standalone Underline extension
        link: false, // Use standalone Link extension
        dropcursor: false, // Configure explicitly below
        gapcursor: false, // Configure explicitly below
      }),
      // Explicit drag-and-drop configuration for all draggable nodes
      Dropcursor.configure({
        color: '#3b82f6', // Blue cursor color
        width: 2,
        class: 'drop-cursor',
      }),
      Gapcursor,
      // DragHandle extension registered automatically by <DragHandle> React component
      ExecutableCodeBlock,
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-600 dark:text-blue-400 hover:underline transition-colors duration-200',
        },
      }),
      Typography,
      Image.configure({
        inline: false, // Block-level display
        allowBase64: true,
        HTMLAttributes: {
          class: 'rounded-lg max-w-full w-full h-auto my-6 mx-auto block shadow-elevation-2',
        },
      }),
      TaskList.configure({
        HTMLAttributes: {
          class: 'not-prose pl-2',
        },
      }),
      TaskItem.configure({
        nested: true,
        HTMLAttributes: {
          class: 'flex gap-2 items-start',
        },
      }),
      Highlight.configure({
        multicolor: true,
        HTMLAttributes: {
          class: 'px-1 rounded',
        },
      }),
      Color,
      TextStyle,
      FontFamily.configure({
        types: ['textStyle'],
      }),
      FontSize,
      Superscript,
      Subscript,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Table.configure({
        resizable: true,
        HTMLAttributes: {
          class: 'w-full border-collapse my-4 overflow-x-auto',
        },
      }),
      TableRow,
      TableHeader.configure({
        HTMLAttributes: {
          class: 'bg-stone-50 dark:bg-stone-800 font-semibold text-left border border-stone-200 dark:border-stone-700 px-4 py-3',
        },
      }),
      TableCell.configure({
        HTMLAttributes: {
          class: 'border border-stone-200 dark:border-stone-700 px-4 py-3 text-stone-900 dark:text-stone-50',
        },
      }),
      // Gapcursor and Dropcursor are included in StarterKit v3 by default
      YouTube.configure({
        HTMLAttributes: {
          class: 'w-full max-w-3xl mx-auto my-6 aspect-video rounded-lg shadow-elevation-2',
        },
      }),
      Video.configure({
        HTMLAttributes: {
          class: 'w-full max-w-3xl mx-auto my-6 aspect-video rounded-lg shadow-elevation-2',
        },
      }),
      Audio.configure({
        HTMLAttributes: {
          class: 'w-full max-w-3xl mx-auto my-4 bg-stone-50 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-700 rounded-lg p-3 shadow-elevation-1',
        },
      }),
      File.configure({
        HTMLAttributes: {
          class: 'w-full max-w-3xl mx-auto my-4 bg-stone-50 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-700 rounded-lg p-3 shadow-elevation-1',
        },
      }),
      Mention.configure({
        HTMLAttributes: {
          class: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-1.5 py-0.5 rounded-md font-medium hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors duration-200',
        },
      }),
      CharacterCount,
      Focus,
      Placeholder.configure({
        placeholder: 'Start writing... (Press ? for help, / for commands)',
      }),
      MarkdownInputRules,
      SmartWritingBehaviors, // Intelligent writing behaviors
      SlashCommands, // Notion-style slash commands
      FocusMode.configure({
        enabled: focusModeEnabled,
      }),
      Markdown, // Official Tiptap v3 markdown support
    ],
    content: note.content,
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      if (!readOnly) {
        onUpdate(editor.getJSON());
      }
    },
    editorProps: {
      attributes: {
        class: 'prose prose-stone max-w-none focus:outline-none min-h-full px-4 md:px-6 py-4 md:py-6',
        style: 'font-family: "JetBrains Mono Variable", "SF Mono", "Menlo", "Monaco", "Courier New", monospace;',
      },
    },
  });

  // Update editor content when note changes
  useEffect(() => {
    if (editor && note.content) {
      const currentContent = editor.getJSON();
      const newContent = note.content;

      // Only update if content actually changed to avoid cursor jumping (optimized with fast-deep-equal)
      if (!equal(currentContent, newContent)) {
        editor.commands.setContent(newContent);
      }
    }
  }, [editor, note.id, note.content]); // Re-run when note changes OR editor instance changes

  // Reset scroll position when switching notes
  // This prevents stale scroll positions from persisting across note changes
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, [note.id]);

  // Auto-focus editor when note is created (modern UX pattern)
  useEffect(() => {
    if (editor && note) {
      // Check if this is a new empty note (just created)
      const isEmpty = !note.content.content ||
        note.content.content.length === 0 ||
        (note.content.content.length === 1 &&
          note.content.content[0].type === 'paragraph' &&
          (!note.content.content[0].content || note.content.content[0].content.length === 0));

      if (isEmpty) {
        // Set first block as H1 and focus for new notes
        setTimeout(() => {
          editor.chain()
            .focus('start')
            .setHeading({ level: 1 })
            .run();

          // Add escape hatch: Allow user to press Backspace or Escape to cancel H1
          const escapeTimeout: ReturnType<typeof setTimeout> = setTimeout(() => cleanup(), 2000);
          const handleEscapeKey = (e: KeyboardEvent) => {
            if (e.key === 'Backspace' || e.key === 'Escape') {
              // Check if we're still in an empty H1
              const currentNode = editor.state.selection.$anchor.parent;
              if (currentNode.type.name === 'heading' &&
                currentNode.attrs.level === 1 &&
                currentNode.textContent === '') {
                e.preventDefault();
                // Convert back to paragraph
                editor.chain()
                  .focus()
                  .setParagraph()
                  .run();
                // Remove listener immediately
                cleanup();
              }
            }
          };

          const cleanup = () => {
            clearTimeout(escapeTimeout);
            window.removeEventListener('keydown', handleEscapeKey);
          };

          // Listen for 2 seconds
          window.addEventListener('keydown', handleEscapeKey);
        }, 100);
      }
    }
  }, [editor, note]); // Only run when note changes (note switched)

  // Update focus mode extension when toggle changes
  useEffect(() => {
    if (editor) {
      // Update the extension options dynamically
      const focusModeExtension = editor.extensionManager.extensions.find(
        (ext) => ext.name === 'focusMode'
      );
      if (focusModeExtension) {
        focusModeExtension.options.enabled = focusModeEnabled;
      }

      // Dispatch a transaction to trigger plugin state update
      // This ensures the decorations are properly recalculated
      const { tr } = editor.state;
      // Force a focus mode update to trigger decoration recalculation
      tr.setMeta('focusModeUpdate', true);
      // Also trigger a selection change to ensure decorations update
      tr.setSelection(editor.state.selection);
      editor.view.dispatch(tr);
    }
  }, [editor, focusModeEnabled]);

  // Typewriter mode - keep cursor centered while typing
  useTypewriterMode(editor, typewriterModeEnabled);

  // Handle Cmd+K for link insertion
  useEffect(() => {
    if (!editor) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k' && !e.shiftKey && !e.altKey) {
        const target = e.target as HTMLElement;
        if (target.classList.contains('ProseMirror') || target.closest('.ProseMirror')) {
          e.preventDefault();
          setShowLinkPopover(true);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editor]);


  const addImage = useCallback(() => {
    setShowImageModal(true);
  }, []);

  const insertImage = useCallback((src: string) => {
    if (!editor) return;
    editor.chain().focus().setImage({ src }).run();
  }, [editor]);

  // Drag and drop file handling for editor area
  const handleEditorDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Only show drag state if files are being dragged
    if (e.dataTransfer.types.includes('Files')) {
      setIsDraggingFile(true);
    }
  }, []);

  const handleEditorDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFile(false);
  }, []);

  const handleEditorDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFile(false);

    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;

    // Store dropped files and open modal
    setDroppedFiles(files);
    setShowImageModal(true);
  }, []);

  if (!editor) {
    return null;
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-stone-900">
      {/* Link Popover */}
      {showLinkPopover && editor && (
        <LinkPopover
          editor={editor}
          onClose={() => setShowLinkPopover(false)}
          initialUrl={editor.getAttributes('link').href || ''}
        />
      )}

      {/* Image Upload Modal */}
      {showImageModal && (
        <ImageUploadModal
          onInsert={insertImage}
          onClose={() => {
            setShowImageModal(false);
            setDroppedFiles(null);
          }}
          initialFiles={droppedFiles}
        />
      )}

      {/* Toolbar - fixed height, clean border, scrollable on mobile if needed */}
      <EditorToolbar
        editor={editor}
        onAddImage={addImage}
        onLinkClick={() => setShowLinkPopover(true)}
      />

      {/* Editor Content - scrollable content area */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto bg-white dark:bg-stone-900 relative"
        onDragOver={handleEditorDragOver}
        onDragLeave={handleEditorDragLeave}
        onDrop={handleEditorDrop}
      >
        {/* Drag overlay */}
        {isDraggingFile && (
          <div className="absolute inset-0 z-10 bg-blue-50/90 dark:bg-blue-900/30 backdrop-blur-sm border-4 border-dashed border-blue-500 flex items-center justify-center pointer-events-none">
            <div className="text-center space-y-3">
              <svg
                className="w-16 h-16 mx-auto text-blue-600 dark:text-blue-400"
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
              <p className="text-xl font-semibold text-blue-600 dark:text-blue-400">
                Drop images here to upload
              </p>
              <p className="text-sm text-blue-600/70 dark:text-blue-400/70">
                PNG, JPEG, GIF, or WebP (max 5MB each)
              </p>
            </div>
          </div>
        )}

        <div className="flex-1 max-w-4xl mx-auto w-full relative min-h-[50vh]">
          {/* Empty State Watermark */}
          {editor && editor.isEmpty && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none opacity-[0.03] dark:opacity-[0.05]">
              <Logo className="w-64 h-64 text-stone-900 dark:text-stone-100" />
            </div>
          )}
          <EditorContent editor={editor} />
          {editor && <BubbleMenu editor={editor} />}
          {editor && <FloatingMenu editor={editor} />}
          {editor && (
            <DragHandle editor={editor} className="drag-handle-wrapper">
              <div className="flex flex-col gap-0.5 p-1.5 rounded-md bg-stone-300 dark:bg-stone-600 hover:bg-stone-400 dark:hover:bg-stone-500 cursor-grab active:cursor-grabbing shadow-sm">
                <div className="flex gap-0.5">
                  <div className="w-1 h-1 rounded-full bg-stone-600 dark:bg-stone-300"></div>
                  <div className="w-1 h-1 rounded-full bg-stone-600 dark:bg-stone-300"></div>
                </div>
                <div className="flex gap-0.5">
                  <div className="w-1 h-1 rounded-full bg-stone-600 dark:bg-stone-300"></div>
                  <div className="w-1 h-1 rounded-full bg-stone-600 dark:bg-stone-300"></div>
                </div>
                <div className="flex gap-0.5">
                  <div className="w-1 h-1 rounded-full bg-stone-600 dark:bg-stone-300"></div>
                  <div className="w-1 h-1 rounded-full bg-stone-600 dark:bg-stone-300"></div>
                </div>
              </div>
            </DragHandle>
          )}
        </div>

        {/* Minimal tags at bottom */}
        <div className="max-w-4xl mx-auto w-full">
          <MinimalTagDisplay noteId={note.id} tags={note.tags || []} />
        </div>

        {/* Character Count - positioned bottom-left to avoid overlap with reset notes button */}
        {editor && editor.storage.characterCount && (
          <div className="fixed bottom-4 left-4 md:left-[17rem] lg:left-[19rem] bg-white/90 dark:bg-stone-900/90 backdrop-blur-sm border border-stone-200 dark:border-stone-700 rounded-lg px-3 py-1.5 shadow-elevation-1 z-40">
            <div className="text-xs text-stone-500 dark:text-stone-400 font-mono space-x-2">
              <span>{editor.storage.characterCount.words()} words</span>
              <span>•</span>
              <span>{editor.storage.characterCount.characters()} characters</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
