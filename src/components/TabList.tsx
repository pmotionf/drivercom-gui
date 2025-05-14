import { createEffect, createSignal, JSX, on, Show } from "solid-js";
import { Tabs } from "~/components/ui/tabs.tsx";
import { Tab, TabContext } from "~/components/Tab.tsx";
import { For } from "solid-js/web";
import { open } from "@tauri-apps/plugin-dialog";
import { LogViewerTabPageContent } from "~/pages/LogViewer/LogViewerTabPageContent.tsx";
import { tabContexts } from "~/GlobalState.ts";
import { createStore } from "solid-js/store";

export type TabListContext = {
  focusedTab: string;
  tabContext: TabContext[];
};

export type TabLocation =
  | "none"
  | "rightSplitter"
  | "leftSplitter"
  | "otherPanel"
  | "tabList"
  | "centerSplitter";

export type tabListProps = JSX.HTMLAttributes<HTMLDivElement> & {
  id: string;
  onDraggingTab?: (location: TabLocation, draggedTab: TabContext) => void;
  onTabDragEnd?: (clientX: number) => void;
  onDeleteTabList?: () => void;
};

export function TabList(props: tabListProps) {
  if (!tabContexts.has(props.id)) {
    tabContexts.set(
      props.id,
      createStore<TabListContext>({ tabContext: [], focusedTab: "" }),
    );
  }

  const getTabContexts = () => {
    return tabContexts.get(props.id)?.[0]!;
  };

  createEffect(
    on(
      () => getTabContexts().tabContext.length,
      () => {
        if (getTabContexts().tabContext.length === 0) {
          props.onDeleteTabList?.();
        }
      },
      { defer: true },
    ),
  );

  const setTabContexts = (tabContext: TabContext[]) => {
    return tabContexts.get(props.id)?.[1]("tabContext", tabContext);
  };

  const setFocusTab = (focusTab: string) => {
    return tabContexts.get(props.id)?.[1]("focusedTab", focusTab);
  };

  const setTabName = (tabIndex: number, newName: string) => {
    return tabContexts.get(props.id)?.[1](
      "tabContext",
      tabIndex,
      "tabName",
      newName,
    );
  };

  function getCryptoUUID(): string {
    const uuid: string = crypto.randomUUID();
    return uuid;
  }

  async function openFileDialog(): Promise<
    {
      id: string;
      filePath: string;
    } | null
  > {
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

  const getNextFocusTabId = (
    deleteTabIndex: number,
    focusedTab: string,
    tabCtx: TabContext[],
  ): string => {
    const tabIdList: string[] = tabCtx.map((tabCtx) => {
      return tabCtx.id ? tabCtx.id : "";
    });

    const focusedTabIndex = tabIdList.indexOf(focusedTab);
    const nextFocusedTabIndex = deleteTabIndex !== focusedTabIndex
      ? focusedTabIndex
      : deleteTabIndex === 0
      ? deleteTabIndex + 1
      : deleteTabIndex - 1;
    return tabIdList[nextFocusedTabIndex];
  };

  const deleteTab = (
    tabIndex: number,
    tabListCtx: TabContext[],
    nextFocusedTabId: string,
  ) => {
    const updateTab = [...tabListCtx.filter((_, index) => index !== tabIndex)];

    setTimeout(() => {
      setFocusTab(nextFocusedTabId);
      setTabContexts(updateTab);
    }, 10);
  };

  const parseTabLocation = (
    clientX: number,
    clientY: number,
    tabId: string,
    tabListId: string,
  ): TabLocation => {
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
    <div style={{ width: "100%", height: "100%" }} id={props.id}>
      <Tabs.Root
        id={`${props.id}`}
        width="100%"
        height="100%"
        value={getTabContexts().focusedTab ? getTabContexts().focusedTab : ""}
        onValueChange={(tabDetails: { value: string }) => {
          setFocusTab(tabDetails.value);
        }}
      >
        <Show when={render()}>
          <Tab
            style={{
              height: "3rem",
            }}
            tabContext={getTabContexts().tabContext}
            focusedTab={getTabContexts().focusedTab
              ? getTabContexts().focusedTab
              : ""}
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
              const newTab: TabContext = {
                id: newTabInfo.id,
                filePath: newTabInfo.filePath,
                plotSplitIndex: [],
                plotContext: [],
                tabName: "",
                plotZoomState: [0, 0],
              };

              setTabContexts([...getTabContexts().tabContext, newTab]);
              setFocusTab(newTab.id);
            }}
            onDeleteTab={(tabIndex) => {
              const nextFocusTabId = getNextFocusTabId(
                tabIndex,
                getTabContexts().focusedTab,
                getTabContexts().tabContext,
              );
              deleteTab(tabIndex, getTabContexts().tabContext, nextFocusTabId);
            }}
            onTabReorder={(updateList: TabContext[]) => {
              setTabContexts(updateList);
            }}
            onFocusTabChange={(tabId: string) => {
              setFocusTab(tabId);
            }}
            onTabNameChange={(tabIndex: number, newName: string) => {
              setTabName(tabIndex, newName);
            }}
            onTabDragEnd={(mouseX: number, mouseY: number, tabId: string) => {
              const tabListId = props.id;
              const tabLocation = parseTabLocation(
                mouseX,
                mouseY,
                tabId,
                tabListId,
              );

              if (
                tabLocation === "rightSplitter" ||
                tabLocation === "leftSplitter" ||
                tabLocation === "otherPanel"
              ) {
                const deleteTabIndex = getTabContexts()
                  .tabContext.map((tab) => {
                    return tab.id;
                  })
                  .indexOf(tabId);
                const nextFocusTabId = getNextFocusTabId(
                  deleteTabIndex,
                  getTabContexts().focusedTab,
                  getTabContexts().tabContext,
                );
                deleteTab(
                  deleteTabIndex,
                  getTabContexts().tabContext,
                  nextFocusTabId,
                );
              }
              // Needed for UI
              setRender(false);
              setRender(true);
              props.onTabDragEnd?.(mouseX);
            }}
            onTabDragging={(mouseX: number, mouseY: number, tabId: string) => {
              const tabListId = props.id;
              const tabLocation = parseTabLocation(
                mouseX,
                mouseY,
                tabId,
                tabListId,
              );

              const tabList = getTabContexts().tabContext;
              const draggedTab = tabList.filter((tab) => tab.id === tabId)[0];
              props.onDraggingTab?.(tabLocation, draggedTab);
            }}
          />
        </Show>
        <For each={getTabContexts().tabContext}>
          {(tab) => {
            return (
              <Show when={render()}>
                <Tabs.Content
                  value={tab.id}
                  width="100%"
                  height={`calc(100% - 3rem)`}
                  overflowY="auto"
                >
                  <LogViewerTabPageContent key={props.id} tabId={tab.id} />
                </Tabs.Content>
              </Show>
            );
          }}
        </For>
      </Tabs.Root>
    </div>
  );
}
