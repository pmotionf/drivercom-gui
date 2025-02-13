import { createEffect, createSignal, For, JSX } from "solid-js";
import { Tabs } from "~/components/ui/tabs";
import { LogViewerTabPageContent } from "./LogViewerTabPageContent";
import { IconButton } from "~/components/ui/icon-button";
import { IconPlus, IconX } from "@tabler/icons-solidjs";
import { Toast } from "~/components/ui/toast";
import { FileUploadFileChangeDetails } from "@ark-ui/solid";
import { Editable } from "~/components/ui/editable";
import { FileUpload } from "~/components/ui/file-upload";

export type LogViewerTabListProps = JSX.HTMLAttributes<HTMLDivElement> & {
    tabList? : string[],
    tabListPosition : string,
    onTabListChange? : (tabList: string[]) => void;
    onDraggedOut? : (isDraggedOut :  boolean) => void;
    onDraggedTabId? : (tabId: [string, string]) => void;
}

export function LogViewerTabList(props : LogViewerTabListProps) {
  // Reorder tab
  const [draggedTabIndex, setDraggedTabIndex] = createSignal<number | null>(
    null,
  );
  // The signal can know when tab delete button has pressed
  const [isDeleteButtonPressed, setIsDeleteButtonPressed] = createSignal<
    boolean
  >(
    false,
  );

  // Reorder tab by dragging
  const reorderTabsOnDragOver = (e: DragEvent, index: number) => {
    e.preventDefault();
    if (draggedTabIndex() !== null && draggedTabIndex() !== index) {
      const updateTab = [...tabIdList()];
      const [draggedTab] = updateTab.splice(draggedTabIndex()!, 1);
      updateTab.splice(index, 0, draggedTab);
      setTabIdList(updateTab);
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
  const [focusedTab, setFocusedTab] = createSignal<string>("");
  const [tabIdList, setTabIdList] = createSignal([] as string[]);
  if(props.tabList) setTabIdList(props.tabList)

  function deleteTab(index: number) {
    if (isEditMode()) return;
    const contextIndex = index === 0 ? 1 : index - 1;
    const newValue = focusedTab() === tabIdList()[index]
      ? tabIdList()[contextIndex]
      : focusedTab();

    setTimeout(() => {
      setFocusedTab(newValue);
    }, 0);
    setTabIdList((prev) => {
      const updateTabCtx = prev.filter((_, i) => i !== index);
      return updateTabCtx;
    });
  }

  // Every tablist value change send changed tab list data to parent component
  createEffect(() => {
    const tabList = tabIdList()
    props.onTabListChange?.(tabList)
  })

  let file: FileUploadFileChangeDetails;

  const toaster = Toast.createToaster({
    placement: "top-end",
    gap: 24,
  });

  // Check if the tab is editable and in edit mode to disable the delete button.
  const [isEditMode, setIsEditMode] = createSignal<boolean>(false);

  //const [dropIndex, setDropIndex] = createSignal<number | null>(0)

  return (
    <>
      <Toast.Toaster toaster={toaster}>
        {(toast) => (
          <Toast.Root>
            <Toast.Title>{toast().title}</Toast.Title>
            <Toast.Description>{toast().description}</Toast.Description>
            <Toast.CloseTrigger>
              <IconX />
            </Toast.CloseTrigger>
          </Toast.Root>
        )}
      </Toast.Toaster>
      <Tabs.Root
        value={focusedTab()}
        onValueChange={(e) => setFocusedTab(e.value)}
        width="100%"
        height="100%"
      >
        <Tabs.List
          ref={scrollContainer}
          style={{
            background: "--colors-bg-muted",
            height: "3rem",
            "padding-top": "0.5rem",
          }}
          gap="0"
          onWheel={(e) => mouseWheelHandler(e)}
          onDrop={(e) =>{ 
            const tabId = tabIdList()[draggedTabIndex()!]
            if (tabIdList().indexOf(tabId) !== -1){
              props.onDraggedOut?.(false)
              return;
            } 
            props.onDraggedOut?.(true)
          }
          }
        >
          <For each={tabIdList()}>
            {(tabId, index) => (
              <>
                <Tabs.Trigger
                  value={tabId}
                  draggable
                  onDragStart={(e) => {
                    if (isDeleteButtonPressed()!) {
                      setIsDeleteButtonPressed(false);
                      return;
                    }
                    setDraggedTabIndex(index());
                    setFocusedTab(tabId);
                    props.onDraggedTabId?.([tabId, props.tabListPosition]);
                    setPrevPositionX(e.currentTarget.scrollLeft);
                    setClientX(e.clientX);
                    setIsDragScrolling(true);
                  }}
                  onDragOver={(e) => {
                    reorderTabsOnDragOver(e, index());
                    dragOverScroll(e);
                  }}
                  onDragEnd={() => {
                    setClientX(null);
                    setIsDragScrolling(false);
                    setDraggedTabIndex(null);
                  }}
                  style={{ "padding-right": "0", "padding-top": "0.1rem" }}
                  height={"100%"}
                >
                  <Editable.Root
                    defaultValue={file.acceptedFiles[0].name /*tab name*/}
                    activationMode="dblclick"
                    onEditChange={() => setIsEditMode(!isEditMode())}
                  >
                    <Editable.Area>
                      <Editable.Input />
                      <Editable.Preview />
                    </Editable.Area>
                  </Editable.Root>
                  <IconButton
                    onClick={() => {
                      deleteTab(index());
                    }}
                    variant="ghost"
                    size="xs"
                    width="1rem"
                    borderRadius="1rem"
                    draggable
                    cursor={isDragScrolling() ? "not-allowed" : "auto"}
                    onDragStart={(e) => {
                      e.dataTransfer?.setDragImage(
                        document.createElement("img"),
                        0,
                        0,
                      );
                      setIsDeleteButtonPressed(true);
                    }}
                    onDragOver={() => {
                      return;
                    }}
                    disabled={isEditMode()}
                  >
                    <IconX />
                  </IconButton>
                </Tabs.Trigger>
              </>
            )}
          </For>
          <FileUpload.Root
            accept="text/csv"
            minFileSize={3}
            onFileChange={(details) => {
              file = details;
              const tabId = crypto.randomUUID();
              setTabIdList((prev) => {
                return [...prev, tabId];
              });
              setFocusedTab(tabId);
              scrollToEnd();
            }}
          >
            <FileUpload.Trigger
              asChild={(triggerProps) => (
                <IconButton
                  size={"xs"}
                  variant={"ghost"}
                  {...triggerProps()}
                  width={"1rem"}
                  borderRadius={"1rem"}
                >
                  <IconPlus />
                </IconButton>
              )}
            />
            <FileUpload.HiddenInput />
          </FileUpload.Root>
          <Tabs.Indicator />
        </Tabs.List>
        <For each={tabIdList()}>
          {(tabId, index) => (
            <Tabs.Content
              value={tabId}
              height={"100%"}
              style={{ "overflow-y": "auto" }}
            >
              <LogViewerTabPageContent
                tabId={tabId}
                details={file}
                onErrorMessage={(msg) => {
                  toaster.create(msg);
                  deleteTab(index());
                }}
              />
            </Tabs.Content>
          )}
        </For>
      </Tabs.Root>
    </>
  );
}
