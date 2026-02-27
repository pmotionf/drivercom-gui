import { createContext, createEffect, JSX, on, useContext } from "solid-js";
import { TabListContext, TabListProps, TabLocation } from "../Tab/TabList.tsx";
import { createSignal } from "solid-js";
import { Show } from "solid-js";
//@ts-ignore Has an Any type error
import { Stack } from "styled-system/jsx/stack.mjs";
import { panelStore, tabStore } from "~/store/GlobalState.ts";
import { Splitter } from "../ui/splitter.tsx";
import { PanelLayoutContext } from "./PanelContext.tsx";

export type PanelContext = {
  id: string;
  tabContext: TabListContext[];
};

export const PanelContext = createContext<TabListProps>();

export function Panel(props: JSX.HTMLAttributes<HTMLDivElement>) {
  const panelLayoutCtx = useContext(PanelLayoutContext);
  if (!panelLayoutCtx) return;
  if (!panelStore.get(panelLayoutCtx.key)) return;

  const [currentDraggingTabLocation, setCurrentDraggingTabLocation] =
    createSignal<TabLocation>("none");
  const [isDragging, setIsDragging] = createSignal<boolean>(false);
  const [nextPanel, setNextPanel] = createSignal<number | null>(null);

  const getPanelIds = (): string[] => {
    const panelIds: string[] = panelStore
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

  const parseDragOverLocation = (clientX: number, tabListId: string) => {
    const tabListContainerStart =
      document.getElementById(tabListId)!.offsetLeft;
    const tabListContainerWidth =
      document.getElementById(tabListId)!.offsetWidth;
    const tabListContainerWidthQuarter = tabListContainerWidth * 0.25;
    const tabListContainerEnd = tabListContainerStart + tabListContainerWidth;

    const tabListLeftArea =
      tabListContainerStart + tabListContainerWidthQuarter;
    const tabListRightArea = tabListContainerEnd - tabListContainerWidthQuarter;

    if (tabListContainerStart < clientX && clientX < tabListLeftArea) {
      return "leftSplitter";
    } else if (tabListRightArea < clientX && clientX < tabListContainerEnd) {
      return "rightSplitter";
    } else {
      return "centerSplitter";
    }
  };

  const getCurrentPanelContext = (currentId: string) => {
    return panelStore.get(panelLayoutCtx.key)![0]()[
      panelStore
        .get(panelLayoutCtx.key)![0]()
        .findIndex((panel) => panel.id === currentId)
    ];
  };

  const setCurrentPanelContextFileDrop = (
    currentId: string,
    isFileDrop?: boolean,
  ) => {
    return panelStore.get(panelLayoutCtx.key)![1]((prev) => {
      return prev.map((panel) => {
        if (panel.id === currentId) {
          return { ...panel, isFileDrop: isFileDrop };
        } else {
          return panel;
        }
      });
    });
  };

  createEffect(
    on(
      () => getCurrentPanelContext(panelLayoutCtx.id).isFileDrop,
      () => {
        if (getCurrentPanelContext(panelLayoutCtx.id).isFileDrop) {
          if (isDragging()) {
            setIsDragging(false);
          }
          if (currentDraggingTabLocation() !== "none") {
            setCurrentDraggingTabLocation("none");
          }
          setCurrentPanelContextFileDrop(panelLayoutCtx.id);
        }
      },
    ),
  );

  return (
    <>
      <Splitter.Panel
        id={panelLayoutCtx.id}
        style={{
          width: "100%",
          height: "100%",
        }}
        // Event for file drag over
        onDragOver={(e) => {
          const tabListId = `tabs:${panelLayoutCtx.id}`;
          const location = parseDragOverLocation(e.clientX, tabListId);
          if (location !== currentDraggingTabLocation()) {
            const tabContextLength = tabStore.get(panelLayoutCtx.id)![0]
              .tabContext.length;
            setCurrentDraggingTabLocation(
              getPanelIds().length === 1 && tabContextLength === 0
                ? "centerSplitter"
                : location,
            );
            setIsDragging(true);
          }
        }}
      >
        <PanelContext.Provider
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
        </PanelContext.Provider>
      </Splitter.Panel>
      <Show when={isDragging()}>
        <Stack
          style={{
            "pointer-events": "none",
            "z-index": "1",
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
            "z-index": 10,
          }}
          backgroundColor="fg.default"
          pointerEvent="none"
        />
      </Show>
    </>
  );
}
