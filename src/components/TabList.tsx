import { createSignal, JSX, Show } from "solid-js";
import { createStore } from "solid-js/store";
import { Tabs } from "~/components/ui/tabs.tsx";
import { Tab } from "~/components/Tab.tsx";
import { For } from "solid-js/web";
import { open } from "@tauri-apps/plugin-dialog";
import { LogViewerTabPageContent } from "~/pages/LogViewer/LogViewerTabPageContent.tsx";
import { PlotContext } from "./Plot.tsx";
import { panelContext } from "./PanelLayout.tsx";

export type tabContext = {
  id: string;
  tabName?: string;
  filePath?: string;
  plotSplitIndex?: number[][];
  plotContext?: PlotContext[];
  plotZoomState?: [number, number];
};

export type tabLocation =
  | "none"
  | "rightSplitter"
  | "leftSplitter"
  | "otherPanel"
  | "tabList"
  | "centerSplitter";

export type tabListProps = JSX.HTMLAttributes<HTMLDivElement> & {
  tabListContext: panelContext;
  onDraggingTab?: (location: tabLocation, draggedTab: tabContext) => void;
  onTabDragEnd?: (clientX: number) => void;
};

export function TabList(props: tabListProps) {
  const [tabListCtx, setTabListCtx] = createStore(props.tabListContext);

  const deleteTab = (
    tabIndex: number,
    tabListCtx: object,
    nextFocusedTabId: string,
  ) => {
    if (!("tabContext" in tabListCtx) || !("focusedTab" in tabListCtx)) return;
    const tabContext = tabListCtx.tabContext;
    if (!Array.isArray(tabContext)) return;

    setTimeout(() => {
      const updateTab = [
        ...tabContext.filter((_, index) => index !== tabIndex),
      ];
      setTabListCtx("focusedTab", nextFocusedTabId);
      setTabListCtx("tabContext", updateTab);
    }, 200);
  };

  const getNextFocusTabId = (
    deleteTabIndex: number,
    focusedTab: string,
    tabListCtx: panelContext,
  ): string => {
    const tabContext = tabListCtx.tabContext;
    const tabIdList: string[] = tabContext.map((tabCtx) => {
      return tabCtx.id ? tabCtx.id : "";
    });

    const focusedTabIndex = tabIdList.indexOf(focusedTab);
    const nextFocusedTabIndex =
      deleteTabIndex !== focusedTabIndex
        ? focusedTabIndex
        : deleteTabIndex === 0
          ? deleteTabIndex + 1
          : deleteTabIndex - 1;
    return tabIdList[nextFocusedTabIndex];
  };

  async function openFileDialog(): Promise<{
    id: string;
    filePath: string;
  } | null> {
    const path = await open({
      multiple: false,
      filters: [{ name: "CSV", extensions: ["csv"] }],
    });

    if (!path) {
      return null;
    }

    const extensions = path.slice(path.length - 4, path.length);
    if (extensions !== ".csv") {
      return null;
    }

    const tabId = getCryptoUUID();
    return { id: tabId, filePath: path.replaceAll("\\", "/") };
  }

  function getCryptoUUID(): string {
    const uuid: string = crypto.randomUUID();
    return uuid;
  }

  const parseTabLocation = (
    clientX: number,
    clientY: number,
    tabId: string,
    tabListId: string,
  ): tabLocation => {
    const tabListContainerStart =
      document.getElementById(tabListId)!.offsetLeft;
    const tabListContainerWidth =
      document.getElementById(tabListId)!.offsetWidth;
    const tabListContainerWidthQuarter = tabListContainerWidth * 0.25;
    const tabListContainerEnd = tabListContainerStart + tabListContainerWidth;

    const tab = document.getElementById(tabId);
    const tabHeight = tab!.offsetHeight;

    if (clientX >= tabListContainerEnd) {
      return "otherPanel";
    } else if (clientX <= tabListContainerStart) {
      return "otherPanel";
    } else {
      if (clientY > tabHeight) {
        return clientX > tabListContainerStart &&
          clientX < tabListContainerWidthQuarter + tabListContainerStart
          ? "leftSplitter"
          : clientX >= tabListContainerWidthQuarter + tabListContainerStart &&
              clientX <= tabListContainerEnd - tabListContainerWidthQuarter
            ? "centerSplitter"
            : "rightSplitter";
      } else {
        return "tabList";
      }
    }
  };

  const [render, setRender] = createSignal<boolean>(true);

  return (
    <Tabs.Root
      id={props.tabListContext.id}
      width="100%"
      height="100%"
      value={tabListCtx.focusedTab}
      onValueChange={(tabDetails: { value: string }) => {
        setTabListCtx("focusedTab", tabDetails.value);
      }}
    >
      <Show when={render()}>
        <Tab
          style={{
            height: "3rem",
          }}
          tabContext={tabListCtx.tabContext}
          focusedTab={tabListCtx.focusedTab ? tabListCtx.focusedTab : ""}
          onCreateTab={async () => {
            const newTabInfo = await openFileDialog();
            if (!newTabInfo) {
              /*toaster.create({
              title: "Invalid File",
              description: "The file is invalid.",
              type: "error",
              });*/
              return;
            }
            const newTab: tabContext = {
              id: newTabInfo.id,
              filePath: newTabInfo.filePath,
              plotSplitIndex: [],
              plotContext: [],
              tabName: "",
              plotZoomState: [0, 0],
            };

            setTabListCtx("tabContext", [...tabListCtx.tabContext, newTab]);
            setTabListCtx("focusedTab", newTab.id);
          }}
          onDeleteTab={(tabIndex) => {
            const nextFocusTabId = getNextFocusTabId(
              tabIndex,
              tabListCtx.focusedTab ? tabListCtx.focusedTab : "",
              tabListCtx,
            );
            deleteTab(tabIndex, tabListCtx, nextFocusTabId);
          }}
          onTabReorder={(updateList) => {
            setTabListCtx("tabContext", updateList);
          }}
          onFocusTabChange={(tabId) => {
            setTabListCtx("focusedTab", tabId);
          }}
          onTabNameChange={(tabIndex, newName) => {
            setTabListCtx("tabContext", tabIndex, "tabName", newName);
          }}
          onTabDragEnd={(clientX) => {
            // Needed for UI
            setRender(false);
            setRender(true);
            props.onTabDragEnd?.(clientX);
          }}
          onTabDragging={(clientX, clientY, tabId) => {
            const tabListId = `tabs:${tabListCtx.id}`;
            const tabLocation = parseTabLocation(
              clientX,
              clientY,
              tabId,
              tabListId,
            );

            const tabList = tabListCtx.tabContext;
            const draggedTab = tabList.filter((tab) => tab.id === tabId)[0];
            props.onDraggingTab?.(tabLocation, draggedTab);
          }}
        />
      </Show>
      <For
        each={
          typeof tabListCtx.tabContext === "object" &&
          Array.isArray(tabListCtx.tabContext)
            ? tabListCtx.tabContext
            : []
        }
      >
        {(tab, tabIndex) => {
          return (
            <Show when={render()}>
              <Tabs.Content
                value={tab.id}
                width="100%"
                height={`calc(100% - 3rem)`}
                overflowY="auto"
              >
                <LogViewerTabPageContent
                  tabId={tab.id ? tab.id : ""}
                  plotContext={tab.plotContext ? tab.plotContext : []}
                  onContextChange={(ctx) =>
                    setTabListCtx("tabContext", tabIndex(), "plotContext", ctx)
                  }
                  xRange={tab.plotZoomState ? tab.plotZoomState : [0, 0]}
                  onXRangeChange={(xRange) => {
                    setTabListCtx(
                      "tabContext",
                      tabIndex(),
                      "plotZoomState",
                      xRange,
                    );
                  }}
                  filePath={tab.filePath ? tab.filePath : ""}
                  splitPlotIndex={tab.plotSplitIndex ? tab.plotSplitIndex : []}
                  onSplit={(splitIndex) => {
                    setTabListCtx(
                      "tabContext",
                      tabIndex(),
                      "plotSplitIndex",
                      splitIndex,
                    );
                  }}
                />
              </Tabs.Content>
            </Show>
          );
        }}
      </For>
    </Tabs.Root>
  );
}
