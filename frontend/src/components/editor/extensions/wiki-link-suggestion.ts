import { ReactRenderer } from "@tiptap/react";
import tippy, { type Instance as TippyInstance } from "tippy.js";
import { api } from "@/lib/api";
import type { SuggestionOptions, SuggestionProps } from "@tiptap/suggestion";
import { WikiLinkList } from "../WikiLinkList";

export type WikiLinkSuggestionItem = {
  id: string;
  title: string;
};

export const wikiLinkSuggestion: Omit<
  SuggestionOptions<WikiLinkSuggestionItem>,
  "editor"
> = {
  char: "[[",
  allowSpaces: true,

  items: async ({ query }) => {
    const results = await api.searchNotes(query);
    return results.map((r) => ({ id: r.id, title: r.title }));
  },

  render: () => {
    let component: ReactRenderer<
      { onKeyDown: (props: { event: KeyboardEvent }) => boolean },
      typeof WikiLinkList
    >;
    let popup: TippyInstance[];

    return {
      onStart: (props: SuggestionProps<WikiLinkSuggestionItem>) => {
        component = new ReactRenderer(WikiLinkList, {
          props,
          editor: props.editor,
        });

        if (!props.clientRect) return;

        popup = tippy("body", {
          getReferenceClientRect: props.clientRect as () => DOMRect,
          appendTo: () => document.body,
          content: component.element,
          showOnCreate: true,
          interactive: true,
          trigger: "manual",
          placement: "bottom-start",
        });
      },

      onUpdate(props: SuggestionProps<WikiLinkSuggestionItem>) {
        component.updateProps(props);

        if (!props.clientRect) return;

        popup[0].setProps({
          getReferenceClientRect: props.clientRect as () => DOMRect,
        });
      },

      onKeyDown(props: { event: KeyboardEvent }) {
        if (props.event.key === "Escape") {
          popup[0].hide();
          return true;
        }
        return component.ref?.onKeyDown(props) ?? false;
      },

      onExit() {
        popup[0].destroy();
        component.destroy();
      },
    };
  },
};
