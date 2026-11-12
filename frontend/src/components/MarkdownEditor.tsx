import { Markdown } from "@tiptap/markdown";
import { Placeholder } from "@tiptap/extension-placeholder";
import { Table, TableCell, TableHeader, TableRow } from "@tiptap/extension-table";
import { EditorContent, useEditor, useEditorState, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  Bold,
  ChevronDown,
  Code,
  Italic,
  List,
  ListOrdered,
  Quote,
  Redo2,
  Strikethrough,
  Underline,
  Undo2,
} from "lucide-react";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export const EditorVariant = { Document: "document", Compact: "compact" } as const;
export type EditorVariant = (typeof EditorVariant)[keyof typeof EditorVariant];

export function useMarkdownEditor({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (markdown: string) => void;
  placeholder: string;
}) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  return useEditor({
    extensions: [
      StarterKit.configure({ link: { openOnClick: false } }),
      Table,
      TableRow,
      TableHeader,
      TableCell,
      Markdown,
      Placeholder.configure({ placeholder }),
    ],
    content: value,
    contentType: "markdown",
    immediatelyRender: true,
    onUpdate: ({ editor }) => onChangeRef.current(editor.getMarkdown()),
  });
}

export function MarkdownEditorContent({
  editor,
  variant,
  className,
}: {
  editor: Editor | null;
  variant: EditorVariant;
  className?: string;
}) {
  return (
    <EditorContent
      editor={editor}
      className={cn(
        "sofa-editor",
        variant === EditorVariant.Compact && "sofa-editor-compact",
        className,
      )}
    />
  );
}

/** Keeps an editor in step with a record that changed underneath it, without clobbering typing. */
export function useSyncEditorContent(editor: Editor | null, value: string, key: string) {
  const lastKey = useRef(key);
  useEffect(() => {
    if (!editor || lastKey.current === key) return;
    lastKey.current = key;
    editor.commands.setContent(value, { contentType: "markdown", emitUpdate: false });
  }, [editor, value, key]);
}

const BLOCKS = [
  { label: "Paragraph", level: 0 },
  { label: "Heading 1", level: 1 },
  { label: "Heading 2", level: 2 },
  { label: "Heading 3", level: 3 },
] as const;

export function EditorToolbar({ editor, className }: { editor: Editor; className?: string }) {
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      underline: e.isActive("underline"),
      strike: e.isActive("strike"),
      code: e.isActive("code"),
      bullet: e.isActive("bulletList"),
      ordered: e.isActive("orderedList"),
      quote: e.isActive("blockquote"),
      level: ([1, 2, 3] as const).find((level) => e.isActive("heading", { level })) ?? 0,
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
    }),
  });
  const chain = () => editor.chain().focus();
  const toggle = (label: string, icon: React.ReactNode, active: boolean, run: () => void) => (
    <Tooltip content={label}>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        aria-label={label}
        aria-pressed={active}
        onMouseDown={(event) => event.preventDefault()}
        onClick={run}
        className={cn("text-muted-foreground", active && "bg-accent text-foreground")}
      >
        {icon}
      </Button>
    </Tooltip>
  );
  const divider = <span className="bg-border mx-1 h-4 w-px" />;

  return (
    <div className={cn("flex items-center gap-0.5", className)}>
      {toggle("Undo", <Undo2 />, false, () => chain().undo().run())}
      {toggle("Redo", <Redo2 />, false, () => chain().redo().run())}
      {divider}
      {toggle("Bold", <Bold />, state.bold, () => chain().toggleBold().run())}
      {toggle("Italic", <Italic />, state.italic, () => chain().toggleItalic().run())}
      {toggle("Underline", <Underline />, state.underline, () => chain().toggleUnderline().run())}
      {toggle("Strikethrough", <Strikethrough />, state.strike, () => chain().toggleStrike().run())}
      {divider}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="xs"
            className="text-foreground w-28 justify-between font-normal"
            onMouseDown={(event) => event.preventDefault()}
          >
            {BLOCKS.find((block) => block.level === state.level)?.label}
            <ChevronDown className="text-muted-foreground size-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="min-w-36" onCloseAutoFocus={(e) => e.preventDefault()}>
          {BLOCKS.map((block) => (
            <DropdownMenuItem
              key={block.level}
              onSelect={() =>
                block.level === 0
                  ? chain().setParagraph().run()
                  : chain().setHeading({ level: block.level }).run()
              }
            >
              {block.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      {divider}
      {toggle("Bulleted List", <List />, state.bullet, () => chain().toggleBulletList().run())}
      {toggle("Numbered List", <ListOrdered />, state.ordered, () =>
        chain().toggleOrderedList().run(),
      )}
      {toggle("Quote", <Quote />, state.quote, () => chain().toggleBlockquote().run())}
      {toggle("Code", <Code />, state.code, () => chain().toggleCode().run())}
    </div>
  );
}
