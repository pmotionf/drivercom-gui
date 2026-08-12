import {
  createContext,
  createEffect,
  JSX,
  on,
  Show,
  useContext,
} from "solid-js";
import * as Tabs from "~/components/ui/tabs.tsx";
import { Tab, TabType } from "~/components/Tab/Tab.tsx";
import { For } from "solid-js/web";
import {
  LogViewerTabPage,
  LogViewerTabPageContentProps,
} from "~/pages/LogViewer/LogViewerTabPageContent.tsx";
import { tabStore } from "~/store/GlobalState.ts";
import { createStore } from "solid-js/store";
import { PanelContext } from "../Panel/Panel.tsx";
import { ConfigTabPage } from "~/pages/Configuration/ConfigTabContent.tsx";
import { createSignal } from "solid-js";
import { toaster } from "~/components/ui/toast.tsx";
import { LoggingPageTabContentType } from "~/pages/Logging/Logging.tsx";

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
    loggingTabPage: LoggingPageTabContentType;
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

export const TabPageContext = createContext<LogViewerTabPageContentProps>();

export function TabList(
  props: JSX.HTMLAttributes<HTMLDivElement> & {
    onCreateTab?: (key: string) => void;
    createButton?: JSX.Element;
  },
) {
  const tabListProps = useContext(PanelContext);
  if (!tabListProps) return;
  if (!tabStore.has(tabListProps.id)) {
    tabStore.set(
      tabListProps.id,
      createStore<TabListContext>({ tabContext: [], focusedTab: "" }),
    );
  }
  if (!tabStore.get(tabListProps.id)) return;

  const getTabContexts = () => {
    return tabStore.get(tabListProps.id)![0];
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
    return tabStore.get(tabListProps.id)?.[1]("tabContext", tabContext);
  };

  const setFocusTab = (focusTab: string) => {
    return tabStore.get(tabListProps.id)?.[1]("focusedTab", focusTab);
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
    const tabClientRect = tab!.getBoundingClientRect();
    const tabHeight = tabClientRect.bottom;
    const root = document.getElementById("root");
    const divEnd = root!.offsetWidth;
    const divStart = 0;

    if (clientX >= tabListContainerEnd) {
      if (clientX >= divEnd) return "none";
      else return "otherPanel";
    } else if (clientX <= tabListContainerStart) {
      if (clientX <= divStart) return "none";
      else return "otherPanel";
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
    const tabContextKeys = Array.from(tabStore.keys());
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
    const nextTabContext = tabStore.get(nextTabList)?.[0];

    tabStore.get(nextTabList)?.[1]({
      tabContext: [...nextTabContext!.tabContext, draggedTab],
      focusedTab: draggedTab.tab.id,
    });
  };

  const createNewTabList = (newKey: string, draggedTab: TabContext) => {
    tabStore.set(
      newKey,
      createStore<TabListContext>({
        tabContext: [draggedTab] as TabContext[],
        focusedTab: draggedTab.tab.id,
      }),
    );
  };

  const [isTabClicked, setIsTabClicked] = createSignal<boolean>(true);
  const [tabRender, setTabRender] = createSignal<boolean>(true);

  return (
    <>
      <Tabs.Root
        id={tabListProps.id}
        fitted
        width="100%"
        height="100%"
        value={getTabContexts().focusedTab}
        onValueChange={(tabDetails) => {
          if (!isTabClicked()) {
            setIsTabClicked(true);
            return;
          }
          if (getTabContexts().focusedTab !== tabDetails.value) {
            setFocusTab(tabDetails.value);
          }
        }}
      >
        <Show when={tabRender()}>
          <Tab
            key={tabListProps.id}
            style={{
              height: "3rem",
            }}
            createButton={props.createButton}
            onCreateTab={
              props.onCreateTab
                ? () => {
                    props.onCreateTab?.(tabListProps.id);
                  }
                : undefined
            }
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
                if (tabLocation === "otherPanel") {
                  moveTabToOtherTabList(mouseX, draggedTab);
                } else {
                  if (getTabContexts().tabContext.length <= 1) return;
                  newTabListKey = crypto.randomUUID();
                  createNewTabList(newTabListKey, draggedTab);
                }

                const nextFocusTabId = getNextFocusTabId(
                  tabIndex,
                  getTabContexts().focusedTab,
                  getTabContexts().tabContext,
                );
                deleteTab(
                  tabIndex,
                  getTabContexts().tabContext,
                  nextFocusTabId,
                );
              } else {
                setFocusTab(tabId);
                setTabRender(false);
                setTabRender(true);
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
            onTabDragCancel={(tabId) => {
              setFocusTab(tabId);
              setTabRender(false);
              setTabRender(true);
              tabListProps.onDraggingTab?.("none", 0);
              tabListProps.onTabDragEnd?.();
            }}
          />
        </Show>
        <For each={getTabContexts().tabContext}>
          {(tabCtx) => {
            return (
              <Show when={tabCtx.tab.id === getTabContexts().focusedTab}>
                <div
                  style={{
                    width: "100%",
                    height: `calc(100% - 3rem)`,
                    padding: "0",
                  }}
                >
                  <TabPageContext.Provider
                    value={{
                      key: tabListProps.id,
                      tabId: tabCtx.tab.id,
                      toaster: toaster,
                    }}
                  >
                    {props.children}
                  </TabPageContext.Provider>
                </div>
              </Show>
            );
          }}
        </For>
      </Tabs.Root>
    </>
  );
}
