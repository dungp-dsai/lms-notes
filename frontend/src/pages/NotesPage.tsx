import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Home } from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { NoteEditor } from "@/components/editor/NoteEditor";
import { Button } from "@/components/ui/button";
import { useTask } from "@/hooks/useNotes";

const MIN_SIDEBAR_WIDTH = 200;
const MAX_SIDEBAR_WIDTH = 500;
const DEFAULT_SIDEBAR_WIDTH = 256;

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
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_SIDEBAR_WIDTH);
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  const revisionTaskId = searchParams.get("revision");
  const { data: revisionTask } = useTask(revisionTaskId);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const newWidth = Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, e.clientX));
      setSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing]);

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
    <div className={`flex h-screen overflow-hidden ${isResizing ? "select-none" : ""}`}>
      <div
        ref={sidebarRef}
        style={{ width: sidebarWidth }}
        className="flex h-full flex-col border-r border-sidebar-border bg-sidebar relative shrink-0"
      >
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
        <div
          onMouseDown={handleMouseDown}
          className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/50 transition-colors group"
        >
          <div className="absolute top-0 right-0 w-1 h-full group-hover:bg-primary/50" />
        </div>
      </div>
      <main className="flex-1 overflow-hidden">
        {activeNoteId ? (
          <NoteEditor 
            key={activeNoteId} 
            noteId={activeNoteId}
            revisionTask={revisionTaskId && revisionTask ? {
              id: revisionTask.id,
              explanation: revisionTask.revision_explanation || "",
            } : undefined}
            onRevisionComplete={() => {
              searchParams.delete("revision");
              setSearchParams(searchParams);
            }}
          />
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
