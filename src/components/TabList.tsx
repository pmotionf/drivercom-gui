import { createContext, createEffect, JSX, on, useContext } from "solid-js";
import { Tabs } from "~/components/ui/tabs.tsx";
import { Tab, TabType } from "~/components/Tab.tsx";
import { For } from "solid-js/web";
import {
  LogViewerTabPage,
  LogViewerTabPageContentProps,
} from "~/pages/LogViewer/LogViewerTabPageContent.tsx";
import { tabContexts } from "~/GlobalState.ts";
import { createStore } from "solid-js/store";
import { Toast } from "./ui/toast.tsx";
import { IconX } from "@tabler/icons-solidjs";
import { panelContext } from "./Panel.tsx";
import { ConfigTabPage } from "~/pages/Configuration/ConfigTabContent.tsx";
import { createSignal } from "solid-js";

type ValueOf<Obj> = Obj[keyof Obj];
type OneOnly<Obj, Key extends keyof Obj> = {
  [key in Exclude<keyof Obj, Key>]: null;
} & Pick<Obj, Key>;
type OneOfByKey<Obj> = { [key in keyof Obj]: OneOnly<Obj, key> };
export type OneOfType<Obj> = ValueOf<OneOfByKey<Obj>>;

export type TabListContext = {
  focusedTab: string;
  tabContext: TabContext[];
};

export type TabContext = {
  tab: TabType;
  tabPage?: OneOfType<{
    logViewerTabPage: LogViewerTabPage;
    configTabPage: ConfigTabPage;
  }>;
};

export type TabLocation =
  | "none"
  | "rightSplitter"
  | "leftSplitter"
  | "otherPanel"
  | "tabList"
  | "centerSplitter";

export type TabListProps = {
  id: string;
  onDraggingTab?: (location: TabLocation, mouseX: number) => void;
  onTabDragEnd?: (newPanelKey?: string) => void;
  onDeleteTabList?: () => void;
};

export const tabPageContext = createContext<LogViewerTabPageContentProps>();

