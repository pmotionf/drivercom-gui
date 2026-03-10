import { JSX } from "solid-js";
import { Dynamic, For, Portal } from "solid-js/web";
import { Tabs } from "~/components/ui/tabs.tsx";
import { IconButton } from "~/components/ui/icon-button.tsx";
import { IconPlus, IconX } from "@tabler/icons-solidjs";
import { createSignal } from "solid-js";
import { Editable } from "../ui/editable.tsx";
import { Show } from "solid-js/web";
import { createDraggable } from "@neodrag/solid";
//@ts-ignore Has an Any type error
import { Stack } from "styled-system/jsx/stack.mjs";
import { createEffect } from "solid-js";
import { Text } from "../ui/text.tsx";
import { tabStore } from "~/store/GlobalState.ts";
import { TabContext } from "./TabList.tsx";
import JSON5 from "json5";
import { css } from "styled-system/css/css";

export type TabType = {
  id: string;
  tabName: string;
};

export type TabProps = JSX.HTMLAttributes<HTMLDivElement> & {
  key: string;
  onTabDragging?: (clientX: number, clientY: number, tabId: string) => void;
  onTabDragEnd?: (
    clientX: number,
    clientY: number,
    tabId: string,
    tabIndex: number,
  ) => void;
  onTabDragCancel?: (tabId: string) => void;
  onCreateTab?: () => void;
  onDeleteTab?: (index: number) => void;
};

