import { useEffect, useState } from "react";
import { Sidebar } from "./Sidebar";
import { NoteEditor } from "@/components/editor/NoteEditor";

export function AppLayout() {
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.noteId) {
        setActiveNoteId(detail.noteId);
      }
    };
    window.addEventListener("select-note", handler);
    return () => window.removeEventListener("select-note", handler);
  }, []);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar activeNoteId={activeNoteId} onSelectNote={setActiveNoteId} />
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
