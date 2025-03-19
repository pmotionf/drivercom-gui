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
  SortableProvider,
} from "@thisbeyond/solid-dnd";
import { Stack } from "styled-system/jsx";

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
  let scrollContainer: HTMLDivElement | undefined;

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
            gap="0"
            onWheel={(e) => mouseWheelHandler(e)}
            onDrop={() => {
              props.onTabDrop?.();
              props.onTabContextDrag?.(false);
            }}
            width="100%"
            marginRight="0"
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
            />
            <IconButton
              variant="ghost"
              onClick={() => props.onCreateTab?.()}
              borderRadius="3rem"
              marginTop="0.2rem"
            >
              <IconPlus />
            </IconButton>
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

export type DraggbleTabTriggerProps = {
  item: string;
  tabName: string;
  focus: boolean;
  onTabNameChange?: (changedTabName: string) => void;
  onDeleteButtonClick?: (deleteTabId: string) => void;
};

const DraggableTabTrigger = (props: DraggbleTabTriggerProps) => {
  const sortable = createSortable(props.item);
  const editableAreaWidth = "10rem";

  return (
    <div
      //@ts-ignore: Necessary to use `use:sortable`
      use:sortable
      class="sortable"
      classList={{ "opacity-25": sortable.isActiveDraggable }}
      style={{ "padding-top": "0.5rem", width: "100%" }}
    >
      <Tabs.Trigger
        id={props.item}
        value={props.item}
        borderBottomWidth={props.focus ? "2px" : "0px"}
        borderBottomColor="accent.10"
      >
        <Editable.Root
          id="editable_component"
          defaultValue={props.tabName}
          activationMode="dblclick"
          onValueCommit={(tabName) => {
            props.onTabNameChange?.(tabName.value);
          }}
        >
          <Editable.Area>
            <Editable.Input width={editableAreaWidth} />
            <Editable.Preview width={editableAreaWidth} />
          </Editable.Area>
        </Editable.Root>
        <IconButton
          variant="ghost"
          size="sm"
          onClick={() => {
            props.onDeleteButtonClick?.(props.item);
          }}
          borderRadius="3rem"
        >
          <IconX />
        </IconButton>
      </Tabs.Trigger>
    </div>
  );
};

export type drggableTabListProps = {
  tabIds: string[];
  tabNames: string[];
  filePath: string[];
  focusedId: string;
  onDragFocusedId?: (tabId: string) => void;
  onTabNameChange?: (changedTabName: string, changedTabId: string) => void;
  onDeleteTab?: (deletedTabId: string, deleteTabIndex: number) => void;
  onReorderTab?: (tabIds: string[]) => void;
};

export const DraggableTabList = (props: drggableTabListProps) => {
  const [items, setItems] = createSignal<string[]>([...props.tabIds]);
  const [activeItem, setActiveItem] = createSignal(null);
  const ids = () => items();

  //@ts-ignore: ts-ignore is necessary to use onDragStart event.
  const onDragStart = ({ draggable }) => setActiveItem(draggable.id);

  //@ts-ignore: ts-ignore is necessary to use onDragEnd event.
  const onDragEnd = ({ draggable, droppable }) => {
    if (draggable && droppable) {
      const currentItems = ids();
      const fromIndex = currentItems.indexOf(draggable.id);
      const toIndex = currentItems.indexOf(droppable.id);
      if (fromIndex !== toIndex) {
        const updatedItems = currentItems.slice();
        updatedItems.splice(toIndex, 0, ...updatedItems.splice(fromIndex, 1));
        setItems(updatedItems);
        props.onReorderTab?.(items());
      }
    }
    setActiveItem(null);
  };

  createEffect(() => {
    if (activeItem() === null) return;
    props.onDragFocusedId?.(activeItem()!);
  });

  return (
    <DragDropProvider
      onDragStart={onDragStart}
      //@ts-ignore: For testing solid js dnd
      onDragEnd={onDragEnd}
      collisionDetector={closestCenter}
    >
      <DragDropSensors />
      <Stack direction="row">
        <SortableProvider ids={ids()}>
          <For each={items()}>
            {(item, index) => (
              <DraggableTabTrigger
                item={item}
                tabName={props.tabNames[index()].length === 0
                  ? JSON.stringify(
                    props.filePath[index()].match(/[^?!//]+$/!),
                  ).slice(2, -2) /*change to tabname*/
                  : props.tabNames[index()]}
                focus={item === props.focusedId}
                onTabNameChange={(changedTabName) => {
                  props.onTabNameChange?.(changedTabName, item);
                }}
                onDeleteButtonClick={(deleteTabId) => {
                  const deletedTabIndex = props.tabIds.indexOf(deleteTabId);
                  props.onDeleteTab?.(deleteTabId, deletedTabIndex);
                }}
              />
            )}
          </For>
        </SortableProvider>
      </Stack>
    </DragDropProvider>
  );
};
