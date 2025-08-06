import { createContext, JSX, useContext } from "solid-js";
import { TabListContext, TabListProps, TabLocation } from "./TabList.tsx";
import { createSignal } from "solid-js";
import { Show } from "solid-js";
//@ts-ignore Has an Any type error
import { Stack } from "styled-system/jsx/stack.mjs";
import { panelContexts } from "~/GlobalState.ts";
import { Splitter } from "./ui/splitter.tsx";
import { panelLayoutContext } from "./PanelLayout.tsx";

export type PanelContext = {
  id: string;
  tabContext: TabListContext[];
};

export type panelProps = {
  id: string;
  key: string;
  onDeletePanel?: () => void;
  onCreatePanel?: (tabLocation: TabLocation, newPanelKey: string) => void;
};

export const panelContext = createContext<TabListProps>();

export function Panel(props: JSX.HTMLAttributes<HTMLDivElement>) {
  const panelLayoutCtx = useContext(panelLayoutContext);
  if (!panelLayoutCtx) return;
  if (!panelContexts.get(panelLayoutCtx.key)) return;

  const [currentDraggingTabLocation, setCurrentDraggingTabLocation] =
    createSignal<TabLocation>("none");
  const [isDragging, setIsDragging] = createSignal<boolean>(false);
  const [nextPanel, setNextPanel] = createSignal<number | null>(null);

  const getPanelIds = (): string[] => {
    const panelIds: string[] = panelContexts
      .get(panelLayoutCtx.key)![0]()
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
        id={panelLayoutCtx.id}
        style={{
          width: "100%",
          height: "100%",
        }}
      >
        <panelContext.Provider
          value={{
            id: panelLayoutCtx.id,
            onDraggingTab: (tabLocation, mouseX) => {
              if (tabLocation !== currentDraggingTabLocation()) {
                setCurrentDraggingTabLocation(tabLocation);
                setIsDragging(true);
              }

              if (nextPanel() !== getNextPanel(getPanelIds(), mouseX)) {
                setNextPanel(getNextPanel(getPanelIds(), mouseX));
              }
            },
            onTabDragEnd: (newPanelKey) => {
              if (
                currentDraggingTabLocation() === "leftSplitter" ||
                currentDraggingTabLocation() === "rightSplitter"
              ) {
                panelLayoutCtx.onCreatePanel?.(
                  currentDraggingTabLocation(),
                  newPanelKey!,
                );
              }
              setIsDragging(false);
              setCurrentDraggingTabLocation("none");
            },
            onDeleteTabList: () => {
              panelLayoutCtx.onDeletePanel?.();
            },
          }}
        >
          {props.children}
        </panelContext.Provider>
      </Splitter.Panel>
      <Show when={isDragging()}>
        <Stack
          style={{
            width:
              currentDraggingTabLocation() === "centerSplitter" ||
              currentDraggingTabLocation() === "otherPanel"
                ? `${document.getElementById(`tabs:${panelLayoutCtx.id}`)!.offsetWidth}px`
                : `${
                    document.getElementById(`tabs:${panelLayoutCtx.id}`)!
                      .offsetWidth / 2
                  }px`,
            left:
              currentDraggingTabLocation() === "rightSplitter"
                ? `${
                    document.getElementById(`tabs:${panelLayoutCtx.id}`)!
                      .offsetLeft +
                    document.getElementById(`tabs:${panelLayoutCtx.id}`)!
                      .offsetWidth /
                      2
                  }px`
                : `${document.getElementById(`tabs:${panelLayoutCtx.id}`)!.offsetLeft}px`,
            "border-radius":
              currentDraggingTabLocation() === "otherPanel" ? "0.5rem" : "0rem",
            opacity:
              currentDraggingTabLocation() === "none" ||
              currentDraggingTabLocation() === "tabList"
                ? "0%"
                : "10%",
            height: `${
              document.getElementById(`tabs:${panelLayoutCtx.id}`)!.offsetHeight
            }px`,
            top:
              currentDraggingTabLocation() !== "otherPanel"
                ? `${
                    document.getElementById(`tabs:${panelLayoutCtx.id}:list`)!
                      .offsetHeight
                  }px`
                : `${
                    document.getElementById(`tabs:${panelLayoutCtx.id}:list`)!
                      .offsetTop
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
          document.getElementById(`tabs:${getPanelIds()[nextPanel()!]}`)
        }
      >
        <Stack
          style={{
            width: `${
              document.getElementById(`tabs:${getPanelIds()[nextPanel()!]}`)!
                .offsetWidth
            }px`,
            left: `${
              document.getElementById(`tabs:${getPanelIds()[nextPanel()!]}`)!
                .offsetLeft
            }px`,
            "border-radius": "0.5rem",
            opacity: "10%",
            height: `${
              document.getElementById(`tabs:${getPanelIds()[nextPanel()!]}`)!
                .offsetHeight
            }px`,
            top: `${
              document.getElementById(
                `tabs:${getPanelIds()[nextPanel()!]}:list`,
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
