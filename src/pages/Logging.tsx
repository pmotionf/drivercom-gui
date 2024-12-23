import { createSignal, For, Show } from "solid-js";
import { Tabs } from "~/components/ui/tabs";
import { LoggingTab } from "./Logging/LoggingTab";
import { CreateTabButton } from "./Logging/CreateTabButton";
import { TabEditable } from "./Logging/TabEditable";

function Logging() {
  // Reorder tab
  const [draggedTabIndex, setDraggedTabIndex] = createSignal<number | null>(
    null,
  );

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

  // Drag Scroll
  const [isDragScrolling, setIsDragScrolling] = createSignal(false);
  const [clientX, setClientX] = createSignal<number | null>(null);
  const [prevPositionX, setPrevPositionX] = createSignal<number>(0);
  let scrollContainer: HTMLDivElement | undefined;

  const mouseMoveHandler = (e: MouseEvent) => {
    if (!isDragScrolling() || !scrollContainer || !clientX()) return;

    const movement = clientX()! - e.clientX + prevPositionX();
    scrollContainer.scrollTo({ left: movement });
  };

  // Scroll the tab while reordering the tabs.
  const dragOverScroll = (e: MouseEvent) => {
    if (!isDragScrolling() || !scrollContainer || !clientX()) return;

    const movement = (e.clientX - clientX()! + prevPositionX()) * 0.05;
    scrollContainer.scrollBy({ left: movement });
  };

  const scrollToRight = () => {
    if (scrollContainer) {
      scrollContainer.scrollBy(1000, 0);
    }
  };

  const mouseWheelHandler = (e: WheelEvent) => {
    if (!scrollContainer || isDragScrolling()) return;

    e.preventDefault;
    scrollContainer.scrollLeft += e.deltaY;
  };

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
            "overflow-x": "auto",
          }}
          gap="0"
          onMouseDown={(e) => {
            setClientX(e.clientX);
            setIsDragScrolling(true);
            setPrevPositionX(e.currentTarget.scrollLeft);
          }}
          onMouseMove={(e) => mouseMoveHandler(e)}
          onMouseUp={() => {
            setIsDragScrolling(false);
            setClientX(null);
          }}
          onmouseleave={() => {
            setIsDragScrolling(false);
            setClientX(null);
          }}
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
                <TabEditable
                  tabName={tabName()}
                  onDelete={() => deleteTab(index())}
                />
              </Tabs.Trigger>
            )}
          </For>
          <Show when={tabList().length !== 20}>
            <CreateTabButton
              onCreateTabValue={(tabId, file, name) => {
                setFile(file);
                setTabName(name);
                setTabList((prev) => {
                  return [...prev, tabId];
                });
                setTabValue(tabId);
                scrollToRight();
              }}
            />
          </Show>
          <Tabs.Indicator />
        </Tabs.List>
        <For each={tabList()}>
          {(ctx) => (
            <Tabs.Content
              value={ctx}
              height={"100%"}
              style={{ "overflow-y": "auto" }}
            >
              <LoggingTab
                tabId={ctx}
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
