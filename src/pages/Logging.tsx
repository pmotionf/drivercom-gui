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

  const [tabId, setTabId] = createSignal(0);
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
  }

  function deleteTab(index: number) {
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
        defaultValue={tabId().toString()} 
        width={"100%"}
        height= {"100%"}
        >
        <Tabs.List
          id="tabs-width"
          style={{
            height: "3rem",
            background: "--colors-bg-muted",
            "padding-top": "0.5rem",
          }}
        >
          <For each={tabContext()}>
            {(ctx, index) => (
              <Tabs.Trigger
                value={ctx.tabId}
                title={ctx.logName}
                draggable
                onDragStart={() => setDraggedTabIndex(index())}
                onDragOver={(e) => handleDragOver(e, index())}
                onDrop={() => {
                  setDraggedTabIndex(null);
                }}
              >
                <Editable.Root
                  defaultValue={ctx.logName}
                  activationMode="dblclick"
                  onValueChange={(e) => updateLogName(index(), e.value)}
                >
                  <Stack direction={"row"}>
                    <Editable.Area
                      style={{
                        overflow: "hidden",
                        "padding-top": "0.2rem",
                      }}
                    >
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
                                onClick={() => (deleteTab(index()))}
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
                                    size={"xs"}
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
          <Show when={tabContext().length !== 20}>
            <FileUpload.Root
              accept="text/csv"
              minFileSize={3}
              onFileAccept={loadLog}
              width={"1rem"}
              style={{ "margin-left": "0" }}
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
              width={"100%"}
              height={"calc(100vh - 3rem)"}
              style={{ "overflow-y": "auto" }}
            >
              <LoggingTab
                tabId={ctx.tabId}
                header={ctx.header}
                logName={ctx.logName}
                series={ctx.series}
                splitIndex={ctx.splitIndex}
                style={{ "height": "100%" }}
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
