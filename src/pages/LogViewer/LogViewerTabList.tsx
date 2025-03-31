import { createEffect, createSignal, For, JSX, Show } from "solid-js";
import { Tabs } from "~/components/ui/tabs";
import { IconButton } from "~/components/ui/icon-button";
import { IconPlus, IconX } from "@tabler/icons-solidjs";
import { Editable } from "~/components/ui/editable";
import { LogViewerTabPageContent } from "./LogViewerTabPageContent";
import { LogViewerTabContext } from "../LogViewer";
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
  // This signal is needed in dragover scroll to prevent the gap
  // between scrolling before and after.
  const [prevClientX, setPrevClientX] = createSignal<number | null>(null);
  // Tab X coordinate relative to start of tab list, can extend beyond screen.
  const [prevPositionX, setPrevPositionX] = createSignal<number>(0);
  let scrollContainer: HTMLDivElement | undefined;

  const dragOverScroll = (
    currentClientX: number,
    prevClientX: number,
    prevPositionX: number,
    scrollContainer: HTMLDivElement,
  ) => {
    const movement = (currentClientX - prevClientX + prevPositionX) * 0.05;
    scrollContainer.scrollBy({ left: movement });
  };

  const mouseWheelHandler = (e: WheelEvent) => {
    if (!scrollContainer) return;

    e.preventDefault;
    scrollContainer.scrollLeft += e.deltaY;
  };

  // This is a create effect for scrolling the tab list automatically.
  createEffect(() => {
    const focusedTab = props.focusedTab;
    if (!focusedTab) return;
    const currentTabTrigger = document.getElementById(focusedTab);
    if (scrollContainer) {
      scrollContainer.scrollTo({ left: currentTabTrigger!.offsetLeft });
    }
  });

  const [nextOrderTabIndex, setNextOrderTabIndex] = createSignal<
    number | null
  >();

  const reorderTabsOnDragEnd = (
    currentTabIndex: number,
    reorderIndex: number,
  ) => {
    const fromIndex = currentTabIndex;
    const nextIndex = reorderIndex;

    if (fromIndex !== nextIndex) {
      const updatedItems = props.tabList.slice();
      updatedItems.splice(nextIndex, 0, ...updatedItems.splice(fromIndex, 1));
      props.onTabReorder?.(updatedItems);
    }
  };

  const [currentMousePointerPosition, setCurrentMousePointerPosition] =
    createSignal<{
      x: number;
      y: number;
    }>({ x: 0, y: 0 });

  // This signal is for getting mouse offsetX, offsetY for UI.
  // It gets the location of the mouse pointer in the tab trigger component.
  const [mousePositionInsideComponent, setMousePositionInsideComponent] =
    createSignal<{
      x: number;
      y: number;
    }>({ x: 0, y: 0 });

  //@ts-ignore This draggable is needed to use neo-drag.
  // deno-lint-ignore no-unused-vars
  const { draggable: dragOptions } = createDraggable();

  // This signal is only used for UI.
  // It is necessary to avoid the tab focusing error.
  const [draggingTabId, setDraggingTabId] = createSignal<string | null>();

  return (
    <>
      <div style={{ width: "100%", height: "100%" }}>
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
              "overflow-y": "hidden",
            }}
            onWheel={(e) => mouseWheelHandler(e)}
            gap="0"
            onDrop={() => {
              props.onTabDrop?.();
              props.onTabContextDrag?.(false);
            }}
            width="100%"
            marginRight="0"
          >
            <Stack direction="row" gap="0">
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
                        setNextOrderTabIndex(index());
                      }
                    }}
                    onMouseLeave={() => setNextOrderTabIndex(null)}
                    use:dragOptions={{
                      cancel: ".cancel",
                      bounds: "parent",
                      onDragStart: (data) => {
                        setDraggingTabId(tab.id);
                        setPrevPositionX(
                          document.getElementById(tab.id)!.scrollLeft,
                        );
                        setPrevClientX(data.event.clientX);
                        setMousePositionInsideComponent({
                          x: data.event.offsetX,
                          y: data.event.offsetY,
                        });
                      },
                      onDrag: (data) => {
                        setCurrentMousePointerPosition(() => {
                          const collapseSideBarWidth = document.getElementById(
                            "radio-group:collapsed_side_bar",
                          )!.offsetWidth;
                          return {
                            x: data.event.clientX -
                              mousePositionInsideComponent().x -
                              collapseSideBarWidth,
                            y: data.event.clientY -
                              mousePositionInsideComponent().y,
                          };
                        });

                        if (
                          data.event.clientY > data.currentNode.offsetHeight
                        ) {
                          props.onTabContextDrag?.(true);
                          setNextOrderTabIndex(null);
                        } else {
                          props.onTabContextDrag?.(false);
                        }

                        if (scrollContainer && prevClientX()) {
                          dragOverScroll(
                            data.event.clientX,
                            prevClientX()!,
                            prevPositionX(),
                            scrollContainer,
                          );
                        }
                      },
                      onDragEnd: () => {
                        props.onTabContextDrag?.(false);
                        setDraggingTabId(null);
                        setPrevClientX(null);

                        if (nextOrderTabIndex() !== null) {
                          reorderTabsOnDragEnd(index(), nextOrderTabIndex()!);
                          setNextOrderTabIndex(null);
                        }
                        props.onTabFocus?.(tab.id);
                      },
                    }}
                  >
                    <Tabs.Trigger
                      value={tab.id}
                      paddingRight="0"
                      opacity={tab.id === draggingTabId() ? "0%" : "100%"}
                      borderBottomWidth={draggingTabId()
                        ? draggingTabId() === tab.id ? "3px" : "0px"
                        : props.focusedTab === tab.id
                        ? "3px"
                        : "0px"}
                      marginTop={draggingTabId()
                        ? draggingTabId() === tab.id
                          ? `calc(0.5rem + 1px)`
                          : "0.5rem"
                        : props.focusedTab === tab.id
                        ? `calc(0.5rem + 1px)`
                        : `0.5rem`}
                      borderBottomColor="accent.emphasized"
                    >
                      <Editable.Root
                        defaultValue={tab.tabName.length === 0
                          ? JSON.stringify(
                            tab.filePath.match(/[^?!//]+$/!),
                          ).slice(2, -2) /*change to tabname*/
                          : tab.tabName}
                        activationMode="dblclick"
                        onValueCommit={(tabName) => {
                          const tabUpdate = tab;
                          tabUpdate.tabName = tabName.value;
                          props.onTabContextChange?.(tabUpdate);
                        }}
                      >
                        <Editable.Area>
                          <Editable.Input width="10rem" />
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
                    <Show
                      when={nextOrderTabIndex() === index() &&
                        draggingTabId() !== tab.id}
                    >
                      <Stack
                        width="100%"
                        height="100% "
                        position="absolute"
                        top="0"
                        background="fg.default"
                        opacity="10%"
                      />
                    </Show>
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
                  style={{
                    position: "relative",
                    "z-index": 10,
                  }}
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
      {draggingTabId() && (
        <Stack
          direction="row"
          borderBottomColor="accent.emphasized"
          background="bg.default"
          style={{
            position: "absolute",
            top: `${currentMousePointerPosition().y}px`,
            left: `${currentMousePointerPosition().x}px`,
            "padding-left": "0.5rem",
            "padding-bottom": "0.5rem",
            "pointer-events": "none",
            "z-index": "15",
            "border-bottom-width": "2px",
          }}
        >
          <Text
            fontWeight="bold"
            color="fg.default"
            paddingTop="0.5rem"
            whiteSpace="nowrap"
          >
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
          <IconButton variant="ghost" size="sm" borderRadius="3rem">
            <IconX />
          </IconButton>
        </Stack>
      )}
    </>
  );
}
