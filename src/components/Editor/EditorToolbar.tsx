import { Editor } from '@tiptap/react';
import { Button } from '../ui/Button';
import { Tooltip } from '../ui/Tooltip';
import { FontControls } from './FontControls';
import { ColorPicker } from './ColorPicker';
import { useState } from 'react';
import {
    LuBold, LuItalic, LuStrikethrough, LuUnderline, LuHighlighter, LuPalette,
    LuType, LuSuperscript, LuSubscript,
    LuAlignLeft, LuAlignCenter, LuAlignRight, LuAlignJustify,
    LuList, LuListOrdered, LuSquareCheck,
    LuLink, LuTable, LuImage, LuCode
} from 'react-icons/lu';

interface EditorToolbarProps {
    editor: Editor;
    onAddImage: () => void;
    onLinkClick: () => void;
}

export const EditorToolbar = ({ editor, onAddImage, onLinkClick }: EditorToolbarProps) => {
    const [showFontControls, setShowFontControls] = useState(false);
    const [fontAnchorElement, setFontAnchorElement] = useState<HTMLElement | null>(null);
    const [showColorPicker, setShowColorPicker] = useState(false);
    const [colorAnchor, setColorAnchor] = useState<HTMLElement | null>(null);
    const [colorMode, setColorMode] = useState<'text' | 'highlight'>('text');

    return (
        <div className="flex-shrink-0 border-b border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 px-3 py-2 z-10 overflow-x-auto no-scrollbar">
            <div className="max-w-5xl mx-auto w-full flex items-center gap-0.5 flex-nowrap md:flex-wrap min-w-max md:min-w-0">
                {/* Text Formatting Group */}
                <div className="flex items-center gap-0.5 bg-stone-100 dark:bg-stone-800/50 p-1 rounded-lg">
                    <Tooltip content="Bold" shortcut="⌘B">
                        <Button
                            variant={editor.isActive('bold') ? 'default' : 'ghost'}
                            size="icon"
                            onClick={() => editor.chain().focus().toggleBold().run()}
                            aria-label="Bold"
                        >
                            <LuBold className="w-4 h-4" />
                        </Button>
                    </Tooltip>

                    <Tooltip content="Italic" shortcut="⌘I">
                        <Button
                            variant={editor.isActive('italic') ? 'default' : 'ghost'}
                            size="icon"
                            onClick={() => editor.chain().focus().toggleItalic().run()}
                            aria-label="Italic"
                        >
                            <LuItalic className="w-4 h-4" />
                        </Button>
                    </Tooltip>

                    <Tooltip content="Strikethrough">
                        <Button
                            variant={editor.isActive('strike') ? 'default' : 'ghost'}
                            size="icon"
                            onClick={() => editor.chain().focus().toggleStrike().run()}
                            aria-label="Strikethrough"
                        >
                            <LuStrikethrough className="w-4 h-4" />
                        </Button>
                    </Tooltip>

                    <Tooltip content="Underline" shortcut="⌘U">
                        <Button
                            variant={editor.isActive('underline') ? 'default' : 'ghost'}
                            size="icon"
                            onClick={() => editor.chain().focus().toggleUnderline().run()}
                            aria-label="Underline"
                        >
                            <LuUnderline className="w-4 h-4" />
                        </Button>
                    </Tooltip>

                    <Tooltip content="Highlight">
                        <Button
                            variant={editor.isActive('highlight') ? 'default' : 'ghost'}
                            size="icon"
                            onClick={() => editor.chain().focus().toggleHighlight().run()}
                            aria-label="Highlight"
                        >
                            <LuHighlighter className="w-4 h-4" />
                        </Button>
                    </Tooltip>

                    <Tooltip content="Color">
                        <Button
                            variant={editor.isActive('textStyle') || editor.isActive('highlight') ? 'default' : 'ghost'}
                            size="icon"
                            onClick={(e) => {
                                setColorAnchor(e.currentTarget);
                                setShowColorPicker(true);
                            }}
                            aria-label="Color"
                        >
                            <LuPalette className="w-4 h-4" />
                        </Button>
                    </Tooltip>
                </div>

                <div className="w-px h-5 bg-stone-200 dark:bg-stone-800 mx-1.5" />

                {/* Font Group */}
                <div className="flex items-center gap-0.5 bg-stone-100 dark:bg-stone-800/50 p-1 rounded-lg">
                    <Tooltip content="Font">
                        <Button
                            variant="ghost"
                            size="icon"
                            ref={(el) => setFontAnchorElement(el)}
                            onClick={() => setShowFontControls(!showFontControls)}
                            aria-label="Font"
                        >
                            <LuType className="w-4 h-4" />
                        </Button>
                    </Tooltip>
                </div>

                <div className="w-px h-5 bg-stone-200 dark:bg-stone-800 mx-1.5" />

                {/* Superscript/Subscript Group */}
                <div className="flex items-center gap-0.5 bg-stone-100 dark:bg-stone-800/50 p-1 rounded-lg">
                    <Tooltip content="Superscript" shortcut="⌘⇧=">
                        <Button
                            variant={editor.isActive('superscript') ? 'default' : 'ghost'}
                            size="icon"
                            onClick={() => editor.chain().focus().toggleSuperscript().run()}
                            aria-label="Superscript"
                        >
                            <LuSuperscript className="w-4 h-4" />
                        </Button>
                    </Tooltip>

                    <Tooltip content="Subscript" shortcut="⌘⇧-">
                        <Button
                            variant={editor.isActive('subscript') ? 'default' : 'ghost'}
                            size="icon"
                            onClick={() => editor.chain().focus().toggleSubscript().run()}
                            aria-label="Subscript"
                        >
                            <LuSubscript className="w-4 h-4" />
                        </Button>
                    </Tooltip>
                </div>

                <div className="w-px h-5 bg-stone-200 dark:bg-stone-800 mx-1.5" />

                {/* Alignment Group */}
                <div className="flex items-center gap-0.5 bg-stone-100 dark:bg-stone-800/50 p-1 rounded-lg">
                    <Tooltip content="Align Left">
                        <Button
                            variant={editor.isActive({ textAlign: 'left' }) ? 'default' : 'ghost'}
                            size="icon"
                            onClick={() => editor.chain().focus().setTextAlign('left').run()}
                            aria-label="Align Left"
                        >
                            <LuAlignLeft className="w-4 h-4" />
                        </Button>
                    </Tooltip>

                    <Tooltip content="Align Center">
                        <Button
                            variant={editor.isActive({ textAlign: 'center' }) ? 'default' : 'ghost'}
                            size="icon"
                            onClick={() => editor.chain().focus().setTextAlign('center').run()}
                            aria-label="Align Center"
                        >
                            <LuAlignCenter className="w-4 h-4" />
                        </Button>
                    </Tooltip>

                    <Tooltip content="Align Right">
                        <Button
                            variant={editor.isActive({ textAlign: 'right' }) ? 'default' : 'ghost'}
                            size="icon"
                            onClick={() => editor.chain().focus().setTextAlign('right').run()}
                            aria-label="Align Right"
                        >
                            <LuAlignRight className="w-4 h-4" />
                        </Button>
                    </Tooltip>

                    <Tooltip content="Justify">
                        <Button
                            variant={editor.isActive({ textAlign: 'justify' }) ? 'default' : 'ghost'}
                            size="icon"
                            onClick={() => editor.chain().focus().setTextAlign('justify').run()}
                            aria-label="Justify"
                        >
                            <LuAlignJustify className="w-4 h-4" />
                        </Button>
                    </Tooltip>
                </div>

                <div className="w-px h-5 bg-stone-200 dark:bg-stone-800 mx-1.5" />

                {/* Lists Group */}
                <div className="flex items-center gap-0.5 bg-stone-100 dark:bg-stone-800/50 p-1 rounded-lg">
                    <Tooltip content="Bullet List">
                        <Button
                            variant={editor.isActive('bulletList') ? 'default' : 'ghost'}
                            size="icon"
                            onClick={() => editor.chain().focus().toggleBulletList().run()}
                            aria-label="Bullet List"
                        >
                            <LuList className="w-4 h-4" />
                        </Button>
                    </Tooltip>

                    <Tooltip content="Numbered List">
                        <Button
                            variant={editor.isActive('orderedList') ? 'default' : 'ghost'}
                            size="icon"
                            onClick={() => editor.chain().focus().toggleOrderedList().run()}
                            aria-label="Numbered List"
                        >
                            <LuListOrdered className="w-4 h-4" />
                        </Button>
                    </Tooltip>

                    <Tooltip content="Task List">
                        <Button
                            variant={editor.isActive('taskList') ? 'default' : 'ghost'}
                            size="icon"
                            onClick={() => editor.chain().focus().toggleTaskList().run()}
                            aria-label="Task List"
                        >
                            <LuSquareCheck className="w-4 h-4" />
                        </Button>
                    </Tooltip>
                </div>

                <div className="w-px h-5 bg-stone-200 dark:bg-stone-800 mx-1.5" />

                {/* Insert Group */}
                <div className="flex items-center gap-0.5 bg-stone-100 dark:bg-stone-800/50 p-1 rounded-lg">
                    <Tooltip content="Insert Link" shortcut="⌘K">
                        <Button
                            variant={editor.isActive('link') ? 'default' : 'ghost'}
                            size="icon"
                            onClick={onLinkClick}
                            aria-label="Insert Link"
                        >
                            <LuLink className="w-4 h-4" />
                        </Button>
                    </Tooltip>

                    <Tooltip content="Insert Code Block" shortcut="⌘⌥C">
                        <Button
                            variant={editor.isActive('executableCodeBlock') ? 'default' : 'ghost'}
                            size="icon"
                            onClick={() => editor.chain().focus().setExecutableCodeBlock().run()}
                            aria-label="Insert Code Block"
                        >
                            <LuCode className="w-4 h-4" />
                        </Button>
                    </Tooltip>

                    <Tooltip content="Insert Table">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
                            aria-label="Insert Table"
                        >
                            <LuTable className="w-4 h-4" />
                        </Button>
                    </Tooltip>

                    <Tooltip content="Insert Image">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={onAddImage}
                            aria-label="Insert Image"
                        >
                            <LuImage className="w-4 h-4" />
                        </Button>
                    </Tooltip>
                </div>
            </div>

            {/* Popovers */}
            {showFontControls && fontAnchorElement && (
                <FontControls
                    editor={editor}
                    onClose={() => setShowFontControls(false)}
                    anchorElement={fontAnchorElement}
                />
            )}

            {showColorPicker && colorAnchor && (
                <ColorPicker
                    editor={editor}
                    onClose={() => setShowColorPicker(false)}
                    anchorElement={colorAnchor}
                    mode={colorMode}
                    onModeChange={setColorMode}
                />
            )}
        </div>
    );
};
