import { JSX } from "solid-js";
import { createStore } from "solid-js/store";
import { TabList, tabLocation } from "./TabList.tsx";
import { createSignal } from "solid-js";
import { Show } from "solid-js";
import { Stack } from "styled-system/jsx/stack";

export type panelProps = JSX.HTMLAttributes<HTMLDivElement> & {
  id: string;
  panelContext: object;
  onFocusTabChange?: (tabId: string) => void;
  onSplitTab?: (location: tabLocation, draggedTab: object) => void;
};

export function Panel(props: panelProps) {
  console.log("panel");
  const [panelContext] = createStore<object>(props.panelContext);
  const [currentDraggingTabLocation, setCurrentDraggingTabLocation] =
    createSignal<tabLocation>("none");
  const [draggedTab, setDraggedTab] = createSignal<object | null>(null);

  return (
    <>
      <div style={{ width: "100%", height: "100%" }}>
        <TabList
          id={props.id}
          style={{ width: "100%", height: "100%" }}
          tabListContext={panelContext}
          onDraggingTab={(tabLocation, draggedTab) => {
            if (tabLocation !== currentDraggingTabLocation()) {
              setCurrentDraggingTabLocation(tabLocation);
              setDraggedTab(draggedTab);
            }
          }}
          onDragEnd={() => {
            if (typeof draggedTab() === "object") {
              props.onSplitTab?.(currentDraggingTabLocation(), draggedTab()!);
            }
            setCurrentDraggingTabLocation("none");
          }}
        />
      </div>
      <Show
        when={
          currentDraggingTabLocation() !== "none" &&
          currentDraggingTabLocation() !== "tabList"
          //panelContext.tabContext.length > 1
        }
      >
        <Stack
          width={
            currentDraggingTabLocation() === "centerSplitter" ||
            currentDraggingTabLocation() === "otherPanel"
              ? "100%"
              : "50%"
          }
          height={
            currentDraggingTabLocation() === "otherPanel"
              ? "100%"
              : `calc(100% - 3rem)`
          }
          backgroundColor="fg.default"
          position="absolute"
          left={currentDraggingTabLocation() === "rightSplitter" ? "50%" : "0"}
          top={currentDraggingTabLocation() === "otherPanel" ? "0" : "3rem"}
          opacity="10%"
        />
      </Show>
    </>
  );
}
