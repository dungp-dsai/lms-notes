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
import { Plus, X, FileText, AlertCircle, CheckCircle2, Trash2 } from "lucide-react";
import { useNote, useUpdateNote, useBacklinks, useTags, useSubmitRevision, useDeleteNote, useNoteList } from "@/hooks/useNotes";
import { OriginalTextModal } from "@/components/OriginalTextModal";
import { Toolbar } from "./Toolbar";
import { ImagePaste } from "./extensions/image-paste";
import { WikiLink } from "./extensions/wiki-link";
import { wikiLinkSuggestion } from "./extensions/wiki-link-suggestion";
import type { WikiLinkSuggestionItem } from "./extensions/wiki-link-suggestion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface RevisionTask {
  id: string;
  explanation: string;
}

interface NoteEditorProps {
  noteId: string;
  revisionTask?: RevisionTask;
  onRevisionComplete?: () => void;
}

export function NoteEditor({ noteId, revisionTask, onRevisionComplete }: NoteEditorProps) {
  const { data: note, isLoading } = useNote(noteId);
  const { data: backlinks = [] } = useBacklinks(noteId);
  const { data: allTags = [] } = useTags();
  const { data: notes = [] } = useNoteList();
  const updateNote = useUpdateNote();
  const deleteNote = useDeleteNote();
  const submitRevision = useSubmitRevision();
  const [title, setTitle] = useState("");
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [showOriginalText, setShowOriginalText] = useState(false);
  const [showRevisionBanner, setShowRevisionBanner] = useState(!!revisionTask);
  const [revisionCompleted, setRevisionCompleted] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>(null);
  const skipNextUpdate = useRef(false);
  const tagPickerRef = useRef<HTMLDivElement>(null);

  const handleDeleteNote = () => {
    const remaining = notes.filter((n) => n.id !== noteId);
    deleteNote.mutate(noteId);
    setShowDeleteConfirm(false);
    if (remaining.length > 0) {
      window.dispatchEvent(
        new CustomEvent("select-note", { detail: { noteId: remaining[0].id } })
      );
    }
  };

  useEffect(() => {
    if (revisionTask) {
      setShowRevisionBanner(true);
      setRevisionCompleted(false);
    }
  }, [revisionTask]);

  const handleCompleteRevision = async () => {
    if (!revisionTask || !editor) return;
    
    try {
      await submitRevision.mutateAsync({
        id: revisionTask.id,
        revisedContent: editor.getHTML(),
      });
      setRevisionCompleted(true);
      setTimeout(() => {
        setShowRevisionBanner(false);
        onRevisionComplete?.();
      }, 2000);
    } catch (error) {
      console.error("Failed to complete revision:", error);
    }
  };

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

  const handleSaveOriginalText = useCallback(
    (text: string) => {
      updateNote.mutate({ id: noteId, original_text: text });
    },
    [noteId, updateNote]
  );

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
      
      {showRevisionBanner && revisionTask && (
        <div className={cn(
          "mx-3 sm:mx-6 mt-3 sm:mt-4 p-3 sm:p-4 rounded-lg border transition-all",
          revisionCompleted 
            ? "bg-green-500/10 border-green-500/30" 
            : "bg-amber-500/10 border-amber-500/30"
        )}>
          <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-3">
            <div className="flex items-start gap-2 sm:gap-3 flex-1 min-w-0">
              {revisionCompleted ? (
                <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-green-500 mt-0.5 shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-amber-500 mt-0.5 shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                {revisionCompleted ? (
                  <p className="text-xs sm:text-sm font-medium text-green-600 dark:text-green-400">
                    Revision completed! Great job improving your notes.
                  </p>
                ) : (
                  <>
                    <p className="text-xs sm:text-sm font-medium text-amber-600 dark:text-amber-400 mb-1">
                      This note needs revision
                    </p>
                    <p className="text-xs sm:text-sm text-foreground/80">
                      {revisionTask.explanation}
                    </p>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 ml-6 sm:ml-0">
              {!revisionCompleted && (
                <Button
                  size="sm"
                  onClick={handleCompleteRevision}
                  disabled={submitRevision.isPending}
                  className="bg-amber-500 hover:bg-amber-600 text-white text-xs sm:text-sm h-7 sm:h-8"
                >
                  {submitRevision.isPending ? "Saving..." : "Mark as Revised"}
                </Button>
              )}
              <button
                onClick={() => {
                  setShowRevisionBanner(false);
                  if (!revisionCompleted) {
                    onRevisionComplete?.();
                  }
                }}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
      
      <ScrollArea className="flex-1">
        <div className="max-w-3xl mx-auto w-full">
          <div className="px-3 sm:px-6 pt-4 sm:pt-6">
            <Input
              value={title}
              onChange={handleTitleChange}
              placeholder="Note title..."
              className="border-none text-xl sm:text-2xl font-bold h-auto py-0 px-0 focus-visible:ring-0 bg-transparent"
            />

            <div className="flex flex-wrap items-center gap-1.5 mt-3">
              {noteTags.map((tag) => (
                <span
                  key={tag.id}
                  className="group text-xs px-2 py-0.5 rounded-md border border-border text-muted-foreground flex items-center gap-1"
                >
                  {tag.name}
                  <button
                    onClick={() => handleRemoveTag(tag.id)}
                    className="opacity-60 hover:opacity-100 transition-opacity hover:text-red-400"
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
                  <span className="hidden sm:inline">Add tag</span>
                  <span className="sm:hidden">Tag</span>
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

              <button
                onClick={() => setShowOriginalText(true)}
                className={cn(
                  "text-xs px-2 py-0.5 rounded-full border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-foreground/50 transition-colors flex items-center gap-1 cursor-pointer",
                  note.original_text && "border-purple-500/50 text-purple-400 hover:text-purple-300"
                )}
              >
                <FileText className="h-3 w-3" />
                <span className="hidden sm:inline">{note.original_text ? "View Original" : "Add Original"}</span>
                <span className="sm:hidden">{note.original_text ? "Original" : "Add"}</span>
              </button>

              {showDeleteConfirm ? (
                <div className="flex items-center gap-1.5 text-xs ml-auto">
                  <span className="text-red-400">Delete?</span>
                  <button
                    onClick={handleDeleteNote}
                    className="text-red-400 hover:text-red-300 font-medium px-2 py-0.5 bg-red-500/20 rounded"
                  >
                    Yes
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="text-muted-foreground hover:text-foreground font-medium px-2 py-0.5 bg-muted rounded"
                  >
                    No
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="text-xs px-2 py-0.5 rounded-full border border-dashed border-red-500/30 text-red-400/70 hover:text-red-400 hover:border-red-500/50 hover:bg-red-500/10 transition-colors flex items-center gap-1 cursor-pointer ml-auto"
                  title="Delete note"
                >
                  <Trash2 className="h-3 w-3" />
                  <span className="hidden sm:inline">Delete</span>
                </button>
              )}
            </div>
          </div>
          <div className="px-3 sm:px-6">
            <EditorContent editor={editor} />
          </div>

          {backlinks.length > 0 && (
            <div className="px-3 sm:px-6 pb-6 mt-8 border-t border-border pt-4">
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
                    className="text-xs sm:text-sm text-purple-400 hover:text-purple-300 hover:underline cursor-pointer"
                  >
                    {bl.title}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      <OriginalTextModal
        isOpen={showOriginalText}
        onClose={() => setShowOriginalText(false)}
        originalText={note.original_text || ""}
        onSave={handleSaveOriginalText}
      />
    </div>
  );
}
