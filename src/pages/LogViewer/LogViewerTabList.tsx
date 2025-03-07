import { createEffect, createSignal, For, JSX } from "solid-js";
import { Tabs } from "~/components/ui/tabs";
import { IconButton } from "~/components/ui/icon-button";
import { IconPlus, IconX } from "@tabler/icons-solidjs";
import { Editable } from "~/components/ui/editable";
import { LogViewerTabPageContent } from "./LogViewerTabPageContent";
import { TabContext } from "~/GlobalState";

export type LogViewerTabListProps = JSX.HTMLAttributes<HTMLDivElement> & {
  id: string;
  tabList: TabContext[];
  onCreateTab?: () => void;
  onDeleteTab?: (deleteTabId: string, index: number) => void;
  onDraggedTabInfo?: (
    tabContext: TabContext,
  ) => void;
  onTabDrop?: () => void;
  onTabContextChange?: (tabContext: TabContext) => void;
  onTabContextDrag?: (isTabContextDragEnter: boolean) => void;
  focusedTab?: string | undefined;
  onTabFocus?: (focusedTabId: string | undefined) => void;
};

export function LogViewerTabList(props: LogViewerTabListProps) {
  // Reorder tab
  const [draggedTabIndex, setDraggedTabIndex] = createSignal<number | null>(
    null,
  );
  const [draggedTabId, setDraggedTabId] = createSignal<string>();
  const [reorderTabList, setReorderTabList] = createSignal(props.tabList);

  // This is for while reordering tab, if tab is added or deleted
  // Doesnt bother the reorder index, and still reordering
  createEffect(() => {
    const list = props.tabList;
    if (list.length === 0) return;

    if (props.tabList.length > reorderTabList().length) {
      setReorderTabList((prev) => {
        return [...prev, list[length - 1]];
      });
    }

    if (props.tabList.length < reorderTabList().length) {
      const parsePropList = list.sort();
      const parseReorderList = reorderTabList().sort();
      const deletedTab = parsePropList.filter((line, i) => {
        line.id !== parseReorderList[i].id;
      })[0];
      setReorderTabList((prev) => {
        return prev.filter((prevTab) => prevTab.id !== deletedTab.id);
      });
    }
  });

  const reorderTabsOnDragOver = (e: DragEvent, index: number) => {
    e.preventDefault();
    if (draggedTabIndex() !== null && draggedTabIndex() !== index) {
      const updateTab = [...reorderTabList()];
      const [draggedTab] = updateTab.splice(draggedTabIndex()!, 1);
      updateTab.splice(index, 0, draggedTab);
      setReorderTabList([...updateTab]);
      setDraggedTabIndex(index);
    }
  };

  const [clientX, setClientX] = createSignal<number | null>(null);
  // Tab X coordinate relative to start of tab list, can extend beyond screen.
  const [prevPositionX, setPrevPositionX] = createSignal<number>(0);
  let scrollContainer: HTMLDivElement | undefined;

  const dragOverScroll = (e: MouseEvent) => {
    if (!scrollContainer || !clientX()) return;

    const movement = (e.clientX - clientX()! + prevPositionX()) * 0.05;
    scrollContainer.scrollBy({ left: movement });
  };

  const scrollToEnd = () => {
    if (!scrollContainer) return;
    if (scrollContainer.offsetWidth !== scrollContainer.scrollWidth) {
      scrollContainer.scrollTo(scrollContainer.scrollWidth, 0);
    }
  };

  const mouseWheelHandler = (e: WheelEvent) => {
    if (!scrollContainer) return;

    e.preventDefault;
    scrollContainer.scrollLeft += e.deltaY;
  };

  const [focusedTab, setFocusedTab] = createSignal<string>("");
  const [isReordering, setIsReordering] = createSignal<boolean>(false);

  // Focus tab whenether it's deleted or created or reordering.
  createEffect(() => {
    const tabIdList = reorderTabList();
    if (tabIdList.length === 0) return;

    if (isReordering()) {
      setFocusedTab(draggedTabId()!);
    } else {
      setFocusedTab(props.focusedTab!);
      scrollToEnd();
    }
  });

  return (
    <>
      <div
        style={{ "width": "100%", height: "100%" }}
        onDragStart={() => {
          setIsReordering(true);
        }}
        onDragEnd={() => {
          setIsReordering(false);
          setFocusedTab(draggedTabId()!);
        }}
        onDragLeave={() => {
          setIsReordering(false);
        }}
      >
        <Tabs.Root
          value={focusedTab()}
          onValueChange={(e) => {
            setFocusedTab(e.value);
            props.onTabFocus?.(focusedTab());
          }}
          width="100%"
          height="100%"
          gap="0"
        >
          <Tabs.List
            ref={scrollContainer}
            style={{
              background: "--colors-bg-muted",
              height: `3rem`,
            }}
            gap="0"
            onWheel={(e) => mouseWheelHandler(e)}
            onDrop={() => {
              props.onTabDrop?.();
              props.onTabContextDrag?.(false);
            }}
            width="100%"
            marginRight="0"
          >
            <For each={reorderTabList()}>
              {(tab, index) => (
                <Tabs.Trigger
                  value={tab.id}
                  draggable
                  paddingTop="1rem"
                  onDragStart={(e) => {
                    setDraggedTabIndex(index());
                    setFocusedTab(tab.id);
                    setPrevPositionX(e.currentTarget.scrollLeft);
                    setClientX(e.clientX);

                    const changedTabContext =
                      props.tabList.filter((info) => info.id === tab.id)[0];
                    props.onDraggedTabInfo?.(changedTabContext);
                    setDraggedTabId(tab.id);
                  }}
                  onDragOver={(e) => {
                    reorderTabsOnDragOver(e, index());
                    dragOverScroll(e);
                    setIsReordering(true);
                  }}
                  onDragEnd={() => {
                    setFocusedTab(draggedTabId()!);
                    setDraggedTabIndex(null);
                    setClientX(null);
                  }}
                  onDrop={() => {
                    const findDraggedTabInfo = props.tabList.filter((tab) => {
                      return tab.id === draggedTabId()!;
                    });
                    if (findDraggedTabInfo.length === 1) {
                      return;
                    }
                    setIsReordering(false);
                  }}
                >
                  <Editable.Root
                    defaultValue={tab.tabName.length === 0
                      ? JSON.stringify(tab.filePath.match((/[^?!//]+$/)!))
                        .slice(2, -2) /*change to tabname*/
                      : tab.tabName}
                    activationMode="dblclick"
                    onValueCommit={(tabName) => {
                      const tabUpdate = tab;
                      tabUpdate.tabName = tabName.value;
                      props.onTabContextChange?.(tabUpdate);
                    }}
                  >
                    <Editable.Area>
                      <Editable.Input width="100%" />
                      <Editable.Preview width="100%" />
                    </Editable.Area>
                  </Editable.Root>
                  <IconButton
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      props.onDeleteTab?.(tab.id, index());
                    }}
                    borderRadius="3rem"
                  >
                    <IconX />
                  </IconButton>
                </Tabs.Trigger>
              )}
            </For>
            <IconButton
              variant="ghost"
              onClick={() => {
                props.onCreateTab?.();
              }}
              borderRadius="3rem"
              marginTop="0.2rem"
            >
              <IconPlus />
            </IconButton>
            <div
              style={{ "width": "100%" }}
              onDragOver={(e) => {
                e.preventDefault();
              }}
            >
            </div>
            <Tabs.Indicator />
          </Tabs.List>

          <For each={reorderTabList()}>
            {(tab, index) => (
              <Tabs.Content
                value={tab.id}
                height="100%"
                width="100% "
                style={{
                  "overflow-y": "auto",
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                }}
                onDragEnter={() => props.onTabContextDrag?.(true)}
                onDrop={() => {
                  props.onTabContextDrag?.(false);
                }}
              >
                <LogViewerTabPageContent
                  tabId={tab.id}
                  plotContext={
                    props.tabList[index()]
                      .plotContext /*Plot context*/
                  }
                  xRange={
                    props.tabList[index()]
                      .plotZoomState /*Plots's x range*/
                  }
                  filePath={tab.filePath}
                  onSplit={(plotSplitIndex) => {
                    if (plotSplitIndex.length === 0) return;
                    const tabUpdate = tab;
                    tabUpdate.plotSplitIndex = plotSplitIndex;
                    props.onTabContextChange?.(tabUpdate);
                  }}
                  splitPlotIndex={tab.plotSplitIndex}
                  onContextChange={(changedPlotContext) => {
                    const tabUpdate = tab;
                    tabUpdate.plotContext = changedPlotContext;
                    props.onTabContextChange?.(tabUpdate);
                  }}
                  onXRangeChange={(xRange) => {
                    const tabUpdate = tab;
                    tabUpdate.plotZoomState = xRange;
                    props.onTabContextChange?.(tabUpdate);
                  }}
                />
              </Tabs.Content>
            )}
          </For>
        </Tabs.Root>
      </div>
    </>
  );
}
