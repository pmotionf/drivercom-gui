import { trackStore } from "@solid-primitives/deep";
import {
  createEffect,
  createSignal,
  For,
  onMount,
  Show,
  useContext,
} from "solid-js";
import { createStore } from "solid-js/store";
import { Plot, PlotContext } from "~/components/Plot";
import { IconButton } from "~/components/ui/icon-button";
import {
  IconFileDownload,
  IconFold,
  IconRestore,
  IconArrowAutofitHeight,
  IconSeparatorHorizontal,
} from "@tabler/icons-solidjs";
import { Stack } from "styled-system/jsx";
import { Text } from "~/components/ui/text";
import { Checkbox } from "~/components/ui/checkbox";
import { Tooltip } from "~/components/ui/tooltip";
import { tabContexts } from "~/GlobalState.ts";
import { on } from "solid-js";
import { LegendStroke } from "~/components/Plot/Legend";
import { TabContext, TabPageContext } from "~/components/TabList";
import { CreateToasterReturn } from "@ark-ui/solid";
import { FileHandler } from "../utils/FileHandler";
import { createDraggable } from "@neodrag/solid";
import { css } from "styled-system/css";
import { Portal } from "solid-js/web";

export type ErrorMessage = {
  title: string;
  description: string;
  type: string;
};

export type LogViewerTabPageContentProps = {
  key: string;
  tabId: string;
  toaster: CreateToasterReturn;
};

export type LogViewerTabPage = {
  filePath?: string;
  plotSplitIndex?: number[][];
  plotContext?: PlotContext[];
  plotXScale?: [number, number];
  plotYScales?: { min: number; max: number }[];
  legendPanelSize?: number;
  legendShrink?: boolean;
};

