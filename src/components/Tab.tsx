import { JSX } from "solid-js";
import { For, Portal } from "solid-js/web";
import { Tabs } from "~/components/ui/tabs.tsx";
import { IconButton } from "~/components/ui/icon-button.tsx";
import { IconPlus, IconX } from "@tabler/icons-solidjs";
import { createSignal } from "solid-js";
import { Editable } from "./ui/editable.tsx";
import { Show } from "solid-js/web";
import { createDraggable } from "@neodrag/solid";
import { Stack } from "styled-system/jsx/index.mjs";
import { createEffect } from "solid-js";
import { Text } from "./ui/text.tsx";
import { tabContext } from "./TabList.tsx";

export type tabProps = JSX.HTMLAttributes<HTMLDivElement> & {
  tabContext: tabContext[];
  focusedTab: string;
  onRefresh?: () => void;
  onCreateTab?: () => void;
  onDeleteTab?: (index: number) => void;
  onFocusTabChange?: (tabId: string) => void;
  onTabReorder?: (updateTabList: tabContext[]) => void;
  onTabNameChange?: (tabIndex: number, changedName: string) => void;
  onTabDragging?: (clientX: number, clientY: number, tabId: string) => void;
};

export function Tab(props: tabProps) {
  //@ts-ignore This draggable is needed to use neo-drag.
  // deno-lint-ignore no-unused-vars
  const { draggable: dragOptions } = createDraggable();
  //reorder
  const [currentDraggingTabId, setCurrentDraggingTabId] =
    createSignal<string>("");
  const [reorderTabIndex, setReorderTabIndex] = createSignal<number | null>(
    null,
  );

  const reorderTabsOnDragEnd = (
    currentTabIndex: number,
    reorderIndex: number,
    tabContext: tabContext[],
  ): tabContext[] => {
    const fromIndex = currentTabIndex;
    const nextIndex = reorderIndex;

    if (fromIndex !== nextIndex) {
      const updatedItems = tabContext.slice();
      updatedItems.splice(nextIndex, 0, ...updatedItems.splice(fromIndex, 1));
      return updatedItems;
    }
    return tabContext;
  };

  let scrollContainer: HTMLDivElement | undefined;

  const mouseWheelHandler = (
    e: WheelEvent,
    scrollContainer: HTMLDivElement | undefined,
  ) => {
    e.preventDefault();
    if (!scrollContainer) return;
    scrollContainer.scrollLeft += e.deltaY;
  };

  const dragOverScroll = (
    offsetX: number,
    scrollContainer: HTMLDivElement | undefined,
  ) => {
    if (!scrollContainer) return;
    const movement = offsetX * 0.05;
    scrollContainer.scrollBy({ left: movement });
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

  //parsing
  const parseTabName = (tabName: string, filePath: string): string => {
    if (tabName.length === 0) {
      return JSON.stringify(filePath.match(/[^?!//]+$/!)).slice(2, -2);
    } else return tabName;
  };

  return (
    <div>
      <Tabs.List
        height="3rem"
        gap="0"
        width="100%"
        ref={scrollContainer}
        style={{ "overflow-y": "hidden", "overflow-x": "auto" }}
      >
        <For each={props.tabContext}>
          {(tab, tabIndex) => {
            //const tabId = tab["id" as keyof typeof tab];
            //const tabName = tab["tabName" as keyof typeof tab];
            //const filePath = tab["filePath" as keyof typeof tab];
            return (
              <div
                id={`${tab.id}`}
                style={{
                  opacity: currentDraggingTabId() === tab.id ? "0%" : "100%",
                  position: "relative",
                  "z-index": tab.id === currentDraggingTabId() ? "0" : "10",
                }}
                onWheel={(e) => mouseWheelHandler(e, scrollContainer)}
                onMouseEnter={() => {
                  if (currentDraggingTabId()) {
                    setReorderTabIndex(tabIndex());
                  }
                }}
                onMouseLeave={() => setReorderTabIndex(null)}
                use:dragOptions={{
                  cancel: ".cancel",
                  bounds: "parent",
                  onDragStart: (data) => {
                    setCurrentDraggingTabId(tab.id);
                    setMousePositionInsideComponent({
                      x: data.event.offsetX,
                      y: data.event.offsetY,
                    });
                  },
                  onDrag: (data) => {
                    dragOverScroll(data.offsetX, scrollContainer);
                    setCurrentDraggingTabId(currentDraggingTabId()!);

                    const collapsedSideBarWidth = document.getElementById(
                      "radio-group:collapsed_side_bar",
                    )!.offsetWidth;
                    setCurrentMousePointerPosition(() => {
                      return {
                        x:
                          data.event.clientX -
                          mousePositionInsideComponent().x -
                          collapsedSideBarWidth,
                        y:
                          data.event.clientY - mousePositionInsideComponent().y,
                      };
                    });

                    props.onTabDragging?.(
                      data.event.clientX,
                      data.event.clientY,
                      tab.id,
                    );
                  },
                  onDragEnd: (data) => {
                    if (reorderTabIndex() !== null) {
                      const updatedItems = reorderTabsOnDragEnd(
                        tabIndex(),
                        reorderTabIndex()!,
                        props.tabContext,
                      );
                      props.onTabReorder?.(updatedItems);
                    }

                    props.onRefresh?.();
                    props.onFocusTabChange?.(currentDraggingTabId()!);
                    setReorderTabIndex(null);
                    setCurrentDraggingTabId("");
                  },
                }}
              >
                <Tabs.Trigger
                  value={tab.id}
                  paddingRight="0rem"
                  paddingLeft="0.5rem"
                  borderBottomWidth={
                    currentDraggingTabId().length > 0
                      ? currentDraggingTabId() === tab.id
                        ? "3px"
                        : "0px"
                      : props.focusedTab === tab.id
                        ? "3px"
                        : "0px"
                  }
                  marginTop={
                    currentDraggingTabId().length > 0
                      ? currentDraggingTabId() === tab.id
                        ? `calc(0.5rem + 1px)`
                        : "0.5rem"
                      : props.focusedTab === tab.id
                        ? `calc(0.5rem + 1px)`
                        : `0.5rem`
                  }
                  borderBottomColor="accent.emphasized"
                >
                  <Editable.Root
                    defaultValue={parseTabName(
                      tab.tabName ? tab.tabName : "",
                      tab.filePath ? tab.filePath : "",
                    )}
                    activationMode="dblclick"
                    onValueCommit={(editableDetails: { value: string }) => {
                      props.onTabNameChange?.(
                        tabIndex(),
                        editableDetails.value,
                      );
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
                        props.onDeleteTab?.(tabIndex());
                      }}
                      borderRadius="3rem"
                    >
                      <IconX />
                    </IconButton>
                  </div>
                </Tabs.Trigger>
                <Show
                  when={
                    reorderTabIndex() === tabIndex() &&
                    currentDraggingTabId().length > 0
                  }
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
                <Portal>
                  {currentDraggingTabId() === tab.id && (
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
                        {parseTabName(
                          tab.tabName ? tab.tabName : "",
                          tab.filePath ? tab.filePath : "",
                        )}
                      </Text>
                      <IconButton variant="ghost" size="sm" borderRadius="3rem">
                        <IconX />
                      </IconButton>
                    </Stack>
                  )}
                </Portal>
              </div>
            );
          }}
        </For>
        <IconButton
          variant="ghost"
          borderRadius="3rem"
          onClick={() => {
            props.onCreateTab?.();
          }}
          marginTop="0.2rem"
        >
          <IconPlus />
        </IconButton>
      </Tabs.List>
    </div>
  );
}