export function Tab(props: TabProps) {
  if (!tabStore.get(props.key)) return;

  const getTabContexts = (): TabContext[] => {
    return tabStore.get(props.key)![0].tabContext!;
  };

  const getFocusTabId = () => {
    return tabStore.get(props.key)![0].focusedTab;
  };

  const setTabName = (tabIndex: number, newName: string) => {
    return tabStore.get(props.key)?.[1](
      "tabContext",
      tabIndex,
      "tab",
      "tabName",
      newName,
    );
  };

  const setTabContext = (newContext: TabContext[]) => {
    return tabStore.get(props.key)?.[1]("tabContext", newContext);
  };

  const isConfigChange = (index: number): boolean => {
    const getTabContext = getTabContexts()[index];
    if (
      !getTabContext.tabPage ||
      !getTabContext.tabPage.configTabPage ||
      !getTabContext.tabPage.configTabPage.originalFile ||
      !getTabContext.tabPage.configTabPage.configForm
    )
      return false;
    return (
      JSON5.stringify(getTabContext.tabPage.configTabPage.configForm) !==
      JSON5.stringify(getTabContext.tabPage.configTabPage.originalFile)
    );
  };

  //@ts-ignore This draggable is needed to use neo-drag.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
    tabContext: TabContext[],
  ): TabContext[] => {
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
    const focusedTab = getFocusTabId();
    if (!focusedTab) return;
    const currentTabTrigger = document.getElementById(focusedTab);
    if (scrollContainer && currentTabTrigger) {
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

  return (
    <Tabs.List
      height="2rem"
      gap="0"
      width={`100%`}
      background={"bg.muted"}
      style={{ padding: "0" }}
      onKeyUp={(e) => {
        if (e.key === "Escape") {
          if (currentDraggingTabId()) {
            props.onTabDragCancel?.(currentDraggingTabId());
          }
        }
      }}
    >
      <div
        class={css({
          _scrollbar: { height: "0px" },
          width: `calc(100% - 2rem)`,
          display: "flex",
          overflowY: "hidden",
          overflowX: "auto",
          borderInlineEndWidth: "1px",
          borderInlineColor: "bg.disabled",
        })}
        ref={scrollContainer}
      >
        <For each={getTabContexts()}>
          {(tabCtx, tabIndex) => {
            return (
              <div
                id={`${tabCtx.tab.id}`}
                style={{
                  opacity:
                    currentDraggingTabId() === tabCtx.tab.id ? "0%" : "100%",
                  position: "relative",
                  "z-index":
                    tabCtx.tab.id === currentDraggingTabId() ? "0" : "10",
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
                    setCurrentDraggingTabId(tabCtx.tab.id);
                    setMousePositionInsideComponent({
                      x: data.event.offsetX,
                      y: data.event.offsetY,
                    });
                  },
                  onDrag: (data) => {
                    dragOverScroll(data.offsetX, scrollContainer);
                    setCurrentDraggingTabId(currentDraggingTabId()!);

                    setCurrentMousePointerPosition(() => {
                      return {
                        x:
                          data.event.clientX - mousePositionInsideComponent().x,
                        y:
                          data.event.clientY - mousePositionInsideComponent().y,
                      };
                    });

                    props.onTabDragging?.(
                      data.event.clientX,
                      data.event.clientY,
                      tabCtx.tab.id,
                    );
                  },
                  onDragEnd: (data) => {
                    if (reorderTabIndex() !== null) {
                      const updatedItems = reorderTabsOnDragEnd(
                        tabIndex(),
                        reorderTabIndex()!,
                        getTabContexts(),
                      );
                      setTabContext(updatedItems);
                    }

                    props.onTabDragEnd?.(
                      data.event.clientX,
                      data.event.clientY,
                      tabCtx.tab.id,
                      tabIndex(),
                    );
                    setReorderTabIndex(null);
                    setCurrentDraggingTabId("");
                  },
                }}
              >
                <Tabs.Trigger
                  value={tabCtx.tab.id}
                  paddingRight="0rem"
                  paddingLeft="0.5rem"
                  height="100%"
                  alignContent={"center"}
                  alignItems={"centerx"}
                  paddingTop={"0.5em"}
                  borderWidth={
                    tabIndex() === getTabContexts().length - 1
                      ? "0px"
                      : "0px 1px 0px 0px"
                  }
                  borderColor={"bg.disabled"}
                  _selected={{
                    background: "bg.default",
                  }}
                  margin="0"
                  gap="0.2em"
                >
                  <Stack
                    style={{
                      width: "0.8em",
                      height: "0.5em",
                      "border-radius": "1em",
                    }}
                    opacity={isConfigChange(tabIndex()) ? 1 : 0}
                    background="accent.7"
                  />
                  <Editable.Root
                    fontSize={"sm"}
                    fontWeight={"medium"}
                    value={tabCtx.tab.tabName}
                    activationMode="dblclick"
                    onValueChange={(editableDetails) => {
                      setTabName(tabIndex(), editableDetails.value);
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
                      size="xs"
                      onClick={() => {
                        props.onDeleteTab?.(tabIndex());
                      }}
                      borderRadius={"3em"}
                    >
                      <Dynamic
                        style={{ width: "0.8rem", height: "0.8rem" }}
                        component={IconX}
                      />
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
                  {currentDraggingTabId() === tabCtx.tab.id && (
                    <Stack
                      direction="row"
                      background={"bg.default"}
                      style={{
                        position: "absolute",
                        top: `${currentMousePointerPosition().y}px`,
                        left: `${currentMousePointerPosition().x}px`,
                        "padding-left": "0.5rem",
                        "pointer-events": "none",
                        "z-index": "15",
                        height: "2rem",
                        "align-items": "center",
                      }}
                    >
                      <Text
                        fontWeight="medium"
                        color="fg.default"
                        whiteSpace="nowrap"
                        fontSize={"sm"}
                      >
                        {tabCtx.tab.tabName}
                      </Text>
                      <IconButton variant="ghost" size="xs" borderRadius="3rem">
                        <Dynamic
                          style={{ width: "0.8rem", height: "0.8rem" }}
                          component={IconX}
                        />
                      </IconButton>
                    </Stack>
                  )}
                </Portal>
              </div>
            );
          }}
        </For>
      </div>

      <IconButton
        variant="ghost"
        borderRadius="3rem"
        size="xs"
        onClick={() => {
          props.onCreateTab?.();
        }}
      >
        <Dynamic
          style={{ width: "0.8rem", height: "0.8rem" }}
          component={IconPlus}
        />
      </IconButton>
    </Tabs.List>
  );
}