export function LogViewerTabPageContent() {
  const tabPageProps = useContext(TabPageContext);
  if (!tabPageProps) return;
  if (!tabContexts.get(tabPageProps.key)) return;

  const [render, setRender] = createSignal<boolean>(false);

  const getTabContext = (
    tabId: string,
  ): { tabCtx: LogViewerTabPage; currentIndex: number } => {
    const tabs = tabContexts.get(tabPageProps.key)![0]!;
    const index = tabs.tabContext
      .map((tabCtx) => {
        return tabCtx.tab.id;
      })
      .indexOf(tabId);
    return {
      tabCtx: tabContexts.get(tabPageProps.key)![0].tabContext[index].tabPage!
        .logViewerTabPage!,
      currentIndex: index,
    };
  };

  const addNewTab = (newFilePath: string) => {
    const tabCtxLength = tabContexts.get(tabPageProps.key)![0].tabContext
      .length;
    const setTabCtx = tabContexts.get(tabPageProps.key)![1];
    const newTabID = crypto.randomUUID();
    const newTab: TabContext = {
      tab: {
        id: newTabID,
        tabName: newFilePath
          .replaceAll("\\", "/")
          .match(/[^?!//]+$/!)!
          .toString()
          .slice(0, -4) as string,
      },
      tabPage: {
        logViewerTabPage: {
          filePath: newFilePath,
        },
        configTabPage: null,
      },
    };
    setTimeout(() => {
      setTabCtx("tabContext", tabCtxLength, newTab);
      setTabCtx("focusedTab", newTabID);
    }, 200);
  };

  const deleteTab = () => {
    const tabCtx = tabContexts.get(tabPageProps.key)![0];
    const tabIndex = getTabContext(tabPageProps.tabId).currentIndex;
    const filteredTabCtx = tabCtx.tabContext.filter(
      (tabCtx) => tabCtx.tab.id !== tabPageProps.tabId,
    );
    const setTabCtx = tabContexts.get(tabPageProps.key)![1];
    const nextFocusTabIndex = tabIndex === 0 ? 1 : tabIndex - 1;

    setTimeout(() => {
      setTabCtx("focusedTab", tabCtx.tabContext[nextFocusTabIndex].tab.id);
      setTabCtx("tabContext", filteredTabCtx);
    }, 200);
  };

  const filePath = () => {
    return getTabContext(tabPageProps.tabId).tabCtx.filePath!;
  };

  const tabName = () => {
    return tabContexts.get(tabPageProps.key)![0].tabContext[
      getTabContext(tabPageProps.tabId).currentIndex
    ].tab.tabName;
  };

  const setSplitPlot = (tabIndex: number, newSplit: number[][]) => {
    return tabContexts.get(tabPageProps.key)?.[1](
      "tabContext",
      tabIndex,
      "tabPage",
      "logViewerTabPage",
      "plotSplitIndex",
      newSplit,
    );
  };

  const setXRange = (tabIndex: number, newXRange: [number, number]) => {
    return tabContexts.get(tabPageProps.key)?.[1](
      "tabContext",
      tabIndex,
      "tabPage",
      "logViewerTabPage",
      "plotXScale",
      newXRange,
    );
  };

  const setLegendSplitter = (tabIndex: number, newSize: number) => {
    return tabContexts.get(tabPageProps.key)?.[1](
      "tabContext",
      tabIndex,
      "tabPage",
      "logViewerTabPage",
      "legendPanelSize",
      newSize,
    );
  };

  const setLegendShrink = (tabIndex: number, newStatus: boolean) => {
    return tabContexts.get(tabPageProps.key)?.[1](
      "tabContext",
      tabIndex,
      "tabPage",
      "logViewerTabPage",
      "legendShrink",
      newStatus,
    );
  };

  const [plots, setPlots] = createStore<PlotContext[]>(
    getTabContext(tabPageProps.tabId).tabCtx.plotContext
      ? getTabContext(tabPageProps.tabId).tabCtx.plotContext!
      : [{} as PlotContext],
  );

  const [plotZoomState, setPlotZoomState] = createSignal<[number, number]>([
    0, 0,
  ]);
  if (getTabContext(tabPageProps.tabId).tabCtx.plotXScale) {
    setPlotZoomState(getTabContext(tabPageProps.tabId).tabCtx.plotXScale!);
  }

  createEffect(
    on(
      () => plotZoomState(),
      () => {
        setTimeout(() => {
          setXRange(
            getTabContext(tabPageProps.tabId).currentIndex,
            plotZoomState(),
          );
        }, 20);
      },
      { defer: true },
    ),
  );

  const [splitIndex, setSplitIndex] = createSignal([] as number[][]);

  createEffect(
    on(
      () => splitIndex(),
      () => {
        setTimeout(() => {
          setSplitPlot(
            getTabContext(tabPageProps.tabId).currentIndex,
            splitIndex(),
          );
        }, 200);
      },
      { defer: true },
    ),
  );

  const [mergePlotIndexes, setMergePlotIndexes] = createSignal<number[]>([]);

  createEffect(
    on(
      () => splitIndex(),
      () => {
        setSplitPlot(
          getTabContext(tabPageProps.tabId).currentIndex,
          splitIndex(),
        );
      },
      { defer: true },
    ),
  );

  const [plotYScales, setPlotYScales] = createSignal<
    { min: number; max: number }[]
  >([]);

  createEffect(
    on(
      () => plotYScales(),
      () => {
        const yScales = plotYScales();
        tabContexts.get(tabPageProps.key)?.[1](
          "tabContext",
          getTabContext(tabPageProps.tabId).currentIndex,
          "tabPage",
          "logViewerTabPage",
          "plotYScales",
          yScales,
        );
      },
      { defer: true },
    ),
  );

  const [header, setHeader] = createSignal<string[]>([]);
  const [series, setSeries] = createSignal<number[][]>([]);

  onMount(async () => {
    await prepareCsvFile();
  });

  const prepareCsvFile = async () => {
    try {
      const csvFile = await fileHandler.readCsvFile(filePath());
      setSeries(csvFile.series);
      setHeader(csvFile.header);
      setPlotZoomState([0, series()[0].length]);
    } catch (e) {
      tabPageProps.toaster.create({
        title: "Invalid File",
        description: e as string,
        type: "error",
      });
      deleteTab();
    }

    if (getTabContext(tabPageProps.tabId)) {
      if (getTabContext(tabPageProps.tabId).tabCtx) {
        if (getTabContext(tabPageProps.tabId).tabCtx.plotContext) {
          setPlots(getTabContext(tabPageProps.tabId).tabCtx.plotContext!);
        }

        if (
          typeof getTabContext(tabPageProps.tabId).tabCtx.plotSplitIndex! !==
          "undefined"
        ) {
          setSplitIndex([
            ...getTabContext(tabPageProps.tabId).tabCtx.plotSplitIndex!,
          ]);
        }

        if (
          typeof getTabContext(tabPageProps.tabId).tabCtx.plotYScales! !==
          "undefined"
        ) {
          setPlotYScales(getTabContext(tabPageProps.tabId).tabCtx.plotYScales!);
        }
      }
    }

    if (splitIndex().length === 0 || splitIndex().length > header().length) {
      const indexArray = Array.from(
        { length: header().length },
        (_, index) => index,
      );
      setSplitIndex([indexArray]);
    }

    if (plotYScales().length === 0) {
      const newYScales: { min: number; max: number }[] = Array.from(
        { length: splitIndex().length },
        () => {
          return { min: 0, max: 0 };
        },
      );
      setPlotYScales(newYScales);
    }

    setRender(true);
  };

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

    setPlotYScales((prev) => {
      const newUpdate = [
        ...prev.slice(0, plot_index + 1),
        { min: 0, max: 0 },
        ...prev.slice(plot_index + 1, prev.length),
      ];
      return newUpdate;
    });
  }

  function mergePlot(plot_indexes: number[]) {
    const prevPlot = [...splitIndex()];
    let mergePlot: number[] = [];

    const prevYRange = [...plotYScales()];
    let mergeYRange: { min: number; max: number } = prevYRange[plot_indexes[0]];

    let smallestIndex = plot_indexes[0];
    plot_indexes.forEach((plot_index) => {
      mergePlot = [...mergePlot, ...prevPlot[plot_index]];
      mergeYRange = {
        min: Math.max(mergeYRange.min, prevYRange[plot_index].min),
        max: Math.min(mergeYRange.max, prevYRange[plot_index].max),
      };
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

    const newYRange = prevYRange.filter(
      (_, index) => !plot_indexes.includes(index),
    );
    const updateYRange = [
      ...newYRange.slice(0, smallestIndex),
      mergeYRange,
      ...newYRange.slice(smallestIndex, newYRange.length),
    ];
    setPlotYScales(updateYRange);
  }

  const allSelected = (index: number) => {
    trackStore(plots[index].selected);
    return plots[index].selected.every((b) => b);
  };
  const allNotSelected = (index: number) => {
    trackStore(plots[index].selected);
    return plots[index].selected.every((b) => !b);
  };

  const [legendSplitterSize, setLegendSplitterSize] = createSignal<number>(
    getTabContext(tabPageProps.tabId).tabCtx.legendPanelSize
      ? getTabContext(tabPageProps.tabId).tabCtx.legendPanelSize!
      : 0,
  );

  createEffect(
    on(
      () => legendSplitterSize(),
      () => {
        setLegendSplitter(
          getTabContext(tabPageProps.tabId).currentIndex,
          legendSplitterSize(),
        );
      },
      { defer: true },
    ),
  );

  const [isLegendShrink, setIsLegendShrink] = createSignal<boolean>(
    getTabContext(tabPageProps.tabId).tabCtx.legendShrink
      ? getTabContext(tabPageProps.tabId).tabCtx.legendShrink!
      : false,
  );

  createEffect(
    on(
      () => isLegendShrink(),
      () => {
        setLegendShrink(
          getTabContext(tabPageProps.tabId).currentIndex,
          isLegendShrink(),
        );
      },
      { defer: true },
    ),
  );

  const [prevSplitIndex, setPrevSplitIndex] = createSignal<number[][]>(
    [] as number[][],
  );

  createEffect(
    on(
      () => splitIndex(),
      () => {
        if (plots.length === 0) {
          setPlots([{} as PlotContext]);
          return;
        }

        if (plots.length === splitIndex().length) return;
        const prevPlot: Map<
          number,
          { color: string; style: LegendStroke; visible: boolean }
        > = new Map();
        prevSplitIndex().forEach((nums, index) => {
          nums.forEach((num, i) => {
            prevPlot.set(num, {
              color: plots[index].color[i],
              style: plots[index].style[i],
              visible: plots[index].visible[i],
            });
          });
        });

        const updatePlot = splitIndex().map((nums) => {
          return {
            color: nums.map((num) => prevPlot.get(num)!.color),
            style: nums.map((num) => prevPlot.get(num)!.style),
            visible: nums.map((num) => prevPlot.get(num)!.visible),
          } as PlotContext;
        });

        setPlots(updatePlot);
      },
      { defer: true },
    ),
  );

  async function saveCsvFile(
    path: string,
    header: string[],
    series: number[][],
    xMin: number,
    xMax: number,
  ) {
    const parseSeries = series.map((series) => series.slice(xMin, xMax));
    await fileHandler.writeCsvFile(path, {
      header: header,
      series: parseSeries,
    });
  }

  const fileHandler = new FileHandler();

  const [dragging, setDragging] = createSignal<number | null>(null);

  //@ts-ignore This is need for using neo-drag dependency.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { draggable: dragOptions } = createDraggable();
  let scrollContainer: HTMLDivElement | undefined;

  const [dragOverIndex, setDragOverIndex] = createSignal<number | null>(null);

  const reorderPlots = (fromIndex: number, nextIndex: number | null) => {
    if (typeof nextIndex === "number" && fromIndex !== nextIndex) {
      const updatedItems = splitIndex().slice();
      updatedItems.splice(nextIndex, 0, ...updatedItems.splice(fromIndex, 1));
      setSplitIndex(updatedItems);

      //plotYscalses
      const updatedPlotYScales = plotYScales().slice();
      updatedPlotYScales.splice(
        nextIndex,
        0,
        ...updatedPlotYScales.splice(fromIndex, 1),
      );
      setPlotYScales(updatedPlotYScales);

      // plotContext
      const updatePlotContexts = plots.slice();
      updatePlotContexts.splice(
        nextIndex,
        0,
        ...updatePlotContexts.splice(fromIndex, 1),
      );
      setPlots(updatePlotContexts);
    }
  };

  const divId = crypto.randomUUID();
  const [overlayTop, setOverlayTop] = createSignal<number | null>(null);
  const [overlayBottom, setOverlayBottom] = createSignal<number | null>(null);

  const [clientX, setClientX] = createSignal<number | null>(null);
  const [clientY, setClientY] = createSignal<number | null>(null);

  const dragOverScroll = (
    offsetY: number,
    scrollContainer: HTMLDivElement | undefined,
  ) => {
    if (!scrollContainer) return;
    const movement = offsetY * 0.05;
    scrollContainer.scrollBy({ top: movement });
  };

  return (
    <Show when={render()}>
      <div
        style={{
          width: "100%",
          height: "100%",
          "overflow-y": "auto",
          "overflow-x": "hidden",
        }}
        ref={scrollContainer}
      >
        <For each={splitIndex()}>
          {(item, index) => {
            // Header and items need not be derived state, as they will not
            // change within a plot.
            const currentHeader = item.map((i) => header()[i]);
            const currentItems = item.map((i) => series()[i]);

            // Current ID must be derived state as index can change based on
            // added/merged plots.
            const currentID = () => tabPageProps.tabId + index();

            return (
              <div
                id={`${divId}:${index()}`}
                class={css({ background: "bg.default" })}
                style={{
                  height: `calc(100% / ${splitIndex().length})`,
                  width: "100%",
                  "min-height": "20rem",
                  position: dragging() === index() ? "relative" : undefined,
                  "z-index": dragging() === index() ? "10" : "0",
                  opacity: dragging() === index() ? "0" : "1",
                  "padding-top": "0.5em",
                }}
                use:dragOptions={{
                  handle: ".handle",
                  onDragStart: () => {
                    setDragging(index());
                  },
                  onDrag: (data) => {
                    dragOverScroll(data.offsetY, scrollContainer);
                    setClientX(data.event.clientX);

                    const clientY =
                      data.event.clientY; /*+ scrollContainer!.scrollTop*/
                    setClientY(clientY);
                    let dragIndex: number | null = null;

                    for (let num = 0; num < splitIndex().length; num++) {
                      if (
                        typeof dragging() === "number" &&
                        dragging() !== num
                      ) {
                        const plotId = `${divId}:${num}`;
                        const element = document.getElementById(plotId);
                        if (element) {
                          const clientRec = element.getBoundingClientRect();
                          const top = clientRec.top;
                          const bottom = clientRec.bottom;
                          if (top < clientY && clientY < bottom) {
                            setOverlayTop(clientRec.top);
                            setOverlayBottom(clientRec.bottom);
                            dragIndex = num;
                            break;
                          }
                        }
                      }
                    }
                    setDragOverIndex(dragIndex);
                  },
                  onDragEnd: () => {
                    setTimeout(() => {
                      setRender(false);
                      const dragOver = dragOverIndex();
                      reorderPlots(index(), dragOverIndex());
                      setDragging(null);
                      setDragOverIndex(null);
                      setRender(true);
                      if (scrollContainer) {
                        const plotId = `${divId}:${dragOver}`;
                        const element = document.getElementById(plotId);
                        if (element) {
                          const top = element.getBoundingClientRect().y;

                          scrollContainer.scrollTo({
                            top: top - scrollContainer.offsetTop,
                          });
                        }
                      }

                      setOverlayBottom(null);
                      setOverlayTop(null);

                      setClientX(null);
                      setClientY(null);
                    }, 200);
                  },
                }}
              >
                <Stack
                  direction="row-reverse"
                  width="100%"
                  paddingRight="1.6rem"
                  style={{ overflow: "hidden" }}
                  height="3rem"
                  gap="0.25em"
                >
                  <Tooltip.Root>
                    <Tooltip.Trigger>
                      <IconButton
                        size="xs"
                        variant={"outline"}
                        onClick={async () => {
                          const visible = plots[index()].visible;
                          if (!visible.includes(true)) {
                            tabPageProps!.toaster.create({
                              title: "Invalid Legend",
                              description: "There is no visible legends.",
                              type: "error",
                            });
                            return;
                          }
                          const visibleHeader = currentHeader.filter(
                            (_, i) => visible[i],
                          );
                          const visibleSeries = currentItems.filter(
                            (_, i) => visible[i],
                          );

                          const xMin = Math.floor(plotZoomState()[0]);
                          const xMax = Math.floor(plotZoomState()[1]);
                          if (xMax - xMin < 1) {
                            tabPageProps!.toaster.create({
                              title: "Invalid Range",
                              description:
                                "The x-axis dosen't have enough range.",
                              type: "error",
                            });
                            return;
                          }

                          const path = await fileHandler.saveFileDialog(
                            "csv",
                            filePath(),
                            tabName(),
                          );
                          if (path) {
                            await saveCsvFile(
                              path,
                              visibleHeader,
                              visibleSeries,
                              xMin,
                              xMax,
                            );
                            tabPageProps!.toaster.create({
                              title: "Saved File Successfully",
                              description: "The file is saved.",
                              type: "success",
                              action:
                                path !== filePath()
                                  ? {
                                      label: path,
                                      onClick: () => {
                                        addNewTab(path);
                                      },
                                    }
                                  : undefined,
                            });
                          }
                          if (path === filePath()) {
                            setRender(false);
                            setTimeout(async () => {
                              await prepareCsvFile();
                            }, 200);
                          }
                        }}
                      >
                        <IconFileDownload />
                      </IconButton>
                    </Tooltip.Trigger>
                    <Tooltip.Positioner>
                      <Tooltip.Content backgroundColor="bg.default">
                        <Text color="fg.default">Save</Text>
                      </Tooltip.Content>
                    </Tooltip.Positioner>
                  </Tooltip.Root>

                  <Tooltip.Root>
                    <Tooltip.Trigger>
                      <IconButton
                        size="xs"
                        onClick={() => {
                          setPrevSplitIndex(splitIndex());
                          splitPlot(index());
                          setMergePlotIndexes([]);
                        }}
                        disabled={
                          currentHeader.length <= 1 ||
                          !plots[index()] ||
                          !plots[index()].selected ||
                          allSelected(index()) ||
                          allNotSelected(index())
                        }
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
                          setPrevSplitIndex(splitIndex());
                          mergePlot(mergePlotIndexes());
                          setMergePlotIndexes([]);
                        }}
                        disabled={
                          mergePlotIndexes().length < 2 ||
                          mergePlotIndexes().indexOf(index()) === -1
                        }
                        size="xs"
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
                    width="7rem"
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

                  <Stack direction="row" width={`calc(100% - 16rem)`}>
                    <Show when={index() === 0}>
                      <Tooltip.Root>
                        <Tooltip.Trigger>
                          <IconButton
                            variant="outline"
                            disabled={splitIndex().length <= 1}
                            onclick={() => {
                              setPrevSplitIndex(splitIndex());
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
                    </Show>
                    <Show when={splitIndex().length > 1}>
                      <IconButton
                        variant={"outline"}
                        class="handle"
                        size="sm"
                        marginTop="0.4em"
                      >
                        <IconArrowAutofitHeight />
                      </IconButton>
                    </Show>
                  </Stack>
                </Stack>

                <Plot
                  id={currentID()}
                  group={tabPageProps.tabId}
                  name=""
                  header={currentHeader}
                  series={currentItems}
                  context={plots[index()]}
                  legendPanelSize={legendSplitterSize()}
                  onLegendPanelSize={(size) => {
                    setLegendSplitterSize(size);
                  }}
                  onContextChange={(ctx) => {
                    if (
                      JSON.stringify(ctx) !== JSON.stringify(plots[index()])
                    ) {
                      setPlots(index(), ctx);
                    }
                  }}
                  xScale={plotZoomState()}
                  onXScaleChange={(xRange) => {
                    if (
                      plotZoomState()[0] !== xRange[0] &&
                      plotZoomState()[1] !== xRange[1]
                    ) {
                      setPlotZoomState(xRange);
                    }
                  }}
                  yScale={
                    plotYScales()[index()] ? plotYScales()[index()] : undefined
                  }
                  onYScaleChange={(yRange) => {
                    const yScales = plotYScales();
                    const currentYScale = yScales[index()];
                    if (isNaN(yRange.min) || isNaN(yRange.max)) return;
                    if (
                      currentYScale.max !== yRange.max ||
                      currentYScale.min !== yRange.min
                    ) {
                      setPlotYScales((prev) => {
                        const update = prev.map((prevRange, i) => {
                          if (i === index()) {
                            return yRange;
                          } else {
                            return prevRange;
                          }
                        });
                        return update;
                      });
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
                  }}
                />
              </div>
            );
          }}
        </For>
      </div>
      <Show when={typeof dragOverIndex() === "number"}>
        <Stack
          background={"fg.default"}
          opacity={"0.1"}
          style={{
            position: "absolute",
            top: `max(${overlayTop()}px, 3rem)`,
            width: `${document.getElementById(`${divId}:${dragOverIndex()}`)!.offsetWidth}px`,
            left: `${document.getElementById(`${divId}:${dragOverIndex()}`)!.offsetLeft}px`,
            height: `calc(${overlayBottom()!}px - max(${overlayTop()}px, 3rem)) `,
          }}
        />
      </Show>

      <Show when={typeof dragging() === "number"}>
        <Portal>
          <Stack
            background={"bg.default"}
            borderRadius={"0.2em"}
            style={{
              position: "absolute",
              top: `${clientY()}px`,
              width: "max-content",
              left: `${clientX()}px`,
              height: `min-content`,
              padding: "0.5em",
              "border-width": "1px",
            }}
          >
            <Text
              size="xs"
              fontWeight={"bold"}
            >{`Graph ${dragging()! + 1}`}</Text>
          </Stack>
        </Portal>
      </Show>
    </Show>
  );
}
