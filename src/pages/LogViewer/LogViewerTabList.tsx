import { createEffect, createSignal, For, JSX, Show } from "solid-js";
import { Tabs } from "~/components/ui/tabs";
import { IconButton } from "~/components/ui/icon-button";
import { IconPlus, IconX } from "@tabler/icons-solidjs";
import { Editable } from "~/components/ui/editable";
import { LogViewerTabPageContent } from "./LogViewerTabPageContent";
import { LogViewerTabContext } from "../LogViewer";
import { css } from "styled-system/css";
import { Stack } from "styled-system/jsx";
import { Text } from "~/components/ui/text";
import { createDraggable } from "@neodrag/solid";

export type LogViewerTabListProps = JSX.HTMLAttributes<HTMLDivElement> & {
  id: string;
  tabList: LogViewerTabContext[];
  onCreateTab?: () => void;
  onDeleteTab?: (deleteTabId: string, index: number) => void;
  onDraggedTabInfo?: (tabContext: LogViewerTabContext) => void;
  onTabDrop?: () => void;
  onTabContextChange?: (tabContext: LogViewerTabContext) => void;
  onTabContextDrag?: (isTabContextDragEnter: boolean) => void;
  focusedTab?: string;
  onTabFocus?: (focusedTabId: string) => void;
  onTabReorder?: (reorderdTab: LogViewerTabContext[]) => void;
};

