import {
  createContext,
  createEffect,
  createSignal,
  JSX,
  on,
  Show,
  useContext,
} from "solid-js";
import { Tabs } from "~/components/ui/tabs.tsx";
import { Tab, TabContext } from "~/components/Tab.tsx";
import { For } from "solid-js/web";
import { LogViewerTabPageContentProps } from "~/pages/LogViewer/LogViewerTabPageContent.tsx";
import { tabContexts } from "~/GlobalState.ts";
import { createStore } from "solid-js/store";
import { Toast } from "./ui/toast.tsx";
import { IconX } from "@tabler/icons-solidjs";
import { panelContext } from "./Panel.tsx";

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

export type TabListProps = {
  id: string;
  onDraggingTab?: (
    location: TabLocation,
    draggedTab: TabContext,
    mouseX: number,
  ) => void;
  onTabDragEnd?: (clientX: number) => void;
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

  const toaster = Toast.createToaster({
    placement: "top-end",
    gap: 24,
  });

  const [tabContextRender, setTabContextRender] = createSignal<boolean>(true);

  return (
    <>
      <Tabs.Root
        id={tabListProps.id}
        width="100%"
        height="100%"
        value={getTabContexts().focusedTab ? getTabContexts().focusedTab : ""}
        onValueChange={(tabDetails: { value: string }) => {
          setFocusTab(tabDetails.value);
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
                { id: crypto.randomUUID() },
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
          }}
          onTabDragEnd={(mouseX: number, mouseY: number, tabId: string) => {
            const tabListId = `tabs:${tabListProps.id}`;
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

            tabListProps.onTabDragEnd?.(mouseX);
            setTabContextRender(false);
            setTabContextRender(true);
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

            const draggedTab = tabList.filter((tab) => tab.id === tabId)[0];
            tabListProps.onDraggingTab?.(updateTabLocation, draggedTab, mouseX);
          }}
        />
        <Show when={tabContextRender()}>
          <For each={getTabContexts().tabContext}>
            {(tab) => {
              return (
                <Tabs.Content
                  value={tab.id}
                  width="100%"
                  height={`calc(100% - 3rem)`}
                  overflowY="auto"
                >
                  <tabPageContext.Provider
                    value={{
                      key: tabListProps.id,
                      tabId: tab.id,
                      onErrorMessage: (error) => {
                        toaster.create(error);
                      },
                    }}
                  >
                    {props.children}
                  </tabPageContext.Provider>
                </Tabs.Content>
              );
            }}
          </For>
        </Show>
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
