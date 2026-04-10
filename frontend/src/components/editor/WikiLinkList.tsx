import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
} from "react";
import { FileText } from "lucide-react";
import type { SuggestionProps } from "@tiptap/suggestion";
import type { WikiLinkSuggestionItem } from "./extensions/wiki-link-suggestion";

type Props = SuggestionProps<WikiLinkSuggestionItem>;

export const WikiLinkList = forwardRef<
  { onKeyDown: (props: { event: KeyboardEvent }) => boolean },
  Props
>((props, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    setSelectedIndex(0);
  }, [props.items]);

  const selectItem = (index: number) => {
    const item = props.items[index];
    if (item) {
      props.command(item);
    }
  };

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }: { event: KeyboardEvent }) => {
      if (event.key === "ArrowUp") {
        setSelectedIndex(
          (selectedIndex + props.items.length - 1) % props.items.length
        );
        return true;
      }

      if (event.key === "ArrowDown") {
        setSelectedIndex((selectedIndex + 1) % props.items.length);
        return true;
      }

      if (event.key === "Enter") {
        selectItem(selectedIndex);
        return true;
      }

      return false;
    },
  }));

  if (props.items.length === 0) {
    return (
      <div className="mention-suggestion">
        <div className="item text-muted-foreground flex items-center gap-2">
          <FileText className="h-4 w-4 opacity-50" />
          <span>No notes found</span>
        </div>
      </div>
    );
  }

  return (
    <div className="mention-suggestion">
      {props.items.map((item, index) => (
        <button
          className={`item ${index === selectedIndex ? "is-selected" : ""}`}
          key={item.id}
          onClick={() => selectItem(index)}
        >
          <span className="flex items-center gap-2">
            <FileText className="h-4 w-4 opacity-60 shrink-0" />
            <span className="truncate">{item.title}</span>
          </span>
        </button>
      ))}
    </div>
  );
});

WikiLinkList.displayName = "WikiLinkList";
