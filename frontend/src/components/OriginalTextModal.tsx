import { useCallback, useEffect, useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import type { Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import ImageExtension from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { X, FileText, Save } from "lucide-react";
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
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const initialContent = useRef<string>(originalText);

  const handleSave = useCallback(() => {
    if (!editor) return;
    setSaving(true);
    onSave(editor.getHTML());
    initialContent.current = editor.getHTML();
    setHasChanges(false);
    setTimeout(() => {
      setSaving(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }, 300);
  }, [onSave]);

  const handleClose = useCallback(() => {
    setHasChanges(false);
    onClose();
  }, [onClose]);

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
      setHasChanges(ed.getHTML() !== initialContent.current);
    },
    editorProps: {
      attributes: {
        class: "tiptap prose prose-invert max-w-none px-6 py-4 focus:outline-none min-h-[300px]",
      },
    },
  });

  useEffect(() => {
    if (editor && isOpen) {
      initialContent.current = originalText;
      editor.commands.setContent(originalText || "");
      setHasChanges(false);
    }
  }, [originalText, editor, isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
      }
    };
    const handleCmdS = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
    };
    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.addEventListener("keydown", handleCmdS);
    }
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.removeEventListener("keydown", handleCmdS);
    };
  }, [isOpen, handleClose, handleSave]);

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

        <div className="flex items-center justify-between px-4 py-3 border-t border-border">
          <span className="text-xs text-muted-foreground">
            {hasChanges ? "Unsaved changes" : "No changes"}
          </span>
          <div className="flex items-center gap-3">
            {saved && (
              <span className="text-xs text-green-500 font-medium animate-in fade-in">
                Saved!
              </span>
            )}
            <Button
              onClick={handleSave}
              disabled={!hasChanges || saving}
              size="sm"
              className="gap-2"
            >
              <Save className="h-4 w-4" />
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
