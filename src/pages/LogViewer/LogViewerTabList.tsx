import { createEffect, createSignal, For, JSX } from "solid-js";
import { Tabs } from "~/components/ui/tabs";
import { IconButton } from "~/components/ui/icon-button";
import { IconPlus, IconX } from "@tabler/icons-solidjs";
import { Editable } from "~/components/ui/editable";
import { LogViewerTabPageContent } from "./LogViewerTabPageContent";
import { LogViewerTabContext } from "../LogViewer";
import {
  closestCenter,
  createSortable,
  DragDropProvider,
  DragDropSensors,
  DragOverlay,
  SortableProvider,
} from "@thisbeyond/solid-dnd";
import { Stack } from "styled-system/jsx";
import { Text } from "~/components/ui/text";
import { Tooltip } from "~/components/ui/tooltip";
import { Portal } from "solid-js/web";

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
  const [tabSelect, setTabSelect] = createSignal<boolean>(false);
  const [prevClientX, setPrevClientX] = createSignal<number | null>(null);
  const [prevPositionX, setPrevPositionX] = createSignal<number>(0);
  let scrollContainer: HTMLDivElement | undefined;

  createEffect(() => {
    if (tabSelect()) return;
    props.onTabContextDrag?.(false);
    setPrevClientX(null);
  });

  const dragScrollMouseMoveHandler = (e: MouseEvent) => {
    if (!scrollContainer || !prevClientX()) return;

    const movement = (e.clientX - prevClientX()! + prevPositionX()) * 0.05;
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
            }}
            rowGap="0"
            onWheel={(e) => mouseWheelHandler(e)}
            onDrop={() => {
              props.onTabDrop?.();
            }}
            width="100%"
            marginRight="0"
            onMouseDown={(e) => {
              setPrevClientX(e.clientX);
              setPrevPositionX(e.currentTarget.scrollLeft);
            }}
            onMouseMove={(e) => {
              if (!tabSelect()) return;
              if (e.clientY > e.currentTarget.offsetHeight) {
                props.onTabContextDrag?.(true);
              } else {
                props.onTabContextDrag?.(false);
              }
              dragScrollMouseMoveHandler(e);
            }}
          >
            <DraggableTabList
              tabIds={props.tabList.map((tab) => tab.id)}
              tabNames={props.tabList.map((tab) => tab.tabName)}
              filePath={props.tabList.map((tab) => tab.filePath)}
              focusedId={props.focusedTab!}
              onTabNameChange={(changedTabName, changedTabId) => {
                const tabUpdate = props.tabList[
                  props.tabList.map((tab) => tab.id).indexOf(changedTabId)
                ];
                tabUpdate.tabName = changedTabName;
                props.onTabContextChange?.(tabUpdate);
              }}
              onDeleteTab={(deleteTabId, deleteTabIndex) => {
                props.onDeleteTab?.(deleteTabId, deleteTabIndex);
              }}
              onReorderTab={(reorderedTabList) => {
                const reorderedTabIndex: number[] = reorderedTabList.map(
                  (reorderTabId) => {
                    return props.tabList
                      .map((prevTab) => prevTab.id)
                      .indexOf(reorderTabId);
                  },
                );
                const updatedTab = props.tabList.map((_, i) => {
                  return props.tabList[reorderedTabIndex[i]];
                });
                props.onTabReorder?.(updatedTab);
              }}
              onDragStart={(isDragStart) => setTabSelect(isDragStart)}
              onTabFocus={(dragFocusedId) => props.onTabFocus?.(dragFocusedId)}
            />
            <IconButton
              variant="ghost"
              onClick={() => props.onCreateTab?.()}
              borderRadius="3rem"
              marginTop="0.2rem"
              marginLeft="-1rem"
            >
              <IconPlus />
            </IconButton>
          </Tabs.List>

          <For each={props.tabList}>
            {(tab, index) => (
              <Tabs.Content
                value={tab.id}
                height="100%"
                width="100%"
                style={{
                  "overflow-y": "auto",
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

export type DraggbleTabTriggerProps = {
  tabId: string;
  tabName: string;
  isTabFocus: boolean;
  onTabNameChange?: (changedTabName: string) => void;
  onDeleteButtonClick?: (deleteTabId: string) => void;
};

const DraggableTabTrigger = (props: DraggbleTabTriggerProps) => {
  const sortable = createSortable(props.tabId);
  const editableAreaWidth = "10rem";

  return (
    <div
      //@ts-ignore: Necessary to use `use:sortable`.
      // Without ts-ignore the `use:sortable` dosen't work.
      use:sortable
      class="sortable"
      classList={{ "opacity-25": sortable.isActiveDraggable }}
      style={{ "padding-top": "0.5rem", width: "100%", "row-gap": "0" }}
    >
      <Tabs.Trigger
        id={props.tabId}
        value={props.tabId}
        width="15rem"
        borderBottomWidth={props.isTabFocus ? "2px" : "0px"}
        borderBottomColor="accent.10"
        gap="0"
      >
        <Editable.Root
          id="editable_component"
          defaultValue={props.tabName}
          activationMode="dblclick"
          onValueCommit={(tabName) => {
            props.onTabNameChange?.(tabName.value);
          }}
          width="13rem"
        >
          <Editable.Area width="13rem" paddingLeft="0.5rem">
            <Editable.Input width={editableAreaWidth} />
            <Editable.Preview
              style={{
                "white-space": "nowrap",
                "text-overflow": "ellipsis",
                display: "block",
                overflow: "hidden",
                "text-align": "left",
                width: "13rem",
              }}
            />
          </Editable.Area>
        </Editable.Root>
        <Stack direction="row-reverse">
          <IconButton
            variant="ghost"
            size="sm"
            onClick={() => {
              props.onDeleteButtonClick?.(props.tabId);
            }}
            borderRadius="3rem"
          >
            <IconX />
          </IconButton>
        </Stack>
      </Tabs.Trigger>
    </div>
  );
};

export type drggableTabListProps = {
  tabIds: string[];
  tabNames: string[];
  filePath: string[];
  focusedId: string;
  onTabFocus?: (tabId: string) => void;
  onTabNameChange?: (changedTabName: string, changedTabId: string) => void;
  onDeleteTab?: (deletedTabId: string, deleteTabIndex: number) => void;
  onReorderTab?: (tabIds: string[]) => void;
  onDragStart?: (dragStatus: boolean) => void;
};

export const DraggableTabList = (props: drggableTabListProps) => {
  const [reorderTabIds, setReorderTabIds] = createSignal<string[]>([
    ...props.tabIds,
  ]);
  // This signal is for show tab is selected while dragging tab.
  // When change focusing at drag start, the drag event dosen't activate.
  // To display in UI that tab is dragging, this signal is necessary.
  const [currentDraggingTabId, setCurrentDraggingTabId] = createSignal<
    string | null
  >(null);
  const ids = () => reorderTabIds();

  //@ts-ignore: ts-ignore is necessary to use `onDragStart` event.
  // Without ts-ignore the drag event from `solid-dnd` dependency dosen't work.
  const onDragStart = ({ draggable }) => {
    setCurrentDraggingTabId(draggable.id);
    props.onDragStart?.(true);
  };

  //@ts-ignore: ts-ignore is necessary to use `onDragEnd` event.
  // Without ts-ignore the drag event from `solid-dnd` dependency dosen't work.
  const onDragEnd = ({ draggable, droppable }) => {
    if (draggable && droppable) {
      const currentItems = ids();
      const fromIndex = currentItems.indexOf(draggable.id);
      const toIndex = currentItems.indexOf(droppable.id);
      if (fromIndex !== toIndex) {
        const updatedItems = currentItems.slice();
        updatedItems.splice(toIndex, 0, ...updatedItems.splice(fromIndex, 1));
        setReorderTabIds(updatedItems);
        props.onReorderTab?.(reorderTabIds());
      }
    }

    props.onTabFocus?.(currentDraggingTabId()!);
    setCurrentDraggingTabId(null);
    props.onDragStart?.(false);
  };

  return (
    <DragDropProvider
      onDragStart={onDragStart}
      //@ts-ignore: Necessary to use `onDragEnd` event.
      // Without ts-ignore the drag event from `solid-dnd` dependency dosen't work.
      onDragEnd={onDragEnd}
      collisionDetector={closestCenter}
    >
      <DragDropSensors />
      <Stack direction="row" rowGap="0">
        <SortableProvider ids={ids()}>
          <For each={reorderTabIds()}>
            {(item, index) => (
              <Tooltip.Root>
                <Tooltip.Trigger>
                  <DraggableTabTrigger
                    tabId={item}
                    tabName={props.tabNames[index()].length === 0
                      ? JSON.stringify(
                        props.filePath[index()].match(/[^?!//]+$/!),
                      ).slice(2, -2)
                      : props.tabNames[index()]}
                    isTabFocus={currentDraggingTabId()
                      ? currentDraggingTabId() === item
                      : props.focusedId === item}
                    onTabNameChange={(changedTabName) => {
                      props.onTabNameChange?.(changedTabName, item);
                    }}
                    onDeleteButtonClick={(deleteTabId) => {
                      const deletedTabIndex = props.tabIds.indexOf(deleteTabId);
                      props.onDeleteTab?.(deleteTabId, deletedTabIndex);
                    }}
                  />
                </Tooltip.Trigger>
                <Portal>
                  <Tooltip.Positioner>
                    <Tooltip.Content backgroundColor="bg.default">
                      <Text color="fg.default">
                        {props.tabNames[index()].length === 0
                          ? JSON.stringify(
                            props.filePath[index()].match(/[^?!//]+$/!),
                          ).slice(2, -2)
                          : props.tabNames[index()]}
                      </Text>
                    </Tooltip.Content>
                  </Tooltip.Positioner>
                </Portal>
              </Tooltip.Root>
            )}
          </For>
        </SortableProvider>
      </Stack>
      <DragOverlay>
        <Stack
          borderBottomWidth="3px"
          borderBottomColor="accent.9"
          class="sortable"
          padding="0.5rem"
          background="bg.default"
        >
          <Text
            fontWeight="bold"
            style={{
              "white-space": "nowrap",
              "text-overflow": "ellipsis",
              display: "block",
              overflow: "hidden",
              "text-align": "left",
              width: "13rem",
            }}
          >
            {props.tabNames[
                currentDraggingTabId()
                  ? props.tabIds.indexOf(currentDraggingTabId()!)
                  : props.tabIds.indexOf(props.focusedId)
              ].length === 0
              ? JSON.stringify(
                props.filePath[
                  currentDraggingTabId()
                    ? props.tabIds.indexOf(currentDraggingTabId()!)
                    : props.tabIds.indexOf(props.focusedId)
                ].match(/[^?!//]+$/!),
              ).slice(2, -2)
              : props.tabNames[
                currentDraggingTabId()
                  ? props.tabIds.indexOf(currentDraggingTabId()!)
                  : props.tabIds.indexOf(props.focusedId)
              ]}
          </Text>
        </Stack>
      </DragOverlay>
    </DragDropProvider>
  );
};
