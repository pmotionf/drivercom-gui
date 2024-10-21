import { Show, createSignal, createEffect, For } from "solid-js";
import { Portal } from "solid-js/web";

import { inferSchema, initParser } from "udsv";
import { IconX, IconChevronsDown, IconChevronsUp } from "@tabler/icons-solidjs";

import { Button } from "~/components/ui/button";
import { Collapsible } from "~/components/ui/collapsible";
import type { FileUploadFileAcceptDetails } from "@ark-ui/solid";
import { FileUpload } from "~/components/ui/file-upload";
import { Spinner } from "~/components/ui/spinner";
import { Text } from "~/components/ui/text";
import { Toast } from "~/components/ui/toast";

import { Plot } from "~/components/Plot";
import { token } from "styled-system/tokens";

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

  const [splitHteader, setSplitHteader] = createSignal([] as string[][]);
  const [splitSeries, setSplitSeries] = createSignal([] as number[][][]);

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

      setSplitHteader([header()]);
      setSplitSeries([series()]);
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

  //선택한 범례 가지고 오기
  function getLegendInfo(id: string) {
    const legendElements = document.querySelectorAll(`.u-series`);
    const visible = Array.from(legendElements)
      .filter((el) => !el.classList.contains("u-off"))
      .map((el) => el.querySelector(".u-label")?.textContent || "")
      .filter((label) => label !== "");
    const hidden = Array.from(legendElements)
      .filter((el) => el.classList.contains("u-off"))
      .map((el) => el.querySelector(".u-label")?.textContent || "")
      .filter((label) => label !== "");

    const h1 = [];
    const s1 = [];
    const h2 = [];
    const s2 = [];
    for (let vis of visible) {
      let index = visible.indexOf(vis);
      h1.push(header()[index]);
      s1.push(series()[index]);
    }

    for (let hid of hidden) {
      let index = hidden.indexOf(hid);
      h2.push(header()[index]);
      s2.push(series()[index]);
    }

    setSplitHteader([h1, h2]);
    setSplitSeries([s1, s2]);

    console.log("Visible legends:", visible.slice(1));
    console.log("Hidden legends:", hidden);
    console.log(id);
    console.log(splitHteader());
    console.log(splitSeries());
  }

  // Plot이 렌더링된 후 범례 정보를 가져오기
  createEffect(() => {});

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
        <For each={splitSeries()}>
          {(items, index) => (
            <>
              <Button
                variant="ghost"
                style={{
                  "background-color": token("colors.accent.10"),
                  color: token("colors.accent.1"),
                  "margin-top": "10px",
                }}
                onclick={() => getLegendInfo(logName() + index() + "-wrapper")}
              >
                Split table
              </Button>
              <Plot
                id={logName() + index()}
                name={logName() + "(" + index() + ")"}
                header={splitHteader()[0]}
                series={items}
                style={{
                  width: "100%",
                  height: `${100 / splitSeries().length}%`,
                }}
              />
            </>
          )}
        </For>
      </Show>
    </>
  );
}

export default Logging;
