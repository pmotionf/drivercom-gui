import { createSignal, For } from "solid-js";
import { Tabs } from "~/components/ui/tabs";
import { LoggingTab } from "./Logging/LoggingTab";
import { CreateTabButton } from "./Logging/CreateTabButton";
import { TabEditable } from "./Logging/TabEditable";
import { Stack } from "styled-system/jsx";
import { IconButton } from "~/components/ui/icon-button";
import { IconX } from "@tabler/icons-solidjs";

function Logging() {
  // Reorder tab
  const [draggedTabIndex, setDraggedTabIndex] = createSignal<number | null>(
    null,
  );

  // Reorder tab by dragging
  const handleDragOver = (e: DragEvent, index: number) => {
    e.preventDefault();
    if (draggedTabIndex() !== null && draggedTabIndex() !== index) {
      const updateTab = [...tabList()];
      const [draggedTab] = updateTab.splice(draggedTabIndex()!, 1);
      updateTab.splice(index, 0, draggedTab);
      setTabList(updateTab);
      setDraggedTabIndex(index);
    }
  };

  // Drag Scroll this need to be deleted
  const [isDragScrolling, setIsDragScrolling] = createSignal(false);
  // Mouse X coordinate on screen.
  const [clientX, setClientX] = createSignal<number | null>(null);
  // Tab X coordinate relative to start of tab list, can extend beyond screen.
  const [prevPositionX, setPrevPositionX] = createSignal<number>(0);
  let scrollContainer: HTMLDivElement | undefined;

  // Handles scrolling tab list during drag/reorder.
  const dragOverScroll = (e: MouseEvent) => {
    if (!isDragScrolling() || !scrollContainer || !clientX()) return;

    const movement = (e.clientX - clientX()! + prevPositionX()) * 0.05;
    scrollContainer.scrollBy({ left: movement });
  };

  // Scrolls tab list to the end.
  const scrollToEnd = () => {
    if (!scrollContainer) return;
    if (scrollContainer.offsetWidth !== scrollContainer.scrollWidth) {
      scrollContainer.scrollTo(scrollContainer.scrollWidth, 0);
    }
  };

  const mouseWheelHandler = (e: WheelEvent) => {
    if (!scrollContainer || isDragScrolling()) return;

    e.preventDefault;
    scrollContainer.scrollLeft += e.deltaY;
  };

  // Active tab ID
  const [tabValue, setTabValue] = createSignal<string>("");
  const [tabList, setTabList] = createSignal([] as string[]);

  function deleteTab(index: number) {
    const contextIndex = index === 0 ? 1 : index - 1;
    const newValue = tabValue() === tabList()[index]
      ? tabList()[contextIndex]
      : tabValue();

    setTimeout(() => {
      setTabValue(newValue);
    }, 0);
    setTabList((prev) => {
      const updateTabCtx = prev.filter((_, i) => i !== index);
      return updateTabCtx;
    });
  }

  // Load File
  const [file, setFile] = createSignal("");
  // Active tab name
  const [tabName, setTabName] = createSignal("");

  return (
    <>
      <Tabs.Root
        value={tabValue()}
        onValueChange={(e) => setTabValue(e.value)}
        width="100%"
        height="100%"
      >
        <Tabs.List
          ref={scrollContainer}
          style={{
            background: "--colors-bg-muted",
            "padding-top": "0.5rem",
            height: "3rem",
          }}
          gap="0"
          onWheel={(e) => mouseWheelHandler(e)}
        >
          <For each={tabList()}>
            {(ctx, index) => (
              <Tabs.Trigger
                value={ctx}
                draggable
                onDragStart={(e) => {
                  setDraggedTabIndex(index());
                  setTabValue(ctx);
                  setPrevPositionX(e.currentTarget.scrollLeft);
                  setClientX(e.clientX);
                  setIsDragScrolling(true);
                }}
                onDragOver={(e) => {
                  handleDragOver(e, index());
                  dragOverScroll(e);
                }}
                onDrop={() => {
                  setDraggedTabIndex(null);
                  setClientX(null);
                  setIsDragScrolling(false);
                }}
                style={{ "padding-right": "0" }}
              >
                <Stack direction="row">
                  <TabEditable
                    tabName={tabName()}
                  />
                  <IconButton
                    onClick={() => deleteTab(index())}
                    variant="ghost"
                    size="xs"
                    width="1rem"
                    borderRadius="1rem"
                  >
                    <IconX />
                  </IconButton>
                </Stack>
              </Tabs.Trigger>
            )}
          </For>
          <CreateTabButton
            onCreateTabValue={(tabId, file, name) => {
              setFile(file);
              setTabName(name);
              setTabList((prev) => {
                return [...prev, tabId];
              });
              setTabValue(tabId);
              scrollToEnd();
            }}
          />
          <Tabs.Indicator />
        </Tabs.List>
        <For each={tabList()}>
          {(tabId) => (
            <Tabs.Content
              value={tabId}
              height={"100%"}
              style={{ "overflow-y": "auto" }}
            >
              <LoggingTab
                tabId={tabId}
                file={file()}
              />
            </Tabs.Content>
          )}
        </For>
      </Tabs.Root>
    </>
  );
}

export default Logging;
