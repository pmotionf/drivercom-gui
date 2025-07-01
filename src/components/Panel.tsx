import { JSX } from "solid-js";
import { TabList, TabListContext, TabLocation } from "./TabList.tsx";
import { createSignal } from "solid-js";
import { Show } from "solid-js";
//@ts-ignore Has an Any type error
import { Stack } from "styled-system/jsx/stack.mjs";
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
  const [isDragging, setIsDragging] = createSignal<boolean>(false);
  const [nextPanel, setNextPanel] = createSignal<number | null>(null);
  const getPanelIds = (key: string): string[] => {
    const panelIds = panelContexts
      .get(key)?.[0]()
      .map((panel) => {
        return panel.id;
      })!;
    return panelIds;
  };

  const getNextPanel = (panelIds: string[], mouseX: number): number | null => {
    let nextPanel: number | null = null;
    panelIds.forEach((panelId, index) => {
      const panel = document.getElementById(`tabs:${panelId}`);
      if (
        mouseX >= panel!.offsetLeft! &&
        mouseX <= panel!.offsetLeft + panel!.offsetWidth
      ) {
        nextPanel = index;
      }
    });
    return nextPanel;
  };

  return (
    <>
      <Splitter.Panel
        id={props.id}
        style={{
          width: "100%",
          height: "100%",
        }}
      >
        <TabList
          id={props.id}
          style={{ width: "100%", height: "100%" }}
          onDraggingTab={(tabLocation, draggedTab, mouseX) => {
            if (tabLocation !== currentDraggingTabLocation()) {
              setCurrentDraggingTabLocation(tabLocation);
              setDraggedTab(draggedTab);
              setIsDragging(true);
            }

            if (nextPanel() !== getNextPanel(getPanelIds(props.key), mouseX)) {
              setNextPanel(getNextPanel(getPanelIds(props.key), mouseX));
            }
          }}
          onTabDragEnd={(clientX) => {
            props.onSplitTab?.(
              currentDraggingTabLocation(),
              draggedTab()!,
              clientX,
            );
            setIsDragging(false);
            setCurrentDraggingTabLocation("none");
          }}
          onDeleteTabList={() => {
            props.onDeletePanel?.();
          }}
        />
      </Splitter.Panel>
      <Show when={isDragging()}>
        <Stack
          style={{
            width:
              currentDraggingTabLocation() === "centerSplitter" ||
              currentDraggingTabLocation() === "otherPanel"
                ? `${document.getElementById(`tabs:${props.id}`)!.offsetWidth}px`
                : `${
                    document.getElementById(`tabs:${props.id}`)!.offsetWidth / 2
                  }px`,
            left:
              currentDraggingTabLocation() === "rightSplitter"
                ? `${
                    document.getElementById(`tabs:${props.id}`)!.offsetLeft +
                    document.getElementById(`tabs:${props.id}`)!.offsetWidth / 2
                  }px`
                : `${document.getElementById(`tabs:${props.id}`)!.offsetLeft}px`,
            "border-radius":
              currentDraggingTabLocation() === "otherPanel" ? "0.5rem" : "0rem",
            opacity:
              currentDraggingTabLocation() === "none" ||
              currentDraggingTabLocation() === "tabList"
                ? "0%"
                : "10%",
            height: `${
              document.getElementById(`tabs:${props.id}`)!.offsetHeight
            }px`,
            top:
              currentDraggingTabLocation() !== "otherPanel"
                ? `${
                    document.getElementById(`tabs:${props.id}:list`)!
                      .offsetHeight
                  }px`
                : `${
                    document.getElementById(`tabs:${props.id}:list`)!.offsetTop
                  }px`,
            position: "absolute",
          }}
          backgroundColor="fg.default"
          pointerEvent="none"
        />
      </Show>
      <Show
        when={
          currentDraggingTabLocation() === "otherPanel" &&
          isDragging() &&
          nextPanel() !== null &&
          document.getElementById(
            `tabs:${getPanelIds(props.key)[nextPanel()!]}`,
          )
        }
      >
        <Stack
          style={{
            width: `${
              document.getElementById(
                `tabs:${getPanelIds(props.key)[nextPanel()!]}`,
              )!.offsetWidth
            }px`,
            left: `${
              document.getElementById(
                `tabs:${getPanelIds(props.key)[nextPanel()!]}`,
              )!.offsetLeft
            }px`,
            "border-radius": "0.5rem",
            opacity: "10%",
            height: `${
              document.getElementById(
                `tabs:${getPanelIds(props.key)[nextPanel()!]}`,
              )!.offsetHeight
            }px`,
            top: `${
              document.getElementById(
                `tabs:${getPanelIds(props.key)[nextPanel()!]}:list`,
              )!.offsetTop
            }px`,
            position: "absolute",
          }}
          backgroundColor="fg.default"
          pointerEvent="none"
        />
      </Show>
    </>
  );
}
