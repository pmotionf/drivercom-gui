import { trackStore } from "@solid-primitives/deep";
import {
  createEffect,
  createSignal,
  For,
  JSX,
  onCleanup,
  onMount,
  Show,
} from "solid-js";
import { createStore } from "solid-js/store";
import { Plot, PlotContext } from "~/components/Plot";
import { inferSchema, initParser } from "udsv";
import { readTextFile } from "@tauri-apps/plugin-fs";
import uPlot from "uplot";
import { IconButton } from "~/components/ui/icon-button";
import { IconRefresh, IconSeparatorHorizontal } from "@tabler/icons-solidjs";
import { Stack } from "styled-system/jsx";

export type ErrorMessage = {
  title: string;
  description: string;
  type: string;
};

export type LogViewerTabPageContentProps =
  & JSX.HTMLAttributes<HTMLDivElement>
  & {
    tabId: string;
    filePath: string;
    onErrorMessage?: (message: ErrorMessage) => void;
    splitPlotIndex?: number[][];
    onSplit?: (indexArray: number[][]) => void;
    plotContext?: PlotContext[];
    onContextChange?: (plotContext: PlotContext[]) => void;
    xRange?: [number, number];
    onXRangeChange?: (xRange: [number, number]) => void;
  };

export function LogViewerTabPageContent(props: LogViewerTabPageContentProps) {
  const [plots, setPlots] = createStore([{} as PlotContext]);
  const [splitIndex, setSplitIndex] = createSignal([] as number[][]);
  const [header, setHeader] = createSignal<string[]>([]);
  const [series, setSeries] = createSignal<number[][]>([]);

  onMount(() => {
    openCsvFile(props.filePath);

    if (props.plotContext && props.plotContext.length !== 0) {
      setPlots(props.plotContext);
    }
  });

  async function openCsvFile(path: string) {
    const csv_str = await readTextFile(path);
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

    const indexArray = Array.from(
      { length: local_header.length },
      (_, index) => index,
    );

    setHeader(local_header);
    setSeries(data.slice(0, local_header.length));

    const splitIndexArray: number[][] = props.splitPlotIndex!.length === 0
      ? [indexArray]
      : [...props.splitPlotIndex!];
    setSplitIndex(splitIndexArray);
    props.onSplit?.(splitIndexArray);
  }

  function resetChart() {
    const indexArray = Array.from(
      { length: header().length },
      (_, index) => index,
    );
    setSplitIndex([indexArray]);
  }

  function splitPlot(plot_index: number) {
    const nonSelectSeries = plots[plot_index].selected.reduce(
      (filtered: number[], selected, index) => {
        if (!selected) {
          filtered.push(splitIndex()[plot_index][index]);
        }
        return filtered;
      },
      [],
    );
    const selectSeries = plots[plot_index].selected.reduce(
      (filtered: number[], selected, index) => {
        if (selected) {
          filtered.push(splitIndex()[plot_index][index]);
        }
        return filtered;
      },
      [],
    );

    setSplitIndex((prev) => {
      const updated = [...prev];
      updated.splice(plot_index, 1, nonSelectSeries, selectSeries);
      return updated;
    });
  }

  const allSelected = (index: number) => {
    trackStore(plots[index].selected);
    return plots[index].selected.every((b) => b);
  };
  const allNotSelected = (index: number) => {
    trackStore(plots[index].selected);
    return plots[index].selected.every((b) => !b);
  };

  createEffect(() => {
    props.onSplit?.(splitIndex());
    props.onContextChange?.(plots);
  });

  const [cursorIdx, setCursorIdx] = createSignal<number | null | undefined>(0);

  createEffect(() => {
    const splitIndexLength = splitIndex().length;
    if (splitIndexLength === 0) return;

    setTimeout(() => {
      const plotGroup: uPlot[] = uPlot.sync(props.tabId).plots;

      plotGroup.forEach((plot) => {
        plot.over.removeEventListener(
          "mousemove",
          () => setCursorIdx(plot.cursor.idx),
        );
        plot.over.removeEventListener(
          "mouseleave",
          () => setCursorIdx(plot.cursor.idx),
        );
      });

      plotGroup.forEach((plot) => {
        plot.over.addEventListener(
          "mousemove",
          () => setCursorIdx(plot.cursor.idx),
        );
        plot.over.addEventListener(
          "mouseleave",
          () => setCursorIdx(plot.cursor.idx),
        );
      });
    }, 300);
  });

  onCleanup(() => {
    const plotGroup: uPlot[] = uPlot.sync(props.tabId).plots;
    plotGroup.forEach((plot) => {
      plot.over.removeEventListener(
        "mousemove",
        () => setCursorIdx(plot.cursor.idx),
      );
      plot.over.removeEventListener(
        "mouseleave",
        () => setCursorIdx(plot.cursor.idx),
      );
    });
  });

  return (
    <>
      <For each={plots && splitIndex()}>
        {(item, index) => {
          // Header and items need not be derived state, as they will not
          // change within a plot.
          const currentHeader = item.map((i) => header()[i]);
          const currentItems = item.map((i) => series()[i]);

          // Current ID must be derived state as index can change based on
          // added/merged plots.
          const currentID = () => props.tabId + index();

          let prevSplitIndex = props.splitPlotIndex;

          createEffect(() => {
            if (
              prevSplitIndex && splitIndex().length === prevSplitIndex.length
            ) return;

            setPlots(index(), {
              visible: item.map(() => true),
            } as PlotContext);

            prevSplitIndex = splitIndex();
          });

          return (
            <>
              <Stack
                direction="row-reverse"
                width="100%"
                paddingRight="1.6rem"
                style={{ "overflow": "hidden" }}
                gap="2"
              >
                <IconButton
                  onClick={() => splitPlot(index())}
                  disabled={currentHeader.length <= 1 ||
                    !plots[index()] ||
                    !plots[index()].selected ||
                    allSelected(index()) ||
                    allNotSelected(index())}
                >
                  <IconSeparatorHorizontal />
                </IconButton>
                <Show when={index() == 0}>
                  <IconButton
                    variant="ghost"
                    disabled={splitIndex().length <= 1}
                    onclick={() => resetChart()}
                  >
                    <IconRefresh />
                  </IconButton>
                </Show>
              </Stack>

              <Plot
                id={currentID()}
                group={props.tabId}
                name=""
                header={currentHeader}
                series={currentItems}
                context={plots[index()]}
                onContextChange={(ctx) => {
                  setPlots(index(), ctx);
                  props.onContextChange?.(plots);
                }}
                xRange={props.xRange}
                onXRangeChange={(xRange) => {
                  props.onXRangeChange?.(xRange);
                }}
                style={{
                  width: "100%",
                  height: `calc(100% / ${splitIndex().length} - 3rem)`,
                  "min-height": "18rem",
                  "padding-right": "0.5rem",
                  "padding-left": "0.5rem",
                }}
                cursorIdx={cursorIdx()}
              />
            </>
          );
        }}
      </For>
    </>
  );
}
