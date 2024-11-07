import { Show, createSignal, For, createEffect } from "solid-js";
import { Portal } from "solid-js/web";
import { createStore } from "solid-js/store";
import { trackStore } from "@solid-primitives/deep";

import { inferSchema, initParser } from "udsv";
import { IconX, IconChevronsDown, IconChevronsUp } from "@tabler/icons-solidjs";

import { Button } from "~/components/ui/button";
import { Collapsible } from "~/components/ui/collapsible";
import type { FileUploadFileAcceptDetails } from "@ark-ui/solid";
import { FileUpload } from "~/components/ui/file-upload";
import { Spinner } from "~/components/ui/spinner";
import { Text } from "~/components/ui/text";
import { Toast } from "~/components/ui/toast";
import { Plot, type PlotContext } from "~/components/Plot";

function Logging() {
  const toaster = Toast.createToaster({
    placement: "top-end",
    gap: 24,
  });

  const [fileSelectOpen, setFileSelectOpen] = createSignal(true);

  const [logStatus, setLogStatus] = createSignal("");
  const [logName, setLogName] = createSignal("");
  const [header, setHeader] = createSignal([] as string[]);
  const [series, setSeries] = createSignal([] as number[][]);
  const [plots, setPlots] = createStore([] as PlotContext[]);

  const [splitIndex, setSplitIndex] = createSignal([] as number[][]);

  function loadLog(details: FileUploadFileAcceptDetails) {
    if (details.files.length == 0) return;
    const file = details.files[0];
    setLogName(file.name);
    setLogStatus("loading");
    var reader = new FileReader();

    reader.onload = () => {
      setLogStatus("");
      const csv_str: string = (reader.result! as string).trim();
      const rows = csv_str.split("\n");
      if (rows.length < 2) {
        setLogStatus("failed");
        toaster.create({
          title: "Invalid Log File",
          description: "Not enough rows.",
          type: "error",
        });
        return;
      }

      let schema = inferSchema(csv_str);
      let parser = initParser(schema);
      const local_header = rows[0].replace(/,\s*$/, "").split(",");
      const data = parser.typedCols(csv_str).map((row) =>
        row.map((val) => {
          if (typeof val === "boolean") return val ? 1 : 0;
          return val;
        }),
      );
      if (data.length < local_header.length) {
        setLogStatus("failed");
        toaster.create({
          title: "Invalid Log File",
          description: `Data has ${data.length} columns, while header has ${local_header.length} labels.`,
          type: "error",
        });
        return;
      }

      setHeader(local_header);
      setSeries(data.slice(0, local_header.length));
      setFileSelectOpen(false);

      const indexArray = Array.from(
        { length: header().length },
        (_, index) => index,
      );
      setSplitIndex([indexArray]);
    };

    reader.onerror = () => {
      setLogStatus("failed");
      toaster.create({
        title: "Log File Loading Failed",
        description: `${reader.error!.name}: ${reader.error!.message}`,
        type: "error",
      });
    };

    reader.readAsText(file);
  }

  function resetChart() {
    const indexArray = Array.from(
      { length: header().length },
      (_, index) => index,
    );
    setSplitIndex([indexArray]);
  }

  function splitPlot(plot_index: number) {
    const hiddens = plots[plot_index].visible.reduce(
      (filtered: number[], visible, index) => {
        if (!visible) {
          filtered.push(splitIndex()[plot_index][index]);
        }
        return filtered;
      },
      [],
    );
    const visibles = plots[plot_index].visible.reduce(
      (filtered: number[], visible, index) => {
        if (visible) {
          filtered.push(splitIndex()[plot_index][index]);
        }
        return filtered;
      },
      [],
    );

    setSplitIndex((prev) => {
      const updated = [...prev];
      updated.splice(plot_index, 1, visibles, hiddens);
      return updated;
    });
  }

  const allVisible = (index: number) => {
    trackStore(plots[index].visible);
    return plots[index].visible.every((b) => b);
  };
  const allInvisible = (index: number) => {
    trackStore(plots[index].visible);
    return plots[index].visible.every((b) => !b);
  };

  // UI 렌더링
  return (
    <>
      <Portal>
        <Button
          variant="ghost"
          style={{
            position: "fixed",
            "padding-right": "0.8em",
            "padding-left": "0.5em",
            "text-align": "right",
            top: "0px",
            right: "0px",
          }}
          onClick={() => {
            setFileSelectOpen((prev) => !prev);
          }}
        >
          <Show when={logStatus() === "loading"}>
            <Spinner size="sm" />
          </Show>
          <Show when={logStatus() === "failed"}>
            <IconX color="red" />
          </Show>
          <Show when={logName() !== ""}>
            <Text>{logName()}</Text>
          </Show>
          <Show when={fileSelectOpen()} fallback={<IconChevronsDown />}>
            <IconChevronsUp />
          </Show>
        </Button>
      </Portal>
      <Collapsible.Root open={fileSelectOpen()} lazyMount unmountOnExit>
        <Collapsible.Content>
          <FileUpload.Root
            accept="text/csv"
            minFileSize={3}
            onFileAccept={loadLog}
            onFileReject={(details) => {
              if (details.files.length == 0) return;
              var description = "The provided log file is invalid:\n";
              for (var i = 0; i < details.files[0].errors.length; i++) {
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
            <FileUpload.Dropzone>
              <FileUpload.Label>Drop Log File (CSV)</FileUpload.Label>
              <FileUpload.Trigger
                asChild={(triggerProps) => (
                  <Button size="sm" {...triggerProps()} variant="outline">
                    <Show when={logName() === ""} fallback="Change">
                      Select
                    </Show>
                  </Button>
                )}
              />
            </FileUpload.Dropzone>
            <FileUpload.HiddenInput />
          </FileUpload.Root>
        </Collapsible.Content>
      </Collapsible.Root>
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

      <Show when={series().length > 0}>
        <Button
          variant="ghost"
          disabled={splitIndex().length <= 1}
          onclick={resetChart}
          style={{
            "margin-top": "0.5rem",
            "margin-left": "1rem",
          }}
        >
          Reset
        </Button>
        <For each={splitIndex()}>
          {(item, index) => {
            // Header and items need not be derived state, as they will not
            // change within a plot.
            const currentHeader = item.map((i) => header()[i]);
            const currentItems = item.map((i) => series()[i]);

            // Current ID must be derived state as index can change based on
            // added/merged plots.
            const currentID = () => logName() + index();

            // Re-render plot contexts every time `splitIndex` is changed.
            // TODO: Do not always initialize as empty, figure out how to save
            // existing state and update for index changes.
            createEffect(() => {
              setPlots(index(), {} as PlotContext);
            });

            return (
              <>
                <Button
                  onClick={() => splitPlot(index())}
                  disabled={
                    currentHeader.length <= 1 ||
                    !plots[index()] ||
                    !plots[index()].visible ||
                    allVisible(index()) ||
                    allInvisible(index())
                  }
                  style={{
                    "margin-left": "1rem",
                    "margin-top": `${index() == 0 ? "0.5rem" : "0px"}`,
                  }}
                >
                  Split Plot
                </Button>
                <Plot
                  id={currentID()}
                  group={logName()}
                  name=""
                  header={currentHeader}
                  series={currentItems}
                  context={plots[index()]}
                  style={{
                    width: "100%",
                    height: `calc(100% / ${splitIndex().length} - 3rem`,
                    "min-height": "18rem",
                  }}
                />
              </>
            );
          }}
        </For>
      </Show>
    </>
  );
}

export default Logging;
