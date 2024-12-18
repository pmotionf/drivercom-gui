import { createSignal, For, Show } from "solid-js";
import { inferSchema, initParser } from "udsv";
import {
  type FileUploadFileAcceptDetails,
  FileUploadTrigger,
} from "@ark-ui/solid";
import { FileUpload } from "~/components/ui/file-upload";
import { Toast } from "~/components/ui/toast";
import { Tabs } from "~/components/ui/tabs";
import { IconButton } from "~/components/ui/icon-button";
import { LoggingTab, LoggingTabProps } from "./Logging/LoggingTab";
import { IconPlus, IconX } from "@tabler/icons-solidjs";
import { Editable } from "~/components/ui/editable";
import { Stack } from "styled-system/jsx";

function Logging() {
  const toaster = Toast.createToaster({
    placement: "top-end",
    gap: 24,
  });

  // Reorder tab
  const [draggedTabIndex, setDraggedTabIndex] = createSignal<number | null>(
    null,
  );

  const handleDragOver = (e: DragEvent, index: number) => {
    e.preventDefault();
    if (draggedTabIndex() !== null && draggedTabIndex() !== index) {
      const updateTab = [...tabContext()];
      const [draggedTab] = updateTab.splice(draggedTabIndex()!, 1);
      updateTab.splice(index, 0, draggedTab);
      setTabContext(updateTab);
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

  const [tabId, setTabId] = createSignal(0);
  const [tabValue, setTabValue] = createSignal<string>("");
  const [tabContext, setTabContext] = createSignal<LoggingTabProps[]>([]);

  function createTab(
    fileName: string,
    plotHeader: string[],
    plotSeries: number[][],
    plotSplitIndex: number[][],
  ) {
    setTabId(tabId() + 1);
    setTabContext((prev) => {
      const updateTabCtx = [...prev, {
        tabId: tabId().toString(),
        logName: fileName,
        header: plotHeader,
        series: plotSeries,
        splitIndex: plotSplitIndex,
      }];
      return updateTabCtx;
    });
    setTabValue(tabId().toString());
    setTimeout(() => {
      scrollToRight();
    }, 10);
  }

  function deleteTab(index: number) {
    const contextIndex = index === 0 ? 1 : index - 1;
    const newValue = tabValue() === tabContext()[index].tabId
      ? tabContext()[contextIndex].tabId
      : tabValue();

    setTimeout(() => {
      setTabValue(newValue);
    }, 0);
    setTabContext((prev) => {
      const updateTabCtx = [...prev];
      updateTabCtx.splice(index, 1);
      return updateTabCtx;
    });
  }

  function updateLogName(index: number, value: string) {
    setTabContext((prev) => {
      const updateTabCtx = [...prev];
      updateTabCtx[index].logName = value;
      return updateTabCtx;
    });
  }

  // Load File
  function loadLog(details: FileUploadFileAcceptDetails) {
    if (details.files.length == 0) return;
    const file = details.files[0];
    const reader = new FileReader();

    reader.onload = () => {
      const csv_str: string = (reader.result! as string).trim();
      const rows = csv_str.split("\n");
      if (rows.length < 2) {
        toaster.create({
          title: "Invalid Log File",
          description: "Not enough rows.",
          type: "error",
        });
        return;
      }

      const schema = inferSchema(csv_str);
      const parser = initParser(schema);
      const local_header = rows[0].replace(/,\s*$/, "").split(",");
      const data = parser.typedCols(csv_str).map((row) =>
        row.map((val) => {
          if (typeof val === "boolean") return val ? 1 : 0;
          return val;
        })
      );
      if (data.length < local_header.length) {
        toaster.create({
          title: "Invalid Log File",
          description:
            `Data has ${data.length} columns, while header has ${local_header.length} labels.`,
          type: "error",
        });
        return;
      }

      const indexArray = Array.from(
        { length: local_header.length },
        (_, index) => index,
      );

      createTab(file.name, local_header, data.slice(0, local_header.length), [
        indexArray,
      ]);
    };

    reader.onerror = () => {
      toaster.create({
        title: "Log File Loading Failed",
        description: `${reader.error!.name}: ${reader.error!.message}`,
        type: "error",
      });
    };
    reader.readAsText(file);
  }

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
          <For each={tabContext()}>
            {(ctx, index) => (
              <Tabs.Trigger
                value={ctx.tabId}
                title={ctx.logName}
                draggable
                onDragStart={(e) => {
                  setDraggedTabIndex(index());
                  setTabValue(ctx.tabId);
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
                <Editable.Root
                  defaultValue={ctx.logName}
                  activationMode="dblclick"
                  onValueChange={(e) => updateLogName(index(), e.value)}
                  paddingTop="0.1rem"
                >
                  <Stack direction={"row"}>
                    <Editable.Area>
                      <Editable.Input />
                      <Editable.Preview />
                    </Editable.Area>
                    <Editable.Context>
                      {(editable) => (
                        <Editable.Control>
                          <Show
                            when={editable().editing}
                            fallback={
                              <IconButton
                                variant="ghost"
                                size={"xs"}
                                onClick={() => {
                                  deleteTab(index());
                                }}
                                borderRadius="1rem"
                              >
                                <IconX />
                              </IconButton>
                            }
                          >
                            <>
                              <Editable.CancelTrigger
                                asChild={(triggerProps) => (
                                  <IconButton
                                    {...triggerProps()}
                                    variant="ghost"
                                    size="xs"
                                    borderRadius="1rem"
                                  >
                                    <IconX />
                                  </IconButton>
                                )}
                              />
                            </>
                          </Show>
                        </Editable.Control>
                      )}
                    </Editable.Context>
                  </Stack>
                </Editable.Root>
              </Tabs.Trigger>
            )}
          </For>
          <Show when={tabContext.length !== 20}>
            <FileUpload.Root
              accept="text/csv"
              minFileSize={3}
              onFileAccept={loadLog}
              onFileReject={(details) => {
                if (details.files.length == 0) return;
                let description = "The provided log file is invalid:\n";
                for (let i = 0; i < details.files[0].errors.length; i++) {
                  if (description.slice(-1) !== "\n") {
                    description += ", ";
                  }
                  description += details.files[0].errors[i];
                }
                toaster.create({
                  title: "Invalid Log File",
                  description: description,
                  type: "error",
                });
              }}
            >
              <FileUploadTrigger
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
          </Show>
          <Tabs.Indicator />
        </Tabs.List>
        <For each={tabContext()}>
          {(ctx) => (
            <Tabs.Content
              value={ctx.tabId}
              height={"100%"}
              style={{ "overflow-y": "auto" }}
            >
              <LoggingTab
                tabId={ctx.tabId}
                header={ctx.header}
                logName={ctx.logName}
                series={ctx.series}
                splitIndex={ctx.splitIndex}
              />
            </Tabs.Content>
          )}
        </For>
      </Tabs.Root>
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
    </>
  );
}

export default Logging;
