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
import {
  IconFold,
  IconRestore,
  IconSeparatorHorizontal,
} from "@tabler/icons-solidjs";
import { Stack } from "styled-system/jsx";
import { Text } from "~/components/ui/text";
import { Checkbox } from "~/components/ui/checkbox";
import { Tooltip } from "~/components/ui/tooltip";
import { tabContexts } from "~/GlobalState.ts";
import { TabContext } from "~/components/Tab";
import { on } from "solid-js";

export type ErrorMessage = {
  title: string;
  description: string;
  type: string;
};

export type LogViewerTabPageContentProps =
  & JSX.HTMLAttributes<HTMLDivElement>
  & {
    key: string;
    tabId: string;
    onErrorMessage?: (message: ErrorMessage) => void;
  };

export function LogViewerTabPageContent(props: LogViewerTabPageContentProps) {
  if (!tabContexts.has(props.key)) return;

  const getTabContext = (
    tabId: string,
  ): { tabCtx: TabContext; currentIndex: number } => {
    const tabs = tabContexts.get(props.key)?.[0]!;
    const index = tabs.tabContext
      .map((tab) => {
        return tab.id;
      })
      .indexOf(tabId);
    return {
      tabCtx: tabContexts.get(props.key)?.[0].tabContext[index]!,
      currentIndex: index,
    };
  };

  if (!getTabContext(props.tabId).tabCtx) return;

  const setPlotContext = (tabIndex: number, newPlot: PlotContext[]) => {
    return tabContexts.get(props.key)?.[1](
      "tabContext",
      tabIndex,
      "plotContext",
      newPlot,
    );
  };

  const setSplitPlot = (tabIndex: number, newSplit: number[][]) => {
    return tabContexts.get(props.key)?.[1](
      "tabContext",
      tabIndex,
      "plotSplitIndex",
      newSplit,
    );
  };

  const setXRange = (tabIndex: number, newXRange: [number, number]) => {
    return tabContexts.get(props.key)?.[1](
      "tabContext",
      tabIndex,
      "plotZoomState",
      newXRange,
    );
  };

  const setLegendSplitter = (tabIndex: number, newSize: number) => {
    return tabContexts.get(props.key)?.[1](
      "tabContext",
      tabIndex,
      "legendPanelSize",
      newSize,
    );
  };

  const setLegendShrink = (tabIndex: number, newStatus: boolean) => {
    return tabContexts.get(props.key)?.[1](
      "tabContext",
      tabIndex,
      "legendShrink",
      newStatus,
    );
  };

  const [plots, setPlots] = createStore<PlotContext[]>(
    getTabContext(props.tabId).tabCtx.plotContext
      ? getTabContext(props.tabId).tabCtx.plotContext!
      : [{} as PlotContext],
  );

  const [plotZoomState, setPlotZoomState] = createSignal<[number, number]>(
    getTabContext(props.tabId).tabCtx.plotZoomState!,
  );
  createEffect(
    on(
      () => plotZoomState(),
      () => {
        setTimeout(() => {
          setXRange(getTabContext(props.tabId).currentIndex, plotZoomState());
        }, 20);
      },
      { defer: true },
    ),
  );

  const [splitIndex, setSplitIndex] = createSignal([] as number[][]);
  const [mergePlotIndexes, setMergePlotIndexes] = createSignal<number[]>([]);

  createEffect(
    on(
      () => splitIndex(),
      () => {
        setSplitPlot(getTabContext(props.tabId).currentIndex, splitIndex());
      },
      { defer: true },
    ),
  );

  createEffect(
    on(
      () => plots,
      () => {
        setPlotContext(getTabContext(props.tabId).currentIndex, plots);
      },
    ),
  );

  const [header, setHeader] = createSignal<string[]>([]);
  const [series, setSeries] = createSignal<number[][]>([]);

  function parseCsvForPlot(csv_str: string): {
    header: string[];
    series: number[][];
    splitIndex: number[][];
  } | null {
    const rows = csv_str.split("\n");
    if (rows.length < 2) {
      const errorMessage: ErrorMessage = {
        title: "Invalid Log File",
        description: "Not enough rows.",
        type: "error",
      };
      props.onErrorMessage?.(errorMessage);
      return null;
    }

    const schema = inferSchema(csv_str);
    const parser = initParser(schema);
    const local_header: string[] = rows[0].replace(/,\s*$/, "").split(",");
    const data: number[][] = parser.typedCols(csv_str).map((row) =>
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
      return null;
    }

    // Parse Enum name-value array to avoid plot errors
    const parsedSeriesForPlot: number[][] = data
      .slice(0, local_header.length)
      .map((series) => {
        const parsedEnumForPlot = series.map((value) => {
          if (
            value.toString().indexOf("(") !== -1 &&
            value.toString().indexOf(")") !== -1
          ) {
            const parseValue = value.toString().match(/\((\d+)\)/)![1];
            return Number(parseValue);
          } else {
            return value;
          }
        });
        return parsedEnumForPlot;
      });

    const indexArray = Array.from(
      { length: local_header.length },
      (_, index) => index,
    );

    return {
      header: local_header,
      series: parsedSeriesForPlot,
      splitIndex: [indexArray],
    };
  }

  onMount(async () => {
    const csv_str = await readTextFile(
      getTabContext(props.tabId).tabCtx.filePath!,
    );
    const dataForPlot = parseCsvForPlot(csv_str);
    if (!dataForPlot) return;
    setSeries(dataForPlot.series);
    setHeader(dataForPlot.header);

    if (getTabContext(props.tabId)) {
      if (getTabContext(props.tabId).tabCtx) {
        if (
          typeof getTabContext(props.tabId).tabCtx.plotSplitIndex! !==
            "undefined"
        ) {
          setSplitIndex([...getTabContext(props.tabId).tabCtx.plotSplitIndex!]);
        }
      }
    }

    if (splitIndex().length === 0) {
      setSplitIndex(dataForPlot.splitIndex);
    }
  });

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

  function mergePlot(plot_indexes: number[]) {
    const prevPlot = [...splitIndex()];
    let mergePlot: number[] = [];
    let smallestIndex = plot_indexes[0];
    plot_indexes.forEach((plot_index) => {
      mergePlot = [...mergePlot, ...prevPlot[plot_index]];
      smallestIndex = Math.min(smallestIndex, plot_index);
    });

    const newSplitIndex = prevPlot.filter(
      (_, index) => !plot_indexes.includes(index),
    );

    const updatePlot = [
      ...newSplitIndex.slice(0, smallestIndex),
      mergePlot,
      ...newSplitIndex.slice(smallestIndex, newSplitIndex.length),
    ];
    setSplitIndex(updatePlot);
  }

  const allSelected = (index: number) => {
    trackStore(plots[index].selected);
    return plots[index].selected.every((b) => b);
  };
  const allNotSelected = (index: number) => {
    trackStore(plots[index].selected);
    return plots[index].selected.every((b) => !b);
  };

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

  const [legendSplitterSize, setLegendSplitterSize] = createSignal<number>(
    getTabContext(props.tabId).tabCtx.legendPanelSize
      ? getTabContext(props.tabId).tabCtx.legendPanelSize!
      : 0,
  );

  createEffect(
    on(
      () => legendSplitterSize(),
      () => {
        setLegendSplitter(
          getTabContext(props.tabId).currentIndex,
          legendSplitterSize(),
        );
      },
      { defer: true },
    ),
  );

  const [isLegendShrink, setIsLegendShrink] = createSignal<boolean>(
    getTabContext(props.tabId).tabCtx.legendShrink
      ? getTabContext(props.tabId).tabCtx.legendShrink!
      : false,
  );

  createEffect(
    on(
      () => isLegendShrink(),
      () => {
        setLegendShrink(
          getTabContext(props.tabId).currentIndex,
          isLegendShrink(),
        );
      },
      { defer: true },
    ),
  );

  return (
    <For each={plots && splitIndex()}>
      {(item, index) => {
        // Header and items need not be derived state, as they will not
        // change within a plot.
        const currentHeader = item.map((i) => header()[i]);
        const currentItems = item.map((i) => series()[i]);

        // Current ID must be derived state as index can change based on
        // added/merged plots.
        const currentID = () => props.tabId + index();

        let prevSplitIndex = getTabContext(props.tabId).tabCtx.plotSplitIndex;

        createEffect(() => {
          if (prevSplitIndex && splitIndex().length === prevSplitIndex.length) {
            return;
          }

          setPlots(index(), {
            visible: item.map(() => true),
          } as PlotContext);

          prevSplitIndex = splitIndex();
        });

        return (
          <div
            style={{
              height: `calc(100% / ${splitIndex().length})`,
              width: "100%",
            }}
          >
            <Stack
              direction="row-reverse"
              width="100%"
              paddingRight="1.6rem"
              style={{ overflow: "hidden" }}
              height="3rem"
            >
              <Tooltip.Root>
                <Tooltip.Trigger>
                  <IconButton
                    size="sm"
                    onClick={() => {
                      splitPlot(index());
                      setMergePlotIndexes([]);
                    }}
                    disabled={currentHeader.length <= 1 ||
                      !plots[index()] ||
                      !plots[index()].selected ||
                      allSelected(index()) ||
                      allNotSelected(index())}
                  >
                    <IconSeparatorHorizontal />
                  </IconButton>
                </Tooltip.Trigger>
                <Tooltip.Positioner>
                  <Tooltip.Content backgroundColor="bg.default">
                    <Text color="fg.default">Split</Text>
                  </Tooltip.Content>
                </Tooltip.Positioner>
              </Tooltip.Root>

              <Tooltip.Root>
                <Tooltip.Trigger>
                  <IconButton
                    onClick={() => {
                      mergePlot(mergePlotIndexes());
                      setMergePlotIndexes([]);
                    }}
                    disabled={mergePlotIndexes().length < 2 ||
                      mergePlotIndexes().indexOf(index()) === -1}
                    size="sm"
                  >
                    <IconFold />
                  </IconButton>
                </Tooltip.Trigger>
                <Tooltip.Positioner>
                  <Tooltip.Content backgroundColor="bg.default">
                    <Text color="fg.default">Merge</Text>
                  </Tooltip.Content>
                </Tooltip.Positioner>
              </Tooltip.Root>

              <Checkbox
                width="8rem"
                checked={mergePlotIndexes().indexOf(index()) !== -1}
                onCheckedChange={(checkBoxState) => {
                  if (checkBoxState.checked === true) {
                    setMergePlotIndexes((prev) => {
                      return [...prev, index()];
                    });
                  } else {
                    setMergePlotIndexes((prev) => {
                      return prev.filter(
                        (graphIndex) => graphIndex !== index(),
                      );
                    });
                  }
                }}
              >
                <Text fontWeight="bold">Graph {index() + 1}</Text>
              </Checkbox>
              <Show when={index() === 0}>
                <Stack direction="row" width={`calc(100% - 16rem)`}>
                  <Tooltip.Root>
                    <Tooltip.Trigger>
                      <IconButton
                        variant="outline"
                        disabled={splitIndex().length <= 1}
                        onclick={() => {
                          resetChart();
                          setMergePlotIndexes([]);
                        }}
                        size="sm"
                      >
                        <IconRestore />
                      </IconButton>
                    </Tooltip.Trigger>
                    <Tooltip.Positioner>
                      <Tooltip.Content backgroundColor="bg.default">
                        <Text color="fg.default">Reset</Text>
                      </Tooltip.Content>
                    </Tooltip.Positioner>
                  </Tooltip.Root>
                </Stack>
              </Show>
            </Stack>
            <Plot
              id={currentID()}
              group={props.tabId}
              name=""
              header={currentHeader}
              series={currentItems}
              context={plots[index()]}
              legendPanelSize={legendSplitterSize()}
              onLegendPanelSize={(size) => {
                setLegendSplitterSize(size);
              }}
              onContextChange={(ctx) => {
                if (JSON.stringify(ctx) !== JSON.stringify(plots[index()])) {
                  setPlots(index(), ctx);
                }
              }}
              xRange={getTabContext(props.tabId).tabCtx.plotZoomState}
              onXRangeChange={(xRange) => {
                if (plotZoomState() !== xRange) {
                  setPlotZoomState(xRange);
                }
              }}
              legendShrink={isLegendShrink()}
              onLegendShrinkChange={(newState) => {
                setIsLegendShrink(newState);
              }}
              style={{
                width: "100%",
                height: `calc(100% - 3rem)`,
                "min-height": "17rem",
                "padding-right": "0.5rem",
                "padding-left": "0.5rem",
              }}
              cursorIdx={cursorIdx()}
            />
          </div>
        );
      }}
    </For>
  );
}
