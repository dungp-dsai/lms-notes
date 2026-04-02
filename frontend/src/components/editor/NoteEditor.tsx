import { useCallback, useEffect, useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import type { Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import ImageExtension from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Mention from "@tiptap/extension-mention";
import { Plus, X } from "lucide-react";
import { useNote, useUpdateNote, useBacklinks, useTags } from "@/hooks/useNotes";
import { Toolbar } from "./Toolbar";
import { ImagePaste } from "./extensions/image-paste";
import { WikiLink } from "./extensions/wiki-link";
import { wikiLinkSuggestion } from "./extensions/wiki-link-suggestion";
import type { WikiLinkSuggestionItem } from "./extensions/wiki-link-suggestion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface NoteEditorProps {
  noteId: string;
}

export function NoteEditor({ noteId }: NoteEditorProps) {
  const { data: note, isLoading } = useNote(noteId);
  const { data: backlinks = [] } = useBacklinks(noteId);
  const { data: allTags = [] } = useTags();
  const updateNote = useUpdateNote();
  const [title, setTitle] = useState("");
  const [showTagPicker, setShowTagPicker] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>(null);
  const skipNextUpdate = useRef(false);
  const tagPickerRef = useRef<HTMLDivElement>(null);

  const noteTags = note?.tags || [];
  const noteTagIds = noteTags.map((t) => t.id);
  const availableTags = allTags.filter((t) => !noteTagIds.includes(t.id));

  const debouncedSave = useCallback(
    (fields: { title?: string; content?: string }) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        updateNote.mutate({ id: noteId, ...fields });
      }, 500);
    },
    [noteId, updateNote]
  );

  const handleAddTag = (tagId: string) => {
    const newTagIds = [...noteTagIds, tagId];
    updateNote.mutate({ id: noteId, tag_ids: newTagIds });
    setShowTagPicker(false);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        tagPickerRef.current &&
        !tagPickerRef.current.contains(event.target as Node)
      ) {
        setShowTagPicker(false);
      }
    };

    if (showTagPicker) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showTagPicker]);

  const handleRemoveTag = (tagId: string) => {
    const newTagIds = noteTagIds.filter((id) => id !== tagId);
    updateNote.mutate({ id: noteId, tag_ids: newTagIds });
  };

  const editor: Editor | null = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      ImageExtension.configure({ inline: false }),
      Placeholder.configure({ placeholder: "Start writing..." }),
      Underline,
      TaskList,
      TaskItem.configure({ nested: true }),
      ImagePaste,
      WikiLink,
      Mention.configure({
        HTMLAttributes: { class: "wiki-link" },
        suggestion: {
          ...wikiLinkSuggestion,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          command: ({ editor: ed, range, props: item }: any) => {
            (ed as Editor)
              .chain()
              .focus()
              .deleteRange(range)
              .insertContent({
                type: "wikiLink",
                attrs: {
                  title: (item as WikiLinkSuggestionItem).title,
                  noteId: (item as WikiLinkSuggestionItem).id,
                },
              })
              .run();
          },
        },
        renderText: ({ node }) => `[[${node.attrs.label ?? node.attrs.id}]]`,
      }),
    ],
    onUpdate: ({ editor: ed }) => {
      if (skipNextUpdate.current) {
        skipNextUpdate.current = false;
        return;
      }
      debouncedSave({ content: ed.getHTML() });
    },
    editorProps: {
      attributes: {
        class: "tiptap prose prose-invert max-w-none px-6 py-4 focus:outline-none",
      },
    },
  });

  useEffect(() => {
    if (note && editor) {
      setTitle(note.title);
      const currentHTML = editor.getHTML();
      if (currentHTML !== note.content) {
        skipNextUpdate.current = true;
        editor.commands.setContent(note.content || "");
      }
    }
  }, [note, editor]);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.noteId) {
        window.dispatchEvent(
          new CustomEvent("select-note", { detail: { noteId: detail.noteId } })
        );
      }
    };
    window.addEventListener("navigate-note", handler);
    return () => window.removeEventListener("navigate-note", handler);
  }, []);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    debouncedSave({ title: newTitle });
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        Loading...
      </div>
    );
  }

  if (!note) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        Note not found
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {editor && <Toolbar editor={editor} />}
      <ScrollArea className="flex-1">
        <div className="max-w-3xl mx-auto w-full">
          <div className="px-6 pt-6">
            <Input
              value={title}
              onChange={handleTitleChange}
              placeholder="Note title..."
              className="border-none text-2xl font-bold h-auto py-0 px-0 focus-visible:ring-0 bg-transparent"
            />

            <div className="flex flex-wrap items-center gap-1.5 mt-3">
              {noteTags.map((tag) => (
                <span
                  key={tag.id}
                  className="group text-xs px-2 py-0.5 rounded-full text-white flex items-center gap-1"
                  style={{ backgroundColor: tag.color }}
                >
                  {tag.name}
                  <button
                    onClick={() => handleRemoveTag(tag.id)}
                    className="opacity-60 hover:opacity-100 transition-opacity"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}

              <div className="relative" ref={tagPickerRef}>
                <button
                  onClick={() => setShowTagPicker(!showTagPicker)}
                  className={cn(
                    "text-xs px-2 py-0.5 rounded-full border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-foreground/50 transition-colors flex items-center gap-1 cursor-pointer",
                    showTagPicker && "border-foreground/50 text-foreground"
                  )}
                >
                  <Plus className="h-3 w-3" />
                  Add tag
                </button>

                {showTagPicker && (
                  <div className="absolute top-full left-0 mt-1 bg-popover border border-border rounded-md shadow-lg p-1 min-w-[120px] z-10">
                    {availableTags.length === 0 ? (
                      <div className="text-xs text-muted-foreground px-2 py-1">
                        No more tags
                      </div>
                    ) : (
                      availableTags.map((tag) => (
                        <button
                          key={tag.id}
                          onClick={() => handleAddTag(tag.id)}
                          className="w-full text-left text-xs px-2 py-1 rounded hover:bg-accent flex items-center gap-2 cursor-pointer"
                        >
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: tag.color }}
                          />
                          {tag.name}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
          <EditorContent editor={editor} />

          {backlinks.length > 0 && (
            <div className="px-6 pb-6 mt-8 border-t border-border pt-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Backlinks
              </h3>
              <div className="flex flex-wrap gap-2">
                {backlinks.map((bl) => (
                  <button
                    key={bl.id}
                    onClick={() =>
                      window.dispatchEvent(
                        new CustomEvent("select-note", {
                          detail: { noteId: bl.id },
                        })
                      )
                    }
                    className="text-sm text-purple-400 hover:text-purple-300 hover:underline cursor-pointer"
                  >
                    {bl.title}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
