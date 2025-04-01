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
import { Portal } from "solid-js/web";

type tabLocation =
  | "none"
  | "rightSplitter"
  | "leftSplitter"
  | "otherPanel"
  | "tabList"
  | "centerSplitter";

export type LogViewerTabListProps = JSX.HTMLAttributes<HTMLDivElement> & {
  id: string;
  tabList: LogViewerTabContext[];
  onCreateTab?: () => void;
  onDeleteTab?: (deleteTabId: string, index: number) => void;
  onDraggedTabInfo?: (tabContext: LogViewerTabContext) => void;
  onTabDrop?: () => void;
  onTabContextChange?: (tabContext: LogViewerTabContext) => void;
  //onTabContextDrag?: (isTabContextDragEnter: boolean) => void;
  focusedTab?: string;
  onTabFocus?: (focusedTabId: string) => void;
  onTabReorder?: (reorderdTab: LogViewerTabContext[]) => void;
  onTabDragEnd?: (direction: tabLocation) => void;
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
  // If the tab focusing on the drag start, then the tab dragging got canceled.
  // For showing natural tab focusing, the tab focus change on the drag end
  // But when reorder the other tab, it dosent show like the other tab is dragging.
  // To display the tab is dragging this signal is necessary for UI.
  const [draggingTabId, setDraggingTabId] = createSignal<string | null>();
  const [draggingTabLocation, setDraggingTabLocation] = createSignal<
    tabLocation
  >("none");

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
          padding="0"
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
                        props.onDraggedTabInfo?.(tab);
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
                          const collapsedSideBarWidth = document.getElementById(
                            "radio-group:collapsed_side_bar",
                          )!.offsetWidth;
                          return {
                            x: data.event.clientX -
                              mousePositionInsideComponent().x -
                              collapsedSideBarWidth,
                            y: data.event.clientY -
                              mousePositionInsideComponent().y,
                          };
                        });

                        const tabListContainerLeft = document.getElementById(
                          props.id,
                        )!.offsetLeft;
                        const tabListContainerWidth = document.getElementById(
                          props.id,
                        )!.offsetWidth;

                        if (
                          data.event.clientY > data.currentNode.offsetHeight
                        ) {
                          if (
                            data.event.clientX > tabListContainerLeft &&
                            data.event.clientX <
                              tabListContainerWidth * 0.25 +
                                tabListContainerLeft
                          ) {
                            setDraggingTabLocation("leftSplitter");
                          } else if (
                            data.event.clientX >=
                              tabListContainerWidth * 0.25 +
                                tabListContainerLeft &&
                            data.event.clientX <=
                              tabListContainerWidth * 0.75 +
                                tabListContainerLeft
                          ) {
                            setDraggingTabLocation("centerSplitter");
                          } else if (
                            data.event.clientX >
                              tabListContainerWidth * 0.75 +
                                tabListContainerLeft &&
                            data.event.clientX <=
                              tabListContainerWidth + tabListContainerLeft
                          ) {
                            setDraggingTabLocation("rightSplitter");
                          }
                        } else {
                          setDraggingTabLocation("tabList");
                          if (scrollContainer && prevClientX()) {
                            dragOverScroll(
                              data.event.clientX,
                              prevClientX()!,
                              prevPositionX(),
                              scrollContainer,
                            );
                          }
                        }

                        if (
                          data.event.clientX >
                            tabListContainerWidth + tabListContainerLeft
                        ) {
                          setDraggingTabLocation("otherPanel");
                        } else if (data.event.clientX <= tabListContainerLeft) {
                          setDraggingTabLocation("otherPanel");
                        }
                      },
                      onDragEnd: () => {
                        if (nextOrderTabIndex() !== null) {
                          reorderTabsOnDragEnd(index(), nextOrderTabIndex()!);
                          props.onTabFocus?.(draggingTabId()!);
                          setNextOrderTabIndex(null);
                        } else {
                          props.onTabFocus?.(tab.id);
                        }

                        props.onTabDragEnd?.(draggingTabLocation());

                        setDraggingTabId(null);
                        setPrevClientX(null);
                        setDraggingTabLocation("none");
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
            <div style={{ width: "100%" }}></div>
          </Tabs.List>
          <For each={props.tabList}>
            {(tab, index) => (
              <Tabs.Content
                value={tab.id}
                width="100%"
                height="100%"
                overflowY="auto"
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
                    if (plotSplitIndex.length === 0) {
                      return;
                    }
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
      <Portal>
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
      </Portal>
      <Show
        when={draggingTabLocation() !== "tabList" &&
          draggingTabLocation() !== "none" &&
          draggingTabLocation() !== "otherPanel" &&
          props.tabList.length > 1}
      >
        <Stack
          backgroundColor="fg.default"
          style={{
            width: draggingTabLocation() === "centerSplitter"
              ? `${document.getElementById(props.id)!.clientWidth}px`
              : `${document.getElementById(props.id)!.clientWidth / 2}px`,
            height: `${document.getElementById(props.id)!.clientHeight}px`,
            position: "absolute",
            top: "3rem",
            left: draggingTabLocation() === "rightSplitter"
              ? `${document.getElementById(props.id)!.clientWidth / 2}px`
              : "0px",
            opacity: "10%",
          }}
        />
      </Show>
    </>
  );
}
