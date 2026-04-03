import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Home } from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { NoteEditor } from "@/components/editor/NoteEditor";
import { Button } from "@/components/ui/button";

export function NotesPage() {
  const navigate = useNavigate();
  const { noteId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeNoteId, setActiveNoteId] = useState<string | null>(noteId || null);
  const [selectedTagId, setSelectedTagId] = useState<string | null>(
    searchParams.get("tag")
  );
  const [showUntagged, setShowUntagged] = useState<boolean>(
    searchParams.get("untagged") === "true"
  );

  useEffect(() => {
    if (noteId) {
      setActiveNoteId(noteId);
    }
  }, [noteId]);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.noteId) {
        setActiveNoteId(detail.noteId);
        navigate(`/notes/${detail.noteId}`, { replace: true });
      }
    };
    window.addEventListener("select-note", handler);
    return () => window.removeEventListener("select-note", handler);
  }, [navigate]);

  const handleSelectNote = (id: string) => {
    setActiveNoteId(id);
    navigate(`/notes/${id}`, { replace: true });
  };

  const handleSelectTag = (tagId: string | null) => {
    setSelectedTagId(tagId);
    setShowUntagged(false);
    if (tagId) {
      setSearchParams({ tag: tagId });
    } else {
      setSearchParams({});
    }
  };

  const handleToggleUntagged = (untagged: boolean) => {
    setShowUntagged(untagged);
    setSelectedTagId(null);
    if (untagged) {
      setSearchParams({ untagged: "true" });
    } else {
      setSearchParams({});
    }
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <div className="flex h-full w-64 flex-col border-r border-sidebar-border bg-sidebar">
        <div className="p-2 border-b border-sidebar-border">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/")}
            className="w-full justify-start"
          >
            <Home className="h-4 w-4 mr-2" />
            Home
          </Button>
        </div>
        <div className="flex-1 overflow-hidden">
          <Sidebar
            activeNoteId={activeNoteId}
            onSelectNote={handleSelectNote}
            selectedTagId={selectedTagId}
            onSelectTag={handleSelectTag}
            showUntagged={showUntagged}
            onToggleUntagged={handleToggleUntagged}
          />
        </div>
      </div>
      <main className="flex-1 overflow-hidden">
        {activeNoteId ? (
          <NoteEditor key={activeNoteId} noteId={activeNoteId} />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <div className="text-center">
              <p className="text-lg font-medium">No note selected</p>
              <p className="text-sm mt-1">
                Select a note from the sidebar or create a new one
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
