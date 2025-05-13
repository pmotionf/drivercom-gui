import { JSX } from "solid-js";
import { TabList, TabListContext, TabLocation } from "./TabList.tsx";
import { createSignal } from "solid-js";
import { Show } from "solid-js";
import { Stack } from "styled-system/jsx/stack";
import { TabContext } from "./Tab.tsx";
import { panelContexts } from "~/GlobalState.ts";
import { Splitter } from "./ui/splitter.tsx";

export type PanelContext = {
  id: string;
  tabContext: TabListContext[];
  focusedTab?: string;
};

export type panelProps = JSX.HTMLAttributes<HTMLDivElement> & {
  id: string;
  key: string;
  index: number;
  onSplitTab?: (
    location: TabLocation,
    draggedTab: TabContext,
    mouseX: number,
  ) => void;
  onDeletePanel?: () => void;
};

export function Panel(props: panelProps) {
  if (!panelContexts.has(props.key)) return;
  const [currentDraggingTabLocation, setCurrentDraggingTabLocation] =
    createSignal<TabLocation>("none");
  const [draggedTab, setDraggedTab] = createSignal<TabContext | null>(null);

  const getPanelSize = (currentPanelId: string): number => {
    const panels = panelContexts.get(props.key)?.[0]()!;
    const index = panels
      .map((panel) => {
        return panel.id;
      })
      .indexOf(currentPanelId);
    return Math.floor(panels[index].size);
  };

  return (
    <Splitter.Panel id={props.id}>
      <TabList
        id={props.id}
        index={props.index}
        style={{ width: "100%", height: "100%", position: "relative" }}
        onDraggingTab={(tabLocation, draggedTab) => {
          if (tabLocation !== currentDraggingTabLocation()) {
            setCurrentDraggingTabLocation(tabLocation);
            setDraggedTab(draggedTab);
          }
        }}
        onTabDragEnd={(clientX) => {
          props.onSplitTab?.(
            currentDraggingTabLocation(),
            draggedTab()!,
            clientX,
          );
          setCurrentDraggingTabLocation("none");
        }}
        onDeleteTabList={() => {
          props.onDeletePanel?.();
        }}
      />

      <Show
        when={currentDraggingTabLocation() !== "none" &&
          currentDraggingTabLocation() !== "tabList"}
      >
        <Stack
          width={currentDraggingTabLocation() === "otherPanel"
            ? `100%`
            : currentDraggingTabLocation() === "centerSplitter"
            ? `50%`
            : `50%`}
          height={currentDraggingTabLocation() === "otherPanel"
            ? "100%"
            : `calc(100% - 3rem)`}
          backgroundColor="fg.default"
          position="absolute"
          top={currentDraggingTabLocation() === "otherPanel" ? "0" : "3rem"}
          opacity="10%"
        />
      </Show>
    </Splitter.Panel>
  );
}
