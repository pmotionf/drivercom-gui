import { createEffect, createSignal, For, JSX } from "solid-js";
import { Tabs } from "~/components/ui/tabs";
import { IconButton } from "~/components/ui/icon-button";
import { IconPlus, IconX } from "@tabler/icons-solidjs";
import { Editable } from "~/components/ui/editable";
import { LogViewerTabPageContent } from "./LogViewerTabPageContent";
import { PlotContext } from "~/components/Plot";

export type LogViewerTabListProps = JSX.HTMLAttributes<HTMLDivElement> & {
  id: string;
  tabList: [string, string, number[][], PlotContext[], string][]; // tabId, filePath, split index array, tab name
  onCreateTab?: () => void;
  onDeleteTab?: (deleteTabId: string) => void;
  onDraggedTabInfo?: (
    tabId: string,
    filePath: string,
    splitPlotIndex: number[][],
    context: string[],
    tabName: string,
    tabListId: string,
  ) => void;
  onSplit?: (id: string, splitPlotIndex: number[][]) => void;
  onTabDrop?: () => void;
  onContextChange?: (id: string, context: PlotContext[]) => void;
  onTabNameChange?: (id: string, changedName: string) => void;
  onTabContextDragEnter?: (isTabContextDragEnter: boolean) => void;
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
        return [...prev, [...list[length - 1]]];
      });
    }

    if (props.tabList.length < reorderTabList().length) {
      const parsePropList = list.sort();
      const parseReorderList = reorderTabList().sort();
      const deletedTab = parsePropList.filter((line, i) => {
        line[0] !== parseReorderList[i][0];
      })[0];
      setReorderTabList((prev) => {
        return prev.filter((prevTab) => prevTab[0] !== deletedTab[0]);
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
  const [isTabDeleted, setIsTabDeleted] = createSignal<boolean>(false);
  const [deleteTabIndex, setDeleteTabIndex] = createSignal<number | null>(null);
  const [isReordering, setIsReordering] = createSignal<boolean>(false);

  // Focus tab whenether it's deleted or created or reordering.
  createEffect(() => {
    const tabIdList = reorderTabList();
    if (tabIdList.length === 0) return;

    if (isReordering()) {
      setFocusedTab(draggedTabId()!);
      return;
    }

    if (isTabDeleted()) {
      if (!deleteTabIndex) return;
      const contextIndex = deleteTabIndex() === 0 ? 1 : deleteTabIndex()! - 1;
      const newValue = focusedTab() === reorderTabList()[deleteTabIndex()!][0]
        ? reorderTabList()[contextIndex][0]
        : focusedTab();
      setTimeout(() => {
        setFocusedTab(newValue);
        setDeleteTabIndex(null);
      }, 0);
    } else {
      const currentTabId = reorderTabList()[reorderTabList().length - 1][0];
      setFocusedTab(currentTabId);
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
          onValueChange={(e) => setFocusedTab(e.value)}
          width="100%"
          height="100%"
          gap={"0"}
        >
          <Tabs.List
            ref={scrollContainer}
            style={{
              background: "--colors-bg-muted",
              height: `3rem`,
              "padding-top": "0.5rem",
            }}
            gap="0"
            onWheel={(e) => mouseWheelHandler(e)}
            onDrop={() => {
              props.onTabDrop?.();
              props.onTabContextDragEnter?.(false);
            }}
            width={"100%"}
            marginRight={"0"}
          >
            <For each={reorderTabList()}>
              {(
                [
                  currentTabId,
                  currentFilePath,
                  _,
                  ,
                  currentTabName,
                ],
                index,
              ) => (
                <Tabs.Trigger
                  value={currentTabId}
                  draggable
                  onDragStart={(e) => {
                    setDraggedTabIndex(index());
                    setFocusedTab(currentTabId);
                    setPrevPositionX(e.currentTarget.scrollLeft);
                    setClientX(e.clientX);

                    const changedTabContext =
                      props.tabList.filter((info) =>
                        info[0] === currentTabId
                      )[0];
                    props.onDraggedTabInfo?.(
                      currentTabId,
                      currentFilePath,
                      changedTabContext[2], // Split series index array
                      changedTabContext[3].map((obj) => JSON.stringify(obj)), // Plot context
                      changedTabContext[4], // Tab name
                      props.id,
                    );
                    setDraggedTabId(currentTabId);
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
                    const findDraggedTabInfo = props.tabList.filter((info) => {
                      return info[0] === draggedTabId()!;
                    });
                    if (findDraggedTabInfo.length === 1) {
                      return;
                    }
                    setIsReordering(false);
                  }}
                >
                  <Editable.Root
                    defaultValue={currentTabName.length === 0
                      ? JSON.stringify(currentFilePath.match((/[^?!//]+$/)!))
                        .slice(2, -2) /*change to tabname*/
                      : currentTabName}
                    activationMode="dblclick"
                    onValueCommit={(v) => {
                      props.onTabNameChange?.(currentTabId, v.value);
                    }}
                  >
                    <Editable.Area>
                      <Editable.Input width="100%" />
                      <Editable.Preview width="100%" />
                    </Editable.Area>
                  </Editable.Root>
                  <IconButton
                    variant={"ghost"}
                    size={"sm"}
                    onClick={() => {
                      setDeleteTabIndex(index());
                      props.onDeleteTab?.(currentTabId);
                      setIsTabDeleted(true);
                    }}
                  >
                    <IconX />
                  </IconButton>
                </Tabs.Trigger>
              )}
            </For>
            <IconButton
              variant={"ghost"}
              onClick={() => {
                setIsTabDeleted(false);
                props.onCreateTab?.();
              }}
              borderRadius={"1rem"}
              paddingBottom={"0.5rem"}
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
              {(
                [
                  currentTabId,
                  currentFilePath,
                  currentTabIndexArray,
                ],
                index,
              ) => (
                <Tabs.Content
                  value={currentTabId}
                  height={"100%"}
                  width={"100% "}
                  style={{ 
                    "overflow-y": "auto",
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                  }}
                  onDragEnter={() => props.onTabContextDragEnter?.(true)}
                  onDrop={() => {
                    props.onTabContextDragEnter?.(false);
                  }}
                >
                  <LogViewerTabPageContent
                    tabId={currentTabId}
                    plotContext={props.tabList[index()][3]}
                    filePath={currentFilePath}
                    onSplit={(e) => {
                      if (e.length === 0) return;
                      props.onSplit?.(currentTabId, e);
                    }}
                    splitPlotIndex={currentTabIndexArray}
                    onContextChange={(changedPlotContext) => {
                      props.onContextChange?.(
                        currentTabId,
                        JSON.parse(JSON.stringify(changedPlotContext)),
                      );
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
