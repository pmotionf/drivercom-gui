import { createSignal, JSX, Show } from "solid-js";
import { createStore } from "solid-js/store";
import { Tabs } from "~/components/ui/tabs.tsx";
import { Tab } from "~/components/Tab.tsx";
import { For } from "solid-js/web";
import { open } from "@tauri-apps/plugin-dialog";
import { LogViewerTabPageContent } from "~/pages/LogViewer/LogViewerTabPageContent.tsx";

export type tabLocation =
  | "none"
  | "rightSplitter"
  | "leftSplitter"
  | "otherPanel"
  | "tabList"
  | "centerSplitter";

export type tabListProps = JSX.HTMLAttributes<HTMLDivElement> & {
  id: string;
  tabListContext: object;
  onDraggingTab?: (location: tabLocation, draggedTab: object) => void;
  onDragEnd?: () => void;
};

export function TabList(props: tabListProps) {
  const [tabListCtx, setTabListCtx] = createStore(props.tabListContext);
  if (!("tabContext" in tabListCtx)) return;
  console.log("TabLIst");
  const [render, setRender] = createSignal<boolean>(true);

  const parseFocusedTab = (focusedTab: unknown): string => {
    const parseFocusedTab = focusedTab ? focusedTab : "";
    return typeof parseFocusedTab === "string" ? parseFocusedTab : "";
  };

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

      setTabListCtx(
        //@ts-ignore check field above
        "focusedTab",
        nextFocusedTabId,
      );

      //@ts-ignore check field above
      setTabListCtx("tabContext", updateTab);
    }, 200);
  };

  const getNextFocusTabId = (
    deleteTabIndex: number,
    focusedTab: string,
    tabListCtx: object,
  ): string => {
    if (!("tabContext" in tabListCtx)) return "";
    const tabContext = tabListCtx.tabContext;
    if (!Array.isArray(tabContext) || typeof tabContext !== "object") return "";
    const parseTabContext: object[] = tabContext;

    const tabIdList: string[] = parseTabContext.map((tabCtx) => {
      if ("id" in tabCtx) {
        return typeof tabCtx.id === "string" ? tabCtx.id : "";
      } else return "";
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

  return (
    <Tabs.Root
      id={props.id}
      width="100%"
      height="100%"
      value={parseFocusedTab(
        tabListCtx["focusedTab" as keyof typeof tabListCtx],
      )}
      onValueChange={(tabDetails: { value: string }) => {
        if (!("focusedTab" in tabListCtx)) return;
        //@ts-ignore check above
        setTabListCtx("focusedTab", tabDetails.value);
      }}
    >
      <Show when={render()}>
        <Tab
          style={{
            height: "3rem",
          }}
          tabContext={
            tabListCtx["tabContext" as keyof typeof props.tabListContext]
          }
          focusedTab={parseFocusedTab(
            tabListCtx["focusedTab" as keyof typeof tabListCtx],
          )}
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
            const newTab = {
              id: newTabInfo.id,
              filePath: newTabInfo.filePath,
              plotSplitIndex: [],
              plotContext: [],
              tabName: "",
              plotZoomState: [0, 0],
            };
            if (
              !("tabContext" in tabListCtx) ||
              typeof tabListCtx.tabContext !== "object"
            )
              return;
            //@ts-ignore type check
            setTabListCtx("tabContext", [...tabListCtx.tabContext, newTab]);
            if (!("focusedTab" in tabListCtx)) {
              setTabListCtx({ ...tabListCtx, focusedTab: newTab.id });
            } else {
              //@ts-ignore type check
              setTabListCtx("focusedTab", newTab.id);
            }
          }}
          onDeleteTab={(tabIndex) => {
            const nextFocusTabId = getNextFocusTabId(
              tabIndex,
              parseFocusedTab(
                tabListCtx["focusedTab" as keyof typeof tabListCtx],
              ),
              tabListCtx,
            );
            deleteTab(tabIndex, tabListCtx, nextFocusTabId);
          }}
          onTabReorder={(updateList) => {
            if (!("tabContext" in tabListCtx)) return;
            //@ts-ignore type check
            setTabListCtx("tabContext", updateList);
          }}
          onFocusTabChange={(tabId) => {
            if (!("focusedTab" in tabListCtx)) return;
            //@ts-ignore type checked on above
            setTabListCtx("focusedTab", tabId);
          }}
          onTabNameChange={(tabIndex, newName) => {
            if (
              !("tabContext" in tabListCtx) ||
              !Array.isArray(tabListCtx.tabContext) ||
              typeof tabListCtx.tabContext !== "object"
            )
              return;

            if (
              !("tabName" in tabListCtx.tabContext[tabIndex]) ||
              typeof tabListCtx.tabContext[tabIndex].tabName !== "string"
            )
              return;
            //@ts-ignore type checked in above
            setTabListCtx("tabContext", tabIndex, "tabName", newName);
          }}
          onRefresh={() => {
            /*This is needed for UI */
            setRender(false);
            setRender(true);
            props.onDragEnd?.();
          }}
          onTabDragging={(clientX, clientY, tabId) => {
            const tabListId = `tabs:${parseFocusedTab(
              tabListCtx["id" as keyof typeof tabListCtx],
            )}`;
            const tabLocation = parseTabLocation(
              clientX,
              clientY,
              tabId,
              tabListId,
            );

            const tabList: object[] =
              tabListCtx["tabContext" as keyof typeof props.tabListContext];
            const draggedTab = tabList.filter(
              (tab) => tab["id" as keyof typeof tab] === tabId,
            );
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
        {(tab) => {
          const tabId = tab["id" as keyof typeof tab];
          const plotContext = tab["plotContext" as keyof typeof tab];
          const plotZoomState = tab["plotZoomState" as keyof typeof tab];
          const filePath = tab["filePath" as keyof typeof tab];
          const plotSplitState = tab["plotSplitIndex" as keyof typeof tab];

          return (
            <Show when={render()}>
              <Tabs.Content
                value={tabId}
                width="100%"
                height={`calc(100% - 3rem)`}
                overflowY="auto"
              >
                <LogViewerTabPageContent
                  tabId={tabId}
                  plotContext={plotContext}
                  xRange={plotZoomState}
                  filePath={filePath}
                  splitPlotIndex={plotSplitState}
                />
              </Tabs.Content>
            </Show>
          );
        }}
      </For>
    </Tabs.Root>
  );
}
