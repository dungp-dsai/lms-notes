import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Home, Menu, X, PanelLeftClose, PanelLeft } from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { NoteEditor } from "@/components/editor/NoteEditor";
import { Button } from "@/components/ui/button";
import { useTask } from "@/hooks/useNotes";
import { cn } from "@/lib/utils";

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
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
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
    setIsMobileSidebarOpen(false);
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
      {isMobileSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}
      
      <div
        ref={sidebarRef}
        style={{ width: isSidebarCollapsed ? 0 : sidebarWidth }}
        className={cn(
          "flex h-full flex-col border-r border-sidebar-border bg-sidebar relative shrink-0",
          "fixed md:static inset-y-0 left-0 z-50 md:z-auto",
          "transition-all duration-300 ease-in-out",
          isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
          isSidebarCollapsed && "md:w-0 md:border-r-0 md:overflow-hidden"
        )}
      >
        <div className="p-2 border-b border-sidebar-border flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/")}
            className="flex-1 justify-start"
          >
            <Home className="h-4 w-4 mr-2" />
            Home
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsSidebarCollapsed(true)}
            className="hidden md:flex h-8 w-8"
            title="Hide sidebar"
          >
            <PanelLeftClose className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMobileSidebarOpen(false)}
            className="md:hidden h-8 w-8"
          >
            <X className="h-4 w-4" />
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
          className={cn(
            "absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/50 transition-colors group hidden md:block",
            isSidebarCollapsed && "md:hidden"
          )}
        >
          <div className="absolute top-0 right-0 w-1 h-full group-hover:bg-primary/50" />
        </div>
      </div>

      <main className="flex-1 overflow-hidden flex flex-col">
        <div className="md:hidden flex items-center gap-2 p-2 border-b border-border bg-card">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMobileSidebarOpen(true)}
            className="h-8 w-8"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <span className="text-sm font-medium truncate flex-1">
            {activeNoteId ? "Note Editor" : "Notes"}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/")}
            className="h-8"
          >
            <Home className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-hidden relative">
          {isSidebarCollapsed && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsSidebarCollapsed(false)}
              className="absolute top-2 left-2 z-10 h-8 w-8 hidden md:flex bg-card/80 hover:bg-card border border-border shadow-sm"
              title="Show sidebar"
            >
              <PanelLeft className="h-4 w-4" />
            </Button>
          )}
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
            <div className="flex h-full items-center justify-center text-muted-foreground p-4">
              <div className="text-center">
                <p className="text-base sm:text-lg font-medium">No note selected</p>
                <p className="text-sm mt-1">
                  Select a note from the sidebar or create a new one
                </p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
