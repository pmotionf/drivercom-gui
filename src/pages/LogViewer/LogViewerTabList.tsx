import { createEffect, createSignal, For, JSX } from "solid-js";
import { Tabs } from "~/components/ui/tabs";
import { IconButton } from "~/components/ui/icon-button";
import { IconPlus, IconX } from "@tabler/icons-solidjs";
import { Editable } from "~/components/ui/editable";
import { LogViewerTabPageContent } from "./LogViewerTabPageContent";
import { LogViewerTabContext } from "../LogViewer";
import { css } from "styled-system/css";

export type LogViewerTabListProps = JSX.HTMLAttributes<HTMLDivElement> & {
  id: string;
  tabList: LogViewerTabContext[];
  onCreateTab?: () => void;
  onDeleteTab?: (deleteTabId: string, index: number) => void;
  onDraggedTabInfo?: (
    tabContext: LogViewerTabContext,
  ) => void;
  onTabDrop?: () => void;
  onTabContextChange?: (tabContext: LogViewerTabContext) => void;
  onTabContextDrag?: (isTabContextDragEnter: boolean) => void;
  focusedTab?: string;
  onTabFocus?: (focusedTabId: string) => void;
  onTabReorder?: (reorderdTab: LogViewerTabContext[]) => void;
};

export function LogViewerTabList(props: LogViewerTabListProps) {
  // Reorder tab
  const [draggedTabIndex, setDraggedTabIndex] = createSignal<number | null>(
    null,
  );

  const reorderTabsOnDragOver = (e: DragEvent, index: number) => {
    e.preventDefault();
    if (draggedTabIndex() !== null && draggedTabIndex() !== index) {
      const updateTab = [...props.tabList];
      const [draggedTab] = updateTab.splice(draggedTabIndex()!, 1);
      updateTab.splice(index, 0, draggedTab);
      props.onTabReorder?.([...updateTab]);
      setDraggedTabIndex(index);
    }
  };

  // Keep update the draggedTabIndex to reorder tab until the tab drag ends.
  createEffect(() => {
    const index = draggedTabIndex();
    if (index === null) {
      const newIndex = props.tabList.findIndex((tab) =>
        tab.id === props.focusedTab
      );
      if (newIndex !== -1) {
        setDraggedTabIndex(newIndex);
      }
    }
  });

  const [clientX, setClientX] = createSignal<number | null>(null);
  // Tab X coordinate relative to start of tab list, can extend beyond screen.
  const [prevPositionX, setPrevPositionX] = createSignal<number>(0);
  let scrollContainer: HTMLDivElement | undefined;

  const dragOverScroll = (e: MouseEvent) => {
    if (!scrollContainer || !clientX()) return;

    const movement = (e.clientX - clientX()! + prevPositionX()) * 0.05;
    scrollContainer.scrollBy({ left: movement });
  };

  const mouseWheelHandler = (e: WheelEvent) => {
    if (!scrollContainer) return;

    e.preventDefault;
    scrollContainer.scrollLeft += e.deltaY;
  };

  createEffect(() => {
    const focusedTab = props.focusedTab;
    if (!focusedTab) return;
    const currentTabTrigger = document.getElementById(focusedTab);
    if (scrollContainer) {
      scrollContainer.scrollTo({ left: currentTabTrigger!.offsetLeft });
    }
  });

  return (
    <>
      <div
        style={{ "width": "100%", height: "100%" }}
      >
        <Tabs.Root
          value={props.focusedTab!}
          onValueChange={(e) => {
            props.onTabFocus?.(e.value);
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
            <For each={props.tabList}>
              {(tab, index) => (
                <Tabs.Trigger
                  id={tab.id}
                  value={tab.id}
                  draggable
                  paddingRight="0"
                  onDragStart={(e) => {
                    setDraggedTabIndex(index());
                    setPrevPositionX(e.currentTarget.scrollLeft);
                    setClientX(e.clientX);

                    const changedTabContext =
                      props.tabList.filter((info) => info.id === tab.id)[0];
                    props.onDraggedTabInfo?.(changedTabContext);
                  }}
                  onDragOver={(e) => {
                    reorderTabsOnDragOver(e, index());
                    dragOverScroll(e);
                  }}
                  onDragEnd={() => {
                    setDraggedTabIndex(null);
                    setClientX(null);
                  }}
                  // Use css for theme color
                  class={css({
                    "borderBottomWidth": props.focusedTab === tab.id
                      ? "3px"
                      : "0px",
                    "marginTop": props.focusedTab === tab.id
                      ? `calc(0.5rem + 1px)`
                      : `0.5rem `,
                    "borderBottomColor": "accent.emphasized",
                  })}
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
              onClick={() => props.onCreateTab?.()}
              borderRadius="3rem"
              marginTop="0.2rem"
            >
              <IconPlus />
            </IconButton>
            <div
              style={{ "width": "100%" }}
              onDragOver={(e) => e.preventDefault()}
            >
            </div>
          </Tabs.List>

          <For each={props.tabList}>
            {(tab, index) => (
              <Tabs.Content
                value={tab.id}
                height="100%"
                width="100% "
                style={{
                  "overflow-y": "auto",
                }}
                onDragOver={(e) => e.preventDefault()}
                onDragEnter={() => props.onTabContextDrag?.(true)}
                onDrop={() => props.onTabContextDrag?.(false)}
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
