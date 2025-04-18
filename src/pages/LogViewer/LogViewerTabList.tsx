import { createEffect, createSignal, For, JSX, Show } from "solid-js";
import { Tabs } from "~/components/ui/tabs.tsx";
import { IconButton } from "~/components/ui/icon-button.tsx";
import { IconPlus, IconX } from "@tabler/icons-solidjs";
import { Editable } from "~/components/ui/editable.tsx";
import { LogViewerTabPageContent } from "./LogViewerTabPageContent.tsx";
import { LogViewerTabContext } from "../LogViewer.tsx";
//@ts-ignore test
import { Stack } from "styled-system/jsx/index.mjs";
import { Text } from "~/components/ui/text.tsx";
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
  onTabDrag?: (tabContext: LogViewerTabContext) => void;
  onTabContextChange?: (tabContext: LogViewerTabContext) => void;
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

  const [reorderTabIndex, setReorderTabIndex] = createSignal<number | null>();

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

  const [currentDraggingTabId, setCurrentDraggingTabId] = createSignal<
    string | null
  >();
  const [currentDraggingTabLocation, setCurrentDraggingTabLocation] =
    createSignal<tabLocation>("none");

  return (
    <>
      <div style={{ width: "100%", height: "100%" }}>
        <Tabs.Root
          value={props.focusedTab!}
          onValueChange={(e: { value: string }) => {
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
            onWheel={(e: WheelEvent) => mouseWheelHandler(e)}
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
                      "z-index": tab.id === currentDraggingTabId() ? "0" : "10",
                    }}
                    onMouseEnter={() => {
                      if (currentDraggingTabId()) {
                        setReorderTabIndex(index());
                      }
                    }}
                    onMouseLeave={() => setReorderTabIndex(null)}
                    use:dragOptions={{
                      cancel: ".cancel",
                      bounds: "parent",
                      onDragStart: (data) => {
                        props.onTabDrag?.(tab);
                        setCurrentDraggingTabId(tab.id);
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
                        const collapsedSideBarWidth = document.getElementById(
                          "radio-group:collapsed_side_bar",
                        )!.offsetWidth;

                        setCurrentMousePointerPosition(() => {
                          return {
                            x: data.event.clientX -
                              mousePositionInsideComponent().x -
                              collapsedSideBarWidth,
                            y: data.event.clientY -
                              mousePositionInsideComponent().y,
                          };
                        });

                        const tabListContainerStart = document.getElementById(
                          props.id,
                        )!.offsetLeft;
                        const tabListContainerWidth = document.getElementById(
                          props.id,
                        )!.offsetWidth;
                        const tabListContainerWidthQuarter =
                          tabListContainerWidth * 0.25;
                        const tabListContainerEnd = tabListContainerStart +
                          tabListContainerWidth;
                        const clientX = data.event.clientX;

                        if (clientX >= tabListContainerEnd) {
                          setCurrentDraggingTabLocation("otherPanel");
                        } else if (clientX <= tabListContainerStart) {
                          setCurrentDraggingTabLocation("otherPanel");
                        } else {
                          if (
                            data.event.clientY > data.currentNode.offsetHeight
                          ) {
                            clientX > tabListContainerStart &&
                              clientX <
                                tabListContainerWidthQuarter +
                                  tabListContainerStart
                              ? setCurrentDraggingTabLocation("leftSplitter")
                              : clientX >=
                                    tabListContainerWidthQuarter +
                                      tabListContainerStart &&
                                  clientX <=
                                    tabListContainerEnd -
                                      tabListContainerWidthQuarter
                              ? setCurrentDraggingTabLocation(
                                "centerSplitter",
                              )
                              : setCurrentDraggingTabLocation(
                                "rightSplitter",
                              );
                          } else {
                            setCurrentDraggingTabLocation("tabList");
                            if (scrollContainer && prevClientX()) {
                              dragOverScroll(
                                data.event.clientX,
                                prevClientX()!,
                                prevPositionX(),
                                scrollContainer,
                              );
                            }
                          }
                        }
                      },
                      onDragEnd: () => {
                        if (reorderTabIndex() !== null) {
                          reorderTabsOnDragEnd(index(), reorderTabIndex()!);
                          props.onTabFocus?.(currentDraggingTabId()!);
                          setReorderTabIndex(null);
                        } else {
                          props.onTabFocus?.(tab.id);
                        }

                        props.onTabDragEnd?.(currentDraggingTabLocation());

                        setCurrentDraggingTabId(null);
                        setPrevClientX(null);
                        setCurrentDraggingTabLocation("none");
                      },
                    }}
                  >
                    <Tabs.Trigger
                      value={tab.id}
                      paddingRight="0"
                      opacity={tab.id === currentDraggingTabId()
                        ? "0%"
                        : "100%"}
                      borderBottomWidth={currentDraggingTabId()
                        ? currentDraggingTabId() === tab.id ? "3px" : "0px"
                        : props.focusedTab === tab.id
                        ? "3px"
                        : "0px"}
                      marginTop={currentDraggingTabId()
                        ? currentDraggingTabId() === tab.id
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
                          ).slice(2, -2)
                          : tab.tabName}
                        activationMode="dblclick"
                        onValueCommit={(tabName: { value: string }) => {
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
                      when={reorderTabIndex() === index() &&
                        currentDraggingTabId() !== tab.id}
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
                  plotContext={props.tabList[index()].plotContext}
                  xRange={props.tabList[index()].plotZoomState}
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
        {currentDraggingTabId() && (
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
                    .indexOf(currentDraggingTabId()!)
                ].tabName.length !== 0
                ? props.tabList[
                  props.tabList
                    .map((tab) => {
                      return tab.id;
                    })
                    .indexOf(currentDraggingTabId()!)
                ].tabName
                : JSON.stringify(
                  props.tabList[
                    props.tabList
                      .map((tab) => {
                        return tab.id;
                      })
                      .indexOf(currentDraggingTabId()!)
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
        when={currentDraggingTabLocation().slice(
              currentDraggingTabLocation().length - 8,
              currentDraggingTabLocation().length,
            ) === "Splitter" && props.tabList.length > 1}
      >
        <Stack
          backgroundColor="fg.default"
          style={{
            width: currentDraggingTabLocation() === "centerSplitter"
              ? `${document.getElementById(props.id)!.clientWidth}px`
              : `${document.getElementById(props.id)!.clientWidth / 2}px`,
            height: `${document.getElementById(props.id)!.clientHeight}px`,
            position: "absolute",
            top: "3rem",
            left: currentDraggingTabLocation() === "rightSplitter"
              ? `${document.getElementById(props.id)!.clientWidth / 2}px`
              : "0px",
            opacity: "10%",
          }}
        />
      </Show>
    </>
  );
}
