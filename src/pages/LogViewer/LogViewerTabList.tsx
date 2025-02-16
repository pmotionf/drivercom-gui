import { createEffect, createSignal, For, JSX } from "solid-js";
import { Tabs } from "~/components/ui/tabs";
import { IconButton } from "~/components/ui/icon-button";
import { IconPlus, IconX } from "@tabler/icons-solidjs";
import { Editable } from "~/components/ui/editable";
import { LogViewerTabPageContent } from "./LogViewerTabPageContent";

export type LogViewerTabListProps = JSX.HTMLAttributes<HTMLDivElement> & {
  tabList: [string, string][];
  tabListPosition: string;
  onCreateTab?: () => void;
  onDeleteTab?: (tadId: string) => void;
  onDraggedTabId?: (tabId: string, filePath: string) => void;
  onTabDrop?: () => void;
  onReorderTab?: (tabList: [string, string][]) => void;
};

export function LogViewerTabList(props: LogViewerTabListProps) {
  // Reorder tab
  const [draggedTabIndex, setDraggedTabIndex] = createSignal<number | null>(
    null,
  );
  const [reorderTabList, setReorderTabList] = createSignal<
    [string, string][] | undefined
  >(undefined);

  const reorderTabsOnDragOver = (e: DragEvent, index: number) => {
    e.preventDefault();
    if (draggedTabIndex() !== null && draggedTabIndex() !== index) {
      const updateTab = [...props.tabList];
      const [draggedTab] = updateTab.splice(draggedTabIndex()!, 1);
      updateTab.splice(index, 0, draggedTab);
      setReorderTabList(updateTab);
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

  // Focus tab whenether it's deleted or created
  createEffect(() => {
    const tabIdList = props.tabList;
    if (tabIdList.length === 0) return;

    if (isTabDeleted()) {
      if (!deleteTabIndex) return;
      const contextIndex = deleteTabIndex() === 0 ? 1 : deleteTabIndex()! - 1;
      const newValue = focusedTab() === props.tabList[deleteTabIndex()!][0]
        ? props.tabList[contextIndex][0]
        : focusedTab();
      setTimeout(() => {
        setFocusedTab(newValue);
        setDeleteTabIndex(null);
      }, 0);
    } else {
      const currentTabId = props.tabList[props.tabList.length - 1][0];
      setFocusedTab(currentTabId);
      scrollToEnd();
    }
  });

  const [draggedTabInfo, setDraggedTabInfo] = createSignal<[string, string]>();

  return (
    <>
      <div style={{ "width": "100%", height: "100%" }}>
        <Tabs.Root
          value={focusedTab()}
          onValueChange={(e) => setFocusedTab(e.value)}
          width="100%"
          height="100%"
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
            }}
            width={"100%"}
            marginRight={"0"}
          >
            <For each={props.tabList}>
              {([tabId, filePath], index) => (
                <Tabs.Trigger
                  value={tabId}
                  draggable
                  onDragStart={(e) => {
                    setDraggedTabIndex(index());
                    setFocusedTab(tabId);
                    setPrevPositionX(e.currentTarget.scrollLeft);
                    setClientX(e.clientX);

                    //drag to other tab
                    props.onDraggedTabId?.(tabId, filePath);
                    setDraggedTabInfo([tabId, filePath]);
                  }}
                  onDragOver={(e) => {
                    reorderTabsOnDragOver(e, index());
                    dragOverScroll(e);
                  }}
                  onDragEnd={() => {
                    const findDraggedTabInfo = props.tabList.filter((info) => {
                      return info[0] === draggedTabInfo()![0];
                    });
                    if (findDraggedTabInfo.length !== 1) return;
                    if (!reorderTabList()) return;

                    props.onReorderTab?.(reorderTabList()!);
                    setDraggedTabIndex(null);
                    setClientX(null);
                    setFocusedTab(tabId);
                    setReorderTabList(undefined);
                  }}
                  onDrop={() => {
                    const findDraggedTabInfo = props.tabList.filter((info) => {
                      return info[0] === draggedTabInfo()![0];
                    });
                    if (findDraggedTabInfo.length === 1) return;
                    props.onTabDrop?.();
                  }}
                >
                  <Editable.Root
                    defaultValue={
                      JSON.stringify(filePath.match((/[^?!//]+$/)!))
                        .slice(2, -2) /*change to tabname*/
                    }
                    activationMode="dblclick"
                    onEditChange={() => {}}
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
                      props.onDeleteTab?.(tabId);
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
          <For each={props.tabList}>
            {([currentTabId, currentFilePath]) => (
              <Tabs.Content
                value={currentTabId}
                height={"100%"}
              >
                <LogViewerTabPageContent
                  tabId={currentTabId}
                  filePath={currentFilePath}
                />
              </Tabs.Content>
            )}
          </For>
        </Tabs.Root>
      </div>
    </>
  );
}
