import { trackStore } from "@solid-primitives/deep";
import { createEffect, createSignal, For, JSX } from "solid-js";
import { createStore } from "solid-js/store";
import { Plot, PlotContext } from "~/components/Plot";
import { Button } from "~/components/ui/button";
import { inferSchema, initParser } from "udsv";
import { FileUploadFileChangeDetails } from "@ark-ui/solid";

export type ErrorMessage = {
  title: string;
  description: string;
  type: string;
};

export type LogViewerTabPageContentProps = JSX.HTMLAttributes<HTMLDivElement> & {
  tabId: string;
  details: FileUploadFileChangeDetails;
  onErrorMessage?: (message: ErrorMessage) => void;
};

export function LogViewerTabPageContent(props: LogViewerTabPageContentProps) {
  const [plots, setPlots] = createStore([] as PlotContext[]);
  const [splitIndex, setSplitIndex] = createSignal([] as number[][]);
  let header: string[] = [];
  let series: number[][] = [];

  const file = props.details.acceptedFiles[0];
  const reader = new FileReader();

  reader.onload = () => {
    const csv_str: string = (reader.result! as string).trim();
    const rows = csv_str.split("\n");
    if (rows.length < 2) {
      const errorMessage: ErrorMessage = {
        title: "Invalid Log File",
        description: "Not enough rows.",
        type: "error",
      };
      props.onErrorMessage?.(errorMessage);
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
      const errorMessage: ErrorMessage = {
        title: "Invalid Log File",
        description:
          `Data has ${data.length} columns, while header has ${local_header.length} labels.`,
        type: "error",
      };
      props.onErrorMessage?.(errorMessage);
      return;
    }

    if (typeof (reader.result!) === "string") {
      const indexArray = Array.from(
        { length: local_header.length },
        (_, index) => index,
      );

      header = local_header;
      series = data.slice(0, local_header.length);
      setSplitIndex([indexArray]);
    }
  };

  reader.onerror = () => {
    const errorMessage: ErrorMessage = {
      title: "Log File Loading Failed",
      description: `${reader.error!.name}: ${reader.error!.message}`,
      type: "error",
    };
    props.onErrorMessage?.(errorMessage);
  };
  reader.readAsText(file);

  function resetChart() {
    const indexArray = Array.from(
      { length: header.length },
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

  return (
    <>
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
          const currentHeader = item.map((i) => header[i]);
          const currentItems = item.map((i) => series[i]);

          // Current ID must be derived state as index can change based on
          // added/merged plots.
          const currentID = () => props.tabId + index();

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
                disabled={currentHeader.length <= 1 ||
                  !plots[index()] ||
                  !plots[index()].visible ||
                  allVisible(index()) ||
                  allInvisible(index())}
                style={{
                  "margin-left": "1rem",
                  "margin-top": `${index() == 0 ? "0.5rem" : "0px"}`,
                }}
              >
                Split Plot
              </Button>
              <Plot
                id={currentID()}
                group={props.tabId}
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
    </>
  );
}
