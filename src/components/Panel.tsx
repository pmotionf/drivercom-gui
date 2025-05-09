import { JSX } from "solid-js";
import { tabContext, TabList, tabLocation } from "./TabList.tsx";
import { createSignal } from "solid-js";
import { Show } from "solid-js";
import { Stack } from "styled-system/jsx/stack";

export type PanelContext = {
  id: string;
  tabContext: tabContext[];
  focusedTab?: string;
};

export type panelProps = JSX.HTMLAttributes<HTMLDivElement> & {
  onSplitTab?: (
    location: tabLocation,
    draggedTab: tabContext,
    mouseX: number,
  ) => void;
};

export function Panel(props: panelProps) {
  const [currentDraggingTabLocation, setCurrentDraggingTabLocation] =
    createSignal<tabLocation>("none");
  const [draggedTab, setDraggedTab] = createSignal<tabContext | null>(null);

  return (
    <div style={{ width: "100%", height: "100%" }}>
      <TabList
        tabListContext={[]}
        style={{ width: "100%", height: "100%" }}
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
      />

      <Show
        when={
          currentDraggingTabLocation() !== "none" &&
          currentDraggingTabLocation() !== "tabList"
        }
      >
        <Stack
          width={
            currentDraggingTabLocation() === "otherPanel"
              ? `100%`
              : currentDraggingTabLocation() === "centerSplitter"
                ? `50%`
                : `50%`
          }
          height={
            currentDraggingTabLocation() === "otherPanel"
              ? "100%"
              : `calc(100% - 3rem)`
          }
          backgroundColor="fg.default"
          position="absolute"
          top={currentDraggingTabLocation() === "otherPanel" ? "0" : "3rem"}
          opacity="10%"
        />
      </Show>
    </div>
  );
}