export function TabList(
  props: JSX.HTMLAttributes<HTMLDivElement> & {
    onCreateTab?: (key: string) => void;
  },
) {
  const tabListProps = useContext(panelContext);
  if (!tabListProps) return;
  if (!tabContexts.has(tabListProps.id)) {
    tabContexts.set(
      tabListProps.id,
      createStore<TabListContext>({ tabContext: [], focusedTab: "" }),
    );
  }
  if (!tabContexts.get(tabListProps.id)) return;

  const getTabContexts = () => {
    return tabContexts.get(tabListProps.id)![0];
  };

  createEffect(
    on(
      () => getTabContexts().tabContext.length,
      () => {
        if (getTabContexts().tabContext.length === 0) {
          tabListProps.onDeleteTabList?.();
        }
      },
      { defer: true },
    ),
  );

  const setTabContexts = (tabContext: TabContext[]) => {
    return tabContexts.get(tabListProps.id)?.[1]("tabContext", tabContext);
  };

  const setFocusTab = (focusTab: string) => {
    return tabContexts.get(tabListProps.id)?.[1]("focusedTab", focusTab);
  };

  const getNextFocusTabId = (
    deleteTabIndex: number,
    focusedTab: string,
    tabCtx: TabContext[],
  ): string => {
    const tabIdList: string[] = tabCtx.map((tabCtx) => {
      return tabCtx.tab.id ? tabCtx.tab.id : "";
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

  const deleteTab = (
    tabIndex: number,
    tabListCtx: TabContext[],
    nextFocusId: string,
  ) => {
    const updateTab = [...tabListCtx.filter((_, index) => index !== tabIndex)];
    setTabContexts(updateTab);
    setFocusTab(nextFocusId);
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

  const moveTabToOtherTabList = (mouseX: number, draggedTab: TabContext) => {
    let nextPanelIndex: number = 0;
    const tabContextKeys = Array.from(tabContexts.keys());
    tabContextKeys.forEach((tab, i) => {
      const panelElement = document.getElementById(`tabs:${tab}`);
      if (
        panelElement &&
        panelElement!.offsetLeft < mouseX &&
        mouseX < panelElement!.offsetLeft + panelElement!.offsetWidth
      ) {
        nextPanelIndex = i;
      }
    });
    const nextTabList = tabContextKeys[nextPanelIndex];
    const nextTabContext = tabContexts.get(nextTabList)?.[0];

    tabContexts.get(nextTabList)?.[1]({
      tabContext: [...nextTabContext!.tabContext, draggedTab],
      focusedTab: draggedTab.tab.id,
    });
  };

  const createNewTabList = (newKey: string, draggedTab: TabContext) => {
    tabContexts.set(
      newKey,
      createStore<TabListContext>({
        tabContext: [draggedTab] as TabContext[],
        focusedTab: draggedTab.tab.id,
      }),
    );
  };

  const toaster = Toast.createToaster({
    placement: "top-end",
    gap: 24,
  });

  const [isTabClicked, setIsTabClicked] = createSignal<boolean>(true);

  return (
    <>
      <Tabs.Root
        id={tabListProps.id}
        width="100%"
        height="100%"
        value={getTabContexts().focusedTab}
        onValueChange={(tabDetails) => {
          if (!isTabClicked()) {
            setIsTabClicked(true);
            return;
          }
          if (
            getTabContexts().focusedTab !== tabDetails.value &&
            tabDetails.value
          ) {
            setFocusTab(tabDetails.value);
          }
        }}
      >
        <Tab
          key={tabListProps.id}
          style={{
            height: "3rem",
          }}
          onCreateTab={async () => {
            if (props.onCreateTab) {
              props.onCreateTab?.(tabListProps.id);
            } else {
              setTabContexts([
                ...getTabContexts().tabContext,
                { tab: { id: crypto.randomUUID(), tabName: "new Tab" } },
              ]);
            }
          }}
          onDeleteTab={(tabIndex) => {
            const nextFocusTabId = getNextFocusTabId(
              tabIndex,
              getTabContexts().focusedTab,
              getTabContexts().tabContext,
            );
            deleteTab(tabIndex, getTabContexts().tabContext, nextFocusTabId);
            setIsTabClicked(false);
          }}
          onTabDragEnd={(
            mouseX: number,
            mouseY: number,
            tabId: string,
            tabIndex: number,
          ) => {
            const tabListId = `tabs:${tabListProps.id}`;
            const tabLocation = parseTabLocation(
              mouseX,
              mouseY,
              tabId,
              tabListId,
            );
            let newTabListKey: string | undefined = undefined;

            if (
              tabLocation === "rightSplitter" ||
              tabLocation === "leftSplitter" ||
              tabLocation === "otherPanel"
            ) {
              const draggedTab = getTabContexts().tabContext[tabIndex];
              if (tabLocation !== "otherPanel") {
                newTabListKey = crypto.randomUUID();
                createNewTabList(newTabListKey, draggedTab);
              } else {
                moveTabToOtherTabList(mouseX, draggedTab);
              }

              const nextFocusTabId = getNextFocusTabId(
                tabIndex,
                getTabContexts().focusedTab,
                getTabContexts().tabContext,
              );
              deleteTab(tabIndex, getTabContexts().tabContext, nextFocusTabId);
            } else {
              setFocusTab(tabId);
            }

            tabListProps.onTabDragEnd?.(newTabListKey);
          }}
          onTabDragging={(mouseX: number, mouseY: number, tabId: string) => {
            const tabListId = `tabs:${tabListProps.id}`;
            const tabLocation = parseTabLocation(
              mouseX,
              mouseY,
              tabId,
              tabListId,
            );

            const tabList = getTabContexts().tabContext;
            const updateTabLocation =
              (tabLocation === "rightSplitter" && tabList.length <= 1) ||
              (tabLocation === "leftSplitter" && tabList.length <= 1)
                ? "centerSplitter"
                : tabLocation;

            tabListProps.onDraggingTab?.(updateTabLocation, mouseX);
          }}
        />
        <For each={getTabContexts().tabContext}>
          {(tabCtx) => {
            return (
              <div style={{ width: "100%", height: `calc(100% - 3rem)` }}>
                <Tabs.Content value={tabCtx.tab.id}>
                  <tabPageContext.Provider
                    value={{
                      key: tabListProps.id,
                      tabId: tabCtx.tab.id,
                      onErrorMessage: (error) => {
                        toaster.create(error);
                      },
                    }}
                  >
                    {props.children}
                  </tabPageContext.Provider>
                </Tabs.Content>
              </div>
            );
          }}
        </For>
      </Tabs.Root>
      <Toast.Toaster toaster={toaster}>
        {(toast) => (
          <Toast.Root>
            <Toast.Title>{toast().title}</Toast.Title>
            <Toast.Description>{toast().description}</Toast.Description>
            <Toast.CloseTrigger>
              <IconX />
            </Toast.CloseTrigger>
          </Toast.Root>
        )}
      </Toast.Toaster>
    </>
  );
}
