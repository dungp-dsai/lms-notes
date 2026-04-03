import { useCallback, useEffect, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import type { Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import ImageExtension from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { X, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ImagePaste } from "@/components/editor/extensions/image-paste";
import { Toolbar } from "@/components/editor/Toolbar";

interface OriginalTextModalProps {
  isOpen: boolean;
  onClose: () => void;
  originalText: string;
  onSave: (text: string) => void;
}

export function OriginalTextModal({
  isOpen,
  onClose,
  originalText,
  onSave,
}: OriginalTextModalProps) {
  const saveTimer = useRef<ReturnType<typeof setTimeout>>(null);
  const skipNextUpdate = useRef(false);
  const lastContent = useRef<string>(originalText);

  const debouncedSave = useCallback(
    (content: string) => {
      lastContent.current = content;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        onSave(content);
      }, 500);
    },
    [onSave]
  );

  const handleClose = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    if (lastContent.current !== originalText) {
      onSave(lastContent.current);
    }
    onClose();
  }, [onClose, onSave, originalText]);

  const editor: Editor | null = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      ImageExtension.configure({ inline: false }),
      Placeholder.configure({ placeholder: "Paste or type the original text here..." }),
      Underline,
      TaskList,
      TaskItem.configure({ nested: true }),
      ImagePaste,
    ],
    onUpdate: ({ editor: ed }) => {
      if (skipNextUpdate.current) {
        skipNextUpdate.current = false;
        return;
      }
      debouncedSave(ed.getHTML());
    },
    editorProps: {
      attributes: {
        class: "tiptap prose prose-invert max-w-none px-6 py-4 focus:outline-none min-h-[300px]",
      },
    },
  });

  useEffect(() => {
    if (editor && isOpen) {
      lastContent.current = originalText;
      const currentHTML = editor.getHTML();
      if (currentHTML !== originalText) {
        skipNextUpdate.current = true;
        editor.commands.setContent(originalText || "");
      }
    }
  }, [originalText, editor, isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
      }
    };
    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
    }
    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, handleClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />
      <div className="relative bg-background border border-border rounded-lg shadow-xl w-[90vw] max-w-4xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-muted-foreground" />
            <h2 className="font-semibold">Original Text</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={handleClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {editor && <Toolbar editor={editor} />}

        <ScrollArea className="flex-1 min-h-0">
          <EditorContent editor={editor} />
        </ScrollArea>

        <div className="px-4 py-3 border-t border-border text-xs text-muted-foreground">
          Changes are saved automatically
        </div>
      </div>
    </div>
  );
}
