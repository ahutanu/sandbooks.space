import { useEditor, EditorContent, BubbleMenu } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Highlight from '@tiptap/extension-highlight';
import Typography from '@tiptap/extension-typography';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import equal from 'fast-deep-equal';
import { ExecutableCodeBlock } from './executableCodeBlockExtension';
import { MarkdownInputRules } from './markdownInputRules';
import { SmartWritingBehaviors } from './smartWritingBehaviors';
import { SlashCommands } from './extensions/slashCommands';
import { FocusMode } from './extensions/FocusMode';
import { MinimalTagDisplay } from '../Tags';
import { ImageUploadModal } from './ImageUploadModal';
import { CodeMirrorBlock } from '../CodeMirror/CodeMirrorBlock';
import { useTypewriterMode } from '../../hooks/useTypewriterMode';
import { useNotesStore } from '../../store/notesStore';
import type { Note } from '../../types';
import type { JSONContent } from '@tiptap/core';
import { useEffect, useState, useCallback } from 'react';
import clsx from 'clsx';
import { VscCode } from 'react-icons/vsc';

interface EditorProps {
  note: Note;
  onUpdate: (content: JSONContent) => void;
}

export const Editor = ({ note, onUpdate }: EditorProps) => {
  const { typewriterModeEnabled, focusModeEnabled, addCodeBlock } = useNotesStore();
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [showImageModal, setShowImageModal] = useState(false);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [droppedFiles, setDroppedFiles] = useState<FileList | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false, // Disable default code block (using custom)
        // Keep all other extensions enabled (blockquote, horizontalRule, etc.)
      }),
      ExecutableCodeBlock,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-600 hover:text-blue-700 underline cursor-pointer',
        },
      }),
      Image.configure({
        inline: false, // Block-level display
        allowBase64: true,
        HTMLAttributes: {
          class: 'rounded-lg max-w-[650px] w-full h-auto my-8 mx-auto block shadow-elevation-2',
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
        multicolor: false,
        HTMLAttributes: {
          class: 'bg-yellow-200 px-1 rounded',
        },
      }),
      Underline,
      Typography.configure({
        // Disable smart quotes to prevent breaking code snippets
        openDoubleQuote: false,
        closeDoubleQuote: false,
        openSingleQuote: false,
        closeSingleQuote: false,
        // Keep other typography features like em dashes and ellipses
      }),
      Placeholder.configure({
        placeholder: 'Start writing... (Press ? for help, / for commands)',
      }),
      MarkdownInputRules,
      SmartWritingBehaviors, // Intelligent writing behaviors
      SlashCommands, // Notion-style slash commands
      FocusMode.configure({
        enabled: focusModeEnabled,
      }),
    ],
    content: note.content,
    onUpdate: ({ editor }) => {
      onUpdate(editor.getJSON());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-stone max-w-none focus:outline-none min-h-full px-8 md:px-12 py-8 md:py-12',
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
        }, 100);
      }
    }
  }, [editor, note]); // Only run when note changes (note switched)

  // Update focus mode extension when toggle changes
  useEffect(() => {
    if (editor) {
      editor.extensionManager.extensions.forEach((extension) => {
        if (extension.name === 'focusMode') {
          extension.options.enabled = focusModeEnabled;
        }
      });
      // Trigger view update to apply/remove decorations
      editor.view.updateState(editor.state);
    }
  }, [editor, focusModeEnabled]);

  // Typewriter mode - keep cursor centered while typing
  useTypewriterMode(editor, typewriterModeEnabled);

  const setLink = useCallback(() => {
    if (!editor) return;

    // If empty URL, remove link
    if (linkUrl === '' || linkUrl.trim() === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      setShowLinkInput(false);
      setLinkUrl('');
      return;
    }

    // Handle URLs without protocol (add https://)
    const url = linkUrl.startsWith('http://') || linkUrl.startsWith('https://')
      ? linkUrl
      : `https://${linkUrl}`;

    // Get current selection
    const { from, to } = editor.state.selection;
    const hasSelection = from !== to;

    if (hasSelection) {
      // If text is selected, apply link to selection
      editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    } else {
      // If no selection, insert link with URL as text
      editor.chain().focus().insertContent({
        type: 'text',
        marks: [{ type: 'link', attrs: { href: url } }],
        text: linkUrl,
      }).run();
    }

    setShowLinkInput(false);
    setLinkUrl('');
  }, [editor, linkUrl]);

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
      {/* Bubble Menu */}
      <BubbleMenu
        editor={editor}
        tippyOptions={{ duration: 100 }}
        className="bg-stone-800 dark:bg-stone-700 shadow-elevation-4 rounded-xl flex items-center gap-1 p-1.5"
      >
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={clsx(
            'p-2 text-white rounded-lg transition-all duration-200 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-blue-600 focus-visible:ring-offset-3 active:scale-[0.95]',
            editor.isActive('bold') ? 'bg-stone-600' : 'hover:bg-stone-700'
          )}
          title="Bold (⌘B)"
          aria-label="Bold (⌘B)"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 4h8a4 4 0 014 4 4 4 0 01-4 4H6z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 12h9a4 4 0 014 4 4 4 0 01-4 4H6z" />
          </svg>
        </button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={clsx(
            'p-2 text-white rounded-lg transition-all duration-200 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-blue-600 focus-visible:ring-offset-3 active:scale-[0.95]',
            editor.isActive('italic') ? 'bg-stone-600' : 'hover:bg-stone-700'
          )}
          title="Italic (⌘I)"
          aria-label="Italic (⌘I)"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <line x1="19" y1="4" x2="10" y2="4" strokeWidth={2} strokeLinecap="round" />
            <line x1="14" y1="20" x2="5" y2="20" strokeWidth={2} strokeLinecap="round" />
            <line x1="15" y1="4" x2="9" y2="20" strokeWidth={2} strokeLinecap="round" />
          </svg>
        </button>
        <button
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={clsx(
            'p-2 text-white rounded-lg transition-all duration-200 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-blue-600 focus-visible:ring-offset-3 active:scale-[0.95]',
            editor.isActive('strike') ? 'bg-stone-600' : 'hover:bg-stone-700'
          )}
          title="Strikethrough"
          aria-label="Strikethrough"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12h18M9 5l6 14M15 5l-6 14" />
          </svg>
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHighlight().run()}
          className={clsx(
            'p-2 text-white rounded-lg transition-all duration-200 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-blue-600 focus-visible:ring-offset-3 active:scale-[0.95]',
            editor.isActive('highlight') ? 'bg-stone-600' : 'hover:bg-stone-700'
          )}
          title="Highlight (⌘⇧H)"
          aria-label="Highlight (⌘⇧H)"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10M12 3v18M3 12l9-9 9 9" />
          </svg>
        </button>
        <div className="w-px h-6 bg-stone-600 mx-1" />
        <button
          onClick={() => setShowLinkInput(true)}
          className={clsx(
            'p-2 text-white rounded-lg transition-all duration-200 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-blue-600 focus-visible:ring-offset-3 active:scale-[0.95]',
            editor.isActive('link') ? 'bg-stone-600' : 'hover:bg-stone-700'
          )}
          title="Link (⌘K)"
          aria-label="Insert link (⌘K)"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
        </button>
      </BubbleMenu>

      {/* Link Input Modal */}
      {showLinkInput && (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn">
          <div className="bg-white dark:bg-stone-800 rounded-2xl p-8 max-w-md w-full mx-4 shadow-elevation-5 animate-scaleIn">
            <h3 className="text-xl font-semibold mb-5 text-stone-900 dark:text-stone-50">Insert Link</h3>
            <input
              type="text"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setLink();
                } else if (e.key === 'Escape') {
                  setShowLinkInput(false);
                  setLinkUrl('');
                }
              }}
              placeholder="https://example.com"
              className="w-full px-4 py-3 border-2 border-stone-300 dark:border-stone-600 rounded-lg bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-50 placeholder-stone-400 dark:placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mb-6 transition-all duration-200"
              aria-label="Link URL"
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setShowLinkInput(false);
                  setLinkUrl('');
                }}
                className="px-5 py-2.5 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700 rounded-lg transition-all duration-200 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-blue-600 focus-visible:ring-offset-3 active:scale-[0.98]"
                aria-label="Cancel link insertion"
              >
                Cancel
              </button>
              <button
                onClick={setLink}
                className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-elevation-1 hover:shadow-elevation-2 transition-all duration-200 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-blue-600 focus-visible:ring-offset-3 active:scale-[0.98]"
                aria-label="Insert link"
              >
                Insert
              </button>
            </div>
          </div>
        </div>
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

      {/* Toolbar - fixed height */}
      <div className="flex-shrink-0 border-b border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 px-2 md:px-6 lg:px-8 py-2 md:py-4 lg:py-5">
        <div className="max-w-4xl mx-auto w-full flex items-center gap-1 md:gap-2 flex-wrap">
          {/* Text Formatting */}
          <button
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={clsx(
              'p-1.5 md:p-2.5 rounded-md md:rounded-lg transition-all duration-200 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-blue-600 focus-visible:ring-offset-3 active:scale-[0.95]',
              editor.isActive('bold') ? 'bg-stone-200 dark:bg-stone-700 text-stone-900 dark:text-stone-50' : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800'
            )}
            title="Bold (⌘B)"
            aria-label="Bold (⌘B)"
          >
            <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 4h8a4 4 0 014 4 4 4 0 01-4 4H6z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 12h9a4 4 0 014 4 4 4 0 01-4 4H6z" />
            </svg>
          </button>
          <button
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={clsx(
              'p-2.5 rounded-lg transition-all duration-200 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-blue-600 focus-visible:ring-offset-3 active:scale-[0.95]',
              editor.isActive('italic') ? 'bg-stone-200 dark:bg-stone-700 text-stone-900 dark:text-stone-50' : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800'
            )}
            title="Italic (⌘I)"
            aria-label="Italic (⌘I)"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <line x1="19" y1="4" x2="10" y2="4" strokeWidth={2} strokeLinecap="round" />
              <line x1="14" y1="20" x2="5" y2="20" strokeWidth={2} strokeLinecap="round" />
              <line x1="15" y1="4" x2="9" y2="20" strokeWidth={2} strokeLinecap="round" />
            </svg>
          </button>
          <button
            onClick={() => editor.chain().focus().toggleStrike().run()}
            className={clsx(
              'p-2.5 rounded-lg transition-all duration-200 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-blue-600 focus-visible:ring-offset-3 active:scale-[0.95]',
              editor.isActive('strike') ? 'bg-stone-200 dark:bg-stone-700 text-stone-900 dark:text-stone-50' : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800'
            )}
            title="Strikethrough"
            aria-label="Strikethrough"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12h18M9 5l6 14M15 5l-6 14" />
            </svg>
          </button>
          <button
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            className={clsx(
              'p-2.5 rounded-lg transition-all duration-200 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-blue-600 focus-visible:ring-offset-3 active:scale-[0.95]',
              editor.isActive('underline') ? 'bg-stone-200 dark:bg-stone-700 text-stone-900 dark:text-stone-50' : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800'
            )}
            title="Underline (⌘U)"
            aria-label="Underline (⌘U)"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 4v8a6 6 0 0012 0V4M4 20h16" />
            </svg>
          </button>
          <button
            onClick={() => editor.chain().focus().toggleHighlight().run()}
            className={clsx(
              'p-2.5 rounded-lg transition-all duration-200 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-blue-600 focus-visible:ring-offset-3 active:scale-[0.95]',
              editor.isActive('highlight') ? 'bg-stone-200 dark:bg-stone-700 text-stone-900 dark:text-stone-50' : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800'
            )}
            title="Highlight (⌘⇧H)"
            aria-label="Highlight (⌘⇧H)"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10M12 3v18M3 12l9-9 9 9" />
            </svg>
          </button>

          <div className="hidden md:block w-px h-6 bg-stone-200 dark:bg-stone-700 mx-3" />

          {/* Block Formatting */}
          <button
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            className={clsx(
              'p-2.5 rounded-lg transition-all duration-200 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-blue-600 focus-visible:ring-offset-3 active:scale-[0.95]',
              editor.isActive('blockquote') ? 'bg-stone-200 dark:bg-stone-700 text-stone-900 dark:text-stone-50' : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800'
            )}
            title="Blockquote (⌘⇧B)"
            aria-label="Blockquote (⌘⇧B)"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
          </button>
          <button
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
            className="p-2.5 text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg transition-all duration-200 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-blue-600 focus-visible:ring-offset-3 active:scale-[0.95]"
            title="Horizontal Rule"
            aria-label="Insert horizontal rule"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <line x1="4" y1="12" x2="20" y2="12" strokeWidth={2} strokeLinecap="round" />
            </svg>
          </button>

          <div className="hidden md:block w-px h-6 bg-stone-200 dark:bg-stone-700 mx-3" />

          {/* Lists */}
          <button
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={clsx(
              'p-2.5 rounded-lg transition-all duration-200 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-blue-600 focus-visible:ring-offset-3 active:scale-[0.95]',
              editor.isActive('bulletList') ? 'bg-stone-200 dark:bg-stone-700 text-stone-900 dark:text-stone-50' : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800'
            )}
            title="Bullet List (⌘⇧8)"
            aria-label="Bullet list (⌘⇧8)"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <line x1="8" y1="6" x2="21" y2="6" strokeWidth={2} strokeLinecap="round" />
              <line x1="8" y1="12" x2="21" y2="12" strokeWidth={2} strokeLinecap="round" />
              <line x1="8" y1="18" x2="21" y2="18" strokeWidth={2} strokeLinecap="round" />
              <circle cx="4" cy="6" r="1" fill="currentColor" />
              <circle cx="4" cy="12" r="1" fill="currentColor" />
              <circle cx="4" cy="18" r="1" fill="currentColor" />
            </svg>
          </button>
          <button
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={clsx(
              'p-2.5 rounded-lg transition-all duration-200 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-blue-600 focus-visible:ring-offset-3 active:scale-[0.95]',
              editor.isActive('orderedList') ? 'bg-stone-200 dark:bg-stone-700 text-stone-900 dark:text-stone-50' : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800'
            )}
            title="Numbered List (⌘⇧7)"
            aria-label="Numbered list (⌘⇧7)"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <line x1="10" y1="6" x2="21" y2="6" strokeWidth={2} strokeLinecap="round" />
              <line x1="10" y1="12" x2="21" y2="12" strokeWidth={2} strokeLinecap="round" />
              <line x1="10" y1="18" x2="21" y2="18" strokeWidth={2} strokeLinecap="round" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h1v4M4 18h2v-4H4" />
            </svg>
          </button>
          <button
            onClick={() => editor.chain().focus().toggleTaskList().run()}
            className={clsx(
              'p-2.5 rounded-lg transition-all duration-200 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-blue-600 focus-visible:ring-offset-3 active:scale-[0.95]',
              editor.isActive('taskList') ? 'bg-stone-200 dark:bg-stone-700 text-stone-900 dark:text-stone-50' : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800'
            )}
            title="Task List (⌘⇧9)"
            aria-label="Task list (⌘⇧9)"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </button>

          <div className="hidden md:block w-px h-6 bg-stone-200 dark:bg-stone-700 mx-3" />

          {/* Rich Content */}
          <button
            onClick={() => setShowLinkInput(true)}
            className={clsx(
              'p-2.5 rounded-lg transition-all duration-200 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-blue-600 focus-visible:ring-offset-3 active:scale-[0.95]',
              editor.isActive('link') ? 'bg-stone-200 dark:bg-stone-700 text-stone-900 dark:text-stone-50' : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800'
            )}
            title="Insert Link (⌘K)"
            aria-label="Insert link (⌘K)"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          </button>
          <button
            onClick={addImage}
            className="p-2.5 text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg transition-all duration-200 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-blue-600 focus-visible:ring-offset-3 active:scale-[0.95]"
            title="Insert Image"
            aria-label="Insert image"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </button>

          <div className="hidden md:block w-px h-6 bg-stone-200 dark:bg-stone-700 mx-3" />

          <button
            onClick={() => {
              addCodeBlock(note.id, {
                code: '',
                language: 'python',
              });
            }}
            className={clsx(
              'p-2.5 rounded-lg transition-all duration-200 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-blue-600 focus-visible:ring-offset-3 active:scale-[0.95]',
              editor.isActive('executableCodeBlock')
                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800'
            )}
            title="Code Block (⌘⌥C)"
            aria-label="Insert code block (⌘⌥C)"
          >
            <VscCode size={20} aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Editor Content - scrollable content area */}
      <div
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

        <div className="flex-1 max-w-[650px] mx-auto w-full">
          <EditorContent editor={editor} />
        </div>

        {/* Code Blocks (separate from TipTap) */}
        {note.codeBlocks && note.codeBlocks.length > 0 && (
          <div className="max-w-4xl mx-auto w-full">
            {note.codeBlocks.map((block) => (
              <CodeMirrorBlock
                key={block.id}
                noteId={note.id}
                block={block}
              />
            ))}
          </div>
        )}

        {/* Minimal tags at bottom */}
        <div className="max-w-[650px] mx-auto w-full">
          <MinimalTagDisplay noteId={note.id} tags={note.tags || []} />
        </div>
      </div>
    </div>
  );
};