export function LogViewerTabList(props: LogViewerTabListProps) {
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

  //@ts-ignore it needs to available to use draggble event
  const { draggable: myCustomDraggable } = createDraggable();
  const [draggingTabId, setDraggingTabId] = createSignal<string | null>();
  const [reorderTabIndex, setReorderTabIndex] = createSignal<number | null>();
  const [currentTabPosition, setCurrentTabPosition] = createSignal<{
    x: number;
    y: number;
  }>({ x: 0, y: 0 });

  const reorderTabsOnDragEnd = (reorderIndex: number) => {
    //e.preventDefault();
    //if (draggedTabIndex() !== null && draggedTabIndex() !== index) {
    const fromIndex = props.tabList
      .map((tab) => {
        return tab.id;
      })
      .indexOf(draggingTabId()!);
    const nextIndex = reorderIndex;

    if (fromIndex !== nextIndex) {
      const updatedItems = props.tabList.slice();
      updatedItems.splice(nextIndex, 0, ...updatedItems.splice(fromIndex, 1));
      props.onTabReorder?.(updatedItems);
    }
  };

  return (
    <>
      <div style={{ width: "100%", height: "100%" }} id="testDiv">
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
            <Stack direction="row">
              <For each={props.tabList}>
                {(tab, index) => (
                  <div
                    id={tab.id}
                    style={{
                      width: "100%",
                      height: "100%",
                      position: "relative",
                      "z-index": tab.id === draggingTabId() ? "0" : "10",
                    }}
                    onMouseEnter={() => {
                      if (draggingTabId()) {
                        setReorderTabIndex(index());
                      }
                    }}
                    onMouseLeave={() => setReorderTabIndex(null)}
                    use:myCustomDraggable={{
                      cancel: ".cancel",
                      bounds: "parent",
                      onDragStart: (data) => {
                        setDraggingTabId(tab.id);
                        setPrevPositionX(
                          document.getElementById(tab.id)!.scrollLeft,
                        );
                        setClientX(data.event.clientX);
                      },
                      onDrag: (data) => {
                        setCurrentTabPosition(() => {
                          return {
                            x: data.event.screenX - 48,
                            y: data.event.clientY,
                          };
                        });

                        if (
                          data.event.clientY > data.currentNode.offsetHeight
                        ) {
                          props.onTabContextDrag?.(true);
                        } else {
                          props.onTabContextDrag?.(false);
                        }

                        dragOverScroll(data.event);
                      },
                      onDragEnd: () => {
                        props.onTabContextDrag?.(false);
                        reorderTabsOnDragEnd(reorderTabIndex()!);
                        props.onTabFocus?.(draggingTabId()!);

                        setReorderTabIndex(null);
                        setDraggingTabId(null);
                        setClientX(null);
                      },
                    }}
                  >
                    <Tabs.Trigger
                      value={tab.id}
                      paddingRight="0"
                      opacity={tab.id === draggingTabId() ? "0%" : "100%"}
                      /*draggable
                      onDragStart={(e) => {
                        setDraggedTabIndex(index());
                        setPrevPositionX(e.currentTarget.scrollLeft);
                        setClientX(e.clientX);

                        const changedTabContext = props.tabList.filter(
                          (info) => info.id === tab.id,
                        )[0];
                        props.onDraggedTabInfo?.(changedTabContext);
                      }}
                      onDragOver={(e) => {
                        reorderTabsOnDragOver(e, index());
                        dragOverScroll(e);
                      }}
                      onDragEnd={() => {
                        setDraggedTabIndex(null);
                        setClientX(null);
                      }}*/
                      // Use css for theme color
                      borderBottomWidth={
                        props.focusedTab === tab.id ? "3px" : "0px"
                      }
                      marginTop={
                        props.focusedTab === tab.id
                          ? `calc(0.5rem + 1px)`
                          : `0.5rem `
                      }
                      borderBottomColor="accent.emphasized"
                      class={css({
                        borderBottomWidth: draggingTabId()
                          ? draggingTabId() === tab.id
                            ? "3px"
                            : "0px"
                          : props.focusedTab === tab.id
                            ? "3px"
                            : "0px",
                        marginTop:
                          props.focusedTab === tab.id
                            ? `calc(0.5rem + 1px)`
                            : `0.5rem `,
                        borderBottomColor: "accent.emphasized",
                      })}
                    >
                      <Editable.Root
                        defaultValue={
                          tab.tabName.length === 0
                            ? JSON.stringify(
                                tab.filePath.match(/[^?!//]+$/!),
                              ).slice(2, -2) /*change to tabname*/
                            : tab.tabName
                        }
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
                      <div class="cancel">
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
                      </div>
                    </Tabs.Trigger>
                  </div>
                )}
              </For>
            </Stack>
            <IconButton
              variant="ghost"
              onClick={() => props.onCreateTab?.()}
              borderRadius="3rem"
              marginTop="0.2rem"
            >
              <IconPlus />
            </IconButton>
            <div
              style={{ width: "100%" }}
              onDragOver={(e) => e.preventDefault()}
            ></div>
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
                  style={{
                    position: "relative",
                    "z-index": 10,
                  }}
                  plotContext={
                    props.tabList[index()].plotContext /*Plot context*/
                  }
                  xRange={
                    props.tabList[index()].plotZoomState /*Plots's x range*/
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
      {draggingTabId() && (
        <Stack
          backgroundColor="bg.default"
          borderBottomWidth="2px"
          borderBottomColor="accent.emphasized"
          direction="row"
          style={{
            position: "absolute",
            top: `${currentTabPosition().y}px`,
            left: `${currentTabPosition().x}px`,
            "padding-left": "0.5rem",
          }}
        >
          <Text fontWeight="bold" color="fg.default" paddingTop="0.5rem">
            {props.tabList[
              props.tabList
                .map((tab) => {
                  return tab.id;
                })
                .indexOf(draggingTabId()!)
            ].tabName.length !== 0
              ? props.tabList[
                  props.tabList
                    .map((tab) => {
                      return tab.id;
                    })
                    .indexOf(draggingTabId()!)
                ].tabName
              : JSON.stringify(
                  props.tabList[
                    props.tabList
                      .map((tab) => {
                        return tab.id;
                      })
                      .indexOf(draggingTabId()!)
                  ].filePath.match(/[^?!//]+$/!),
                ).slice(2, -2)}
          </Text>
          <IconButton disabled variant="ghost">
            <IconX />
          </IconButton>
        </Stack>
      )}
    </>
  );
}
