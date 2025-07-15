import {
  createEffect,
  createSignal,
  For,
  JSX,
  onCleanup,
  onMount,
  Show,
  splitProps,
  useContext,
} from "solid-js";
import { createStore, unwrap } from "solid-js/store";

import uPlot from "uplot";
import "uplot/dist/uPlot.min.css";

import { GlobalStateContext } from "~/GlobalState";
import { ToggleGroup } from "~/components/ui/toggle-group";
import { IconButton } from "~/components/ui/icon-button";
import {
  IconArrowsMove,
  IconArrowsMoveVertical,
  IconChevronLeftPipe,
  IconChevronRightPipe,
  IconCrosshair,
  IconEye,
  IconEyeOff,
  IconLocation,
  IconLocationOff,
  IconSearch,
  IconX,
  IconZoomInArea,
  IconZoomReset,
} from "@tabler/icons-solidjs";
import { Stack } from "styled-system/jsx";
import { Legend, LegendStroke } from "./Plot/Legend";
import { Tooltip } from "./ui/tooltip";
import { Text } from "./ui/text";
import { Portal } from "solid-js/web";
import uFuzzy from "@leeoniya/ufuzzy";
import { Splitter } from "./ui/splitter";
import type { CursorPluginMessageBus } from "@dschz/solid-uplot/plugins";
import { SolidUplot, createPluginBus } from "@dschz/solid-uplot";
import type { UplotPluginFactory } from "@dschz/solid-uplot";

import { cursor, tooltip } from "@dschz/solid-uplot/plugins";
import { PlotToolTip } from "./Plot/PlotTooltip";

export type PlotProps = JSX.HTMLAttributes<HTMLDivElement> & {
  id: string;
  group?: string;
  name: string;
  header: string[];
  series: number[][];
  context?: PlotContext;
  onContextChange?: (context: PlotContext) => void;
  xRange?: [number, number];
  onXRangeChange?: (xRange: [number, number]) => void;
  yRange?: { min: number; max: number };
  onYRangeChange?: (yRange: { min: number; max: number }) => void;
  legendPanelSize?: number;
  onLegendPanelSize?: (size: number) => void;
  legendShrink?: boolean;
  onLegendShrinkChange?: (isShrink: boolean) => void;
};

export type PlotContext = {
  visible: boolean[];
  color: string[];
  palette: string[];
  style: LegendStroke[];
  selected: boolean[];
};

enum CursorMode {
  None,
  Pan,
  Zoom,
  Lock,
  Vertical,
}

export function Plot(props: PlotProps) {
  const [, rest] = splitProps(props, ["name", "header", "series", "id"]);
  const { globalState } = useContext(GlobalStateContext)!;
  let theme = globalState.theme;

  const [render, setRender] = createSignal(false);
  const [cursorIdx, setCursorIdx] = createSignal<number | null>(null);
  let plot: uPlot;

  const group = () => props.group ?? props.id ?? "";

  const [ctx, setCtx] = createStore(
    props.context ? props.context : ({} as PlotContext),
  );
  const [getContext, setGetContext] = createSignal(ctx);
  const [setContext, setSetContext] = createSignal(setCtx);

  // Reset context when context prop changes.
  createEffect(() => {
    const [ctx, setCtx] = createStore(
      props.context != null ? props.context : ({} as PlotContext),
    );

    setGetContext(ctx);
    setSetContext(() => setCtx);

    if (!getContext().palette || getContext().palette.length == 0) {
      setContext()("palette", kelly_colors_hex);
    }

    if (
      !getContext().color ||
      getContext().color.length == 0 ||
      getContext().color.length !== props.header.length
    ) {
      setContext()(
        "color",
        props.header.map(
          (_, index) => kelly_colors_hex[index % kelly_colors_hex.length],
        ),
      );
    }

    if (
      !getContext().style ||
      getContext().style.length == 0 ||
      getContext().style.length !== props.header.length
    ) {
      setContext()(
        "style",
        props.header.map(() => LegendStroke.Line),
      );
    }

    if (
      !getContext().visible ||
      getContext().visible.length == 0 ||
      getContext().visible.length !== props.header.length
    ) {
      setContext()(
        "visible",
        props.header.map(() => true),
      );
    }

    setContext()(
      "selected",
      props.header.map(() => false),
    );
  });

  createEffect(() => {
    if (getContext().style.every((v) => v != LegendStroke.Dot)) return;
    const df = dotFilter();
    setTimeout(() => {
      if (df.length > 0) {
        getContext().style.forEach((style, index) => {
          if (style === LegendStroke.Dot) {
            plot.series[index + 1].points!.filter = checkDotFilter;
          }
        });
        plot.redraw();
      } else {
        let need_redraw: boolean = false;
        plot.series.forEach((series) => {
          if (series.points?.filter === checkDotFilter) {
            series.points!.filter = () => null;
            need_redraw = true;
          }
        });
        if (need_redraw) plot.redraw();
      }
    }, 100);
  });

  // Store whether zoom reset button should be disabled.
  const [zoomReset, setZoomReset] = createSignal(true);

  // Current cursor mode; changes dynamically with keypresses.
  const [cursorMode, setCursorMode] = createSignal(CursorMode.Pan);
  // Last manually set cursor mode, changes only in toggle group.
  const [lastCursorMode, setLastCursorMode] = createSignal(CursorMode.Pan);

  const cursorModeActivate = (event: KeyboardEvent) => {
    if (event.key === "Control") {
      setCursorMode(CursorMode.Lock);
    } else if (event.key === "Shift") {
      if (enterSplitter()) {
        return;
      }
      setCursorMode(CursorMode.Zoom);
    } else if (event.key === "Alt") {
      // TODO: Handle alt click
      setCursorMode(CursorMode.Vertical);
    }
  };
  const cursorModeRelease = (event: KeyboardEvent) => {
    if (event.key === "Control" && cursorMode() === CursorMode.Lock) {
      setCursorMode(lastCursorMode());
    } else if (event.key === "Shift" && cursorMode() === CursorMode.Zoom) {
      setCursorMode(lastCursorMode());
    } else if (event.key === "Alt" && cursorMode() === CursorMode.Vertical) {
      // TODO: Handle alt click
      setCursorMode(lastCursorMode());
    }
  };

  const checkZoomLevel = () => {
    setTimeout(() => {
      setZoomReset(
        !plot ||
          !plot.scales.x.min ||
          !plot.scales.x.max ||
          !(
            plot.scales.x.min > 0 || plot.scales.x.max < plot.data[0].length - 1
          ),
      );

      setXRange(plot.scales.x.max! - plot.scales.x.min!);
      props.onXRangeChange?.([plot.scales.x.min!, plot.scales.x.max!]);
      props.onYRangeChange?.({
        min: plot.scales.y.min!,
        max: plot.scales.y.max!,
      });
    }, 10);
  };

  const [dotFilter, setDotFilter] = createSignal<number[]>([]);
  const checkDotFilter = () => dotFilter();
  const [xRange, setXRange] = createSignal<number>(0);

  createEffect(() => {
    const domainWidth: number = document.getElementById(props.id)!.offsetWidth;
    const scale: number = xRange() / domainWidth;
    const array: number[] = [];

    let i: number = 0;
    while (scale > 0.1) {
      array.push(i);
      i +=
        (Math.floor(scale) > 0
          ? Math.floor(scale)
          : parseFloat(scale.toFixed(1))) * 10;
      if (i >= plot.data[0].length) {
        break;
      }
    }

    if (scale <= 0.1) array.splice(0, array.length);
    setDotFilter(array);
  });

  onMount(() => {
    document.addEventListener("keydown", cursorModeActivate);
    document.addEventListener("keyup", cursorModeRelease);
    document.addEventListener("mouseup", checkZoomLevel);
    document.addEventListener("wheel", checkZoomLevel);
  });

  onCleanup(() => {
    document.removeEventListener("keydown", cursorModeActivate);
    document.removeEventListener("keyup", cursorModeRelease);
    document.removeEventListener("mouseup", checkZoomLevel);
    document.removeEventListener("wheel", checkZoomLevel);
  });

  onMount(() => {
    // Wrap in create effect to handle ID changing.
    createEffect(() => {
      const resize = new ResizeObserver((entries) => {
        if (entries.length == 0) return;
        const entry = entries[0];
        setTimeout(() => {
          if (plot) {
            plot.setSize({
              width: entry.contentRect.width,
              height: entry.contentRect.height,
            });
          }
        }, 200);
      });
      resize.observe(document.getElementById(`${props.id}`)!);
    });
  });

  const [fgDefault, setFgDefault] = createSignal<string>(
    getComputedCSSVariableValue("--colors-fg-default"),
  );
  const [bgMuted, setBgMuted] = createSignal<string>(
    getComputedCSSVariableValue("--colors-bg-muted"),
  );

  createEffect(() => {
    if (globalState.theme !== theme) {
      theme = globalState.theme;
      setFgDefault(getComputedCSSVariableValue("--colors-fg-default"));
      setBgMuted(getComputedCSSVariableValue("--colors-bg-muted"));
    }
  });

  const selection_css = `
    .u-select {
      background: var(--colors-fg-subtle);
      opacity: 0.1;
    }
  `;

  const [showLegendCheckBox, setShowLegendCheckBox] =
    createSignal<boolean>(false);

  const [isAllVisible, setIsAllVisible] = createSignal<boolean>(
    getContext().visible ? getContext().visible.every((b) => b) : true,
  );

  const [searchResults, setSearchResults] = createSignal<string[]>(
    props.header,
  );
  const [searchInput, setSearchInput] = createSignal<string>("");

  createEffect(() => {
    const searchInputValue = searchInput();
    const parseSearchResults: string[] = fuzzySearch(
      searchInputValue,
      props.header,
    );
    if (searchInputValue.length === 0) {
      setSearchResults(props.header);
    } else {
      setSearchResults(parseSearchResults);
    }
  });

  const [panelMinWidth, setPanelMinWidth] = createSignal<string>("");
  // Needed for legend panel min-width.
  createEffect(() => {
    if (!render()) return;
    if (document.getElementById(`toolBox:${props.id}`)) {
      setPanelMinWidth(
        `${document.getElementById(`toolBox:${props.id}`)!.offsetWidth}px`,
      );
    }
  });

  const bus = createPluginBus<CursorPluginMessageBus>();

  onCleanup(() => {
    if (plot) {
      uPlot.sync(group()).unsub(plot);
    }
  });

  const [prevCheck, setPrevCheck] = createSignal<number | null>(null);
  const [enterSplitter, setEnterSplitter] = createSignal<boolean>(false);
  const multiSelect = (index: number, prevIndex: number) => {
    const select = getContext().selected;
    const min = Math.min(index, prevIndex + 1);
    const max = Math.max(index, prevIndex);

    const shiftSelect = select.slice(min, max);
    const shiftSelectState = [...new Set(shiftSelect)];
    const isAllSame = shiftSelectState.length !== 2;

    if (isAllSame) {
      const updateSelected = select.map((selected, i) => {
        if (i >= min && i <= max) {
          return !shiftSelectState[0];
        } else {
          return selected;
        }
      });
      setContext()("selected", updateSelected);
      return;
    }
  };

  const getPlotYMax = (u: uPlot): number => {
    const plotYMax: number = props.series
      .map((series) => [...new Set(series)].sort((a, b) => b - a)[0])
      .sort((a, b) => b - a)[0];

    const yMin = u.scales.y.min!;
    const yMax = u.scales.y.max!;
    const yRange = yMax - yMin;

    const plotHeight = u.over.offsetHeight;
    const three_rem =
      parseFloat(getComputedStyle(document.documentElement).fontSize) * 6;

    const percent = three_rem / plotHeight;
    const yMaxPadding = yRange * percent;
    return plotYMax + yMaxPadding;
  };

  const wheelZoomPlugin = (opts: {
    factor: number;
    group: string;
  }): UplotPluginFactory<CursorPluginMessageBus> => {
    return () => {
      const factor = opts.factor || 0.75;

      let xMin: number,
        xMax: number,
        xRange: number,
        yMin: number,
        yMax: number,
        yRange: number;

      return {
        hooks: {
          ready: (u) => {
            xMin = 0;
            xMax = u.data[0].length - 1!;

            xRange = xMax - xMin;

            yMin = 0;
            yMax = getPlotYMax(u);

            yRange = yMax - yMin;

            const over = u.over;
            const rect = over.getBoundingClientRect();

            // wheel scroll zoom
            over.addEventListener("wheel", (e) => {
              e.preventDefault();

              const { left, top } = u.cursor;

              const leftPct = left! / rect.width;
              const xVal = u.posToVal(left!, "x");
              const oxRange = u.scales.x.max! - u.scales.x.min!;

              const nxRange =
                e.deltaY < 0 ? oxRange * factor : oxRange / factor;
              let nxMin = xVal - leftPct * nxRange;
              let nxMax = nxMin + nxRange;
              [nxMin, nxMax] = clamp(nxRange, nxMin, nxMax, xRange, xMin, xMax);

              // y Zoom
              const btmPct = 1 - top! / rect.height;
              const yVal = u.posToVal(top!, "y");
              const oyRange = u.scales.y.max! - u.scales.y.min!;

              const nyRange =
                e.deltaY < 0 ? oyRange * factor : oyRange / factor;
              let nyMin = yVal - btmPct * nyRange;
              let nyMax = nyMin + nyRange;
              [nyMin, nyMax] = clamp(nyRange, nyMin, nyMax, yRange, yMin, yMax);

              if (cursorMode() === CursorMode.Vertical) {
                u.setScale("y", { min: nyMin, max: nyMax });
              } else {
                uPlot.sync(opts.group).plots.forEach((up: uPlot) => {
                  up.setScale("x", { min: nxMin, max: nxMax });
                  up.setScale("y", {
                    min: up.scales.y.min!,
                    max: up.scales.y.max!,
                  });
                });
              }
            });
          },
        },
      };
    };
  };

  const [yMin, setYMin] = createSignal<number | null>(null);
  const [yMax, setYMax] = createSignal<number | null>(null);
  const [selectionLeft, setSelectionLeft] = createSignal<number | null>(null);
  const [selectionWidth, setSelectionWidth] = createSignal<number | null>(null);

  return (
    <>
      <div {...rest}>
        <Splitter.Root
          id={props.id}
          style={{ width: "100%", height: "100%", "padding-right": "0.5rem" }}
          panels={[{ id: `plot-${props.id}` }, { id: `legend-${props.id}` }]}
          size={
            props.legendPanelSize
              ? [100 - props.legendPanelSize, props.legendPanelSize]
              : [100, 0]
          }
          onResize={(details) => {
            const size = details.size;
            const updatedSize = size[1];
            props.onLegendPanelSize?.(updatedSize);
          }}
        >
          <Splitter.Panel
            id={`plot-${props.id}`}
            borderWidth="0"
            width="100%"
            height="100%"
          >
            <div id={props.id} style={{ width: "100%", height: "100%" }}>
              <SolidUplot
                onCreate={(e) => {
                  plot = e as uPlot;
                  setRender(true);
                  uPlot.sync(group()).sub(plot);
                  onMount(() => {
                    if (props.xRange) {
                      uPlot.sync(group()).plots.forEach((up) => {
                        setTimeout(() => {
                          up.setScale("x", {
                            min: unwrap(props.xRange)![0],
                            max: unwrap(props.xRange)![1],
                          });
                        }, 0);
                      });
                    }
                  });
                }}
                onCursorMove={(e) => {
                  setCursorIdx(e.cursor.xValue);
                }}
                cursor={{
                  sync: {
                    key: group(),
                  },
                  bind: {
                    mousedown: (u, _targ, handler) => {
                      return (e) => {
                        if (e.button == 0) {
                          // Always release cursor lock if not control-clicking.
                          if (cursorMode() !== CursorMode.Lock) {
                            // @ts-ignore: TSC unable to detect `_lock` field
                            if (u.cursor._lock) {
                              uPlot.sync(group()).plots.forEach((up) => {
                                // @ts-ignore: TSC unable to detect `_lock` field
                                up.cursor._lock = false;
                              });
                            }
                          } else {
                            // @ts-ignore: TSC unable to detect `_lock` field
                            const new_lock = !u.cursor._lock;
                            // Lock cursor in plot only when control-clicking.
                            uPlot.sync(group()).plots.forEach((up) => {
                              // @ts-ignore: TSC unable to detect `_lock` field
                              up.cursor._lock = new_lock;
                            });
                            return null;
                          }

                          if (cursorMode() === CursorMode.Zoom) {
                            handler(e);
                          } else if (cursorMode() === CursorMode.Pan) {
                            const xMin = 0;
                            const xMax = u.data[0].length;

                            const left0 = e.clientX;

                            const scXMin0 = u.scales.x.min!;
                            const scXMax0 = u.scales.x.max!;

                            const xUnitsPerPx =
                              u.posToVal(1, "x") - u.posToVal(0, "x");

                            const yMin = 0;
                            const yMax = getPlotYMax(u);

                            const top0 = e.clientY;

                            const scYMin0 = u.scales.y.min!;
                            const scYMax0 = u.scales.y.max!;

                            const yUnitsPerPx =
                              u.posToVal(1, "y") - u.posToVal(0, "y");

                            const onmove = (e: MouseEvent) => {
                              e.preventDefault();

                              const left1 = e.clientX;
                              const dx = xUnitsPerPx * (left1 - left0);

                              const minXBoundary = scXMin0 - dx;
                              const maxXBoundary = scXMax0 - dx;

                              let scaleXMin = minXBoundary;
                              let scaleXMax = maxXBoundary;

                              if (xMin >= minXBoundary) {
                                scaleXMin = xMin;
                                scaleXMax = scXMax0;
                              } else if (xMax <= maxXBoundary) {
                                scaleXMin = scXMin0;
                                scaleXMax = xMax;
                              }

                              // Tilting (Vertical panning)
                              const top1 = e.clientY;
                              const topDx = yUnitsPerPx * (top1 - top0);

                              const minYBoundary = scYMin0 - topDx;
                              const maxYBoundary = scYMax0 - topDx;

                              let scaleYMin = minYBoundary;
                              let scaleYMax = maxYBoundary;

                              if (yMin >= minYBoundary) {
                                scaleYMin = yMin;
                                scaleYMax = scYMax0;
                              } else if (yMax <= maxYBoundary) {
                                scaleYMin = scYMin0;
                                scaleYMax = yMax;
                              }

                              uPlot.sync(group()).plots.forEach((up) => {
                                up.setScale("x", {
                                  min: scaleXMin,
                                  max: scaleXMax,
                                });
                              });
                              u.setScale("y", {
                                min: scaleYMin,
                                max: scaleYMax,
                              });
                              props.onYRangeChange?.({
                                min: scaleYMin,
                                max: scaleYMax,
                              });
                            };

                            const onup = () => {
                              document.removeEventListener("mousemove", onmove);
                              document.removeEventListener("mouseup", onup);
                            };

                            document.addEventListener("mousemove", onmove);
                            document.addEventListener("mouseup", onup);
                          } else if (cursorMode() === CursorMode.Vertical) {
                            const y0 = e.clientY;

                            setYMin(e.clientY);
                            setSelectionLeft(
                              document.getElementById(props.id)!.offsetLeft +
                                u.over.offsetLeft,
                            );
                            setSelectionWidth(u.over.offsetWidth);

                            let y1: number | null = null;
                            const uOverTop = u.over.offsetTop;
                            const uOverHeight = u.over.offsetHeight;
                            const uPlotDivTop = document.getElementById(
                              props.id,
                            )!.offsetTop;

                            const onmove = (e: MouseEvent) => {
                              y1 = e.clientY;
                              const uPlotTop = uPlotDivTop + uOverTop;
                              const uPlotBottom = uPlotTop + uOverHeight;
                              if (y1 <= uPlotTop) {
                                setYMax(uPlotTop);
                              } else if (y1 >= uPlotBottom) {
                                setYMax(uPlotBottom);
                              } else {
                                setYMax(y1);
                              }
                            };

                            const onup = () => {
                              if (y1) {
                                let startNumber = Math.min(y0, y1);
                                let endNumber = Math.max(y0, y1);
                                if (
                                  endNumber - uPlotDivTop - uOverTop >=
                                  uOverHeight
                                ) {
                                  endNumber = uOverHeight;
                                }

                                if (startNumber - uPlotDivTop - uOverTop <= 0) {
                                  startNumber = 0;
                                }

                                const cursorMin =
                                  startNumber - uPlotDivTop - uOverTop;
                                const cursorMax =
                                  endNumber - uPlotDivTop - uOverTop;

                                const yMin = u.scales.y.min!;
                                const yMax = u.scales.y.max!;
                                const yRange = yMax - yMin;

                                const minPercent = cursorMin / uOverHeight;
                                const scaleYMin = yMax - yRange * minPercent;

                                const maxPercent = cursorMax / uOverHeight;
                                const scaleYMax = yMax - yRange * maxPercent;

                                u.setScale("y", {
                                  min: scaleYMin,
                                  max: scaleYMax,
                                });

                                /*props.onYRangeChange?.({
                                  min: scaleYMin,
                                  max: scaleYMax,
                                });*/

                                setYMin(null);
                                setYMax(null);
                                setSelectionLeft(null);
                                setSelectionWidth(null);
                              }

                              document.removeEventListener("mousemove", onmove);
                              document.removeEventListener("mouseup", onup);
                            };

                            document.addEventListener("mousemove", onmove);
                            document.addEventListener("mouseup", onup);
                          }
                        }

                        return null;
                      };
                    },
                    mouseup: (u, _targ, handler) => {
                      return (e) => {
                        if (e.button == 0) {
                          // Prevent accidental micro-drags.
                          if (u.select.width < 10) {
                            u.select.width = 0;
                          }
                          handler(e);
                        }
                        return null;
                      };
                    },
                  },
                }}
                autoResize={true}
                axes={[
                  {
                    stroke: fgDefault(),
                    grid: {
                      stroke: bgMuted(),
                    },
                    ticks: {
                      stroke: bgMuted(),
                    },
                  },
                  {
                    stroke: fgDefault(),
                    grid: {
                      stroke: bgMuted(),
                    },
                    ticks: {
                      stroke: bgMuted(),
                    },
                  },
                ]}
                data={[
                  Array.from({ length: props.series[0].length }, (_, i) => i), // x values
                  ...props.series,
                ]}
                scales={{
                  x: {
                    time: false,
                  },
                }}
                series={
                  plot! && plot.series
                    ? plot.series
                    : [
                        {
                          label: "Cycle",
                        },
                        ...props.header.map((_, index) => ({
                          label: props.header[index],
                          stroke: () => unwrap(getContext()).color[index],
                          show: unwrap(getContext()).visible[index],
                          ...{
                            ...(unwrap(getContext()).style[index] ===
                              LegendStroke.Dash && {
                              dash: [10, 5],
                            }),
                            ...(unwrap(getContext()).style[index] ===
                              LegendStroke.Dot && {
                              dash: [0, 5],
                              points: {
                                show: true,
                                ...(dotFilter().length !== 0 && {
                                  filter: checkDotFilter(),
                                }),
                              },
                            }),
                          },
                        })),
                      ]
                }
                plugins={[
                  cursor(),
                  wheelZoomPlugin({ factor: 0.75, group: group() }),
                  tooltip(PlotToolTip, {
                    placement: "top-right",
                  }),
                ]}
                pluginBus={bus}
              />
            </div>

            <style>{selection_css}</style>
          </Splitter.Panel>

          <Stack direction="row" height="100%" gap="0">
            <IconButton
              size="sm"
              padding="0"
              variant="ghost"
              onClick={() => {
                props.onLegendShrinkChange?.(
                  props.legendShrink !== undefined
                    ? !props.legendShrink
                    : false,
                );
              }}
              marginRight={props.legendShrink ? "1rem" : "0rem"}
            >
              <Show
                when={props.legendShrink}
                fallback={<IconChevronRightPipe />}
              >
                <IconChevronLeftPipe />
              </Show>
            </IconButton>
            <Show when={!props.legendShrink}>
              <Splitter.ResizeTrigger
                id={`plot-${props.id}:legend-${props.id}`}
                opacity="0%"
                onMouseEnter={(e) => (e.currentTarget.style.opacity = "100%")}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = "0%")}
              />
            </Show>
          </Stack>
          <Show when={!props.legendShrink}>
            <Splitter.Panel
              id={`legend-${props.id}`}
              borderWidth="0"
              style={{
                "min-width": props.legendShrink ? "0rem" : panelMinWidth(),
              }}
              onMouseEnter={() => {
                setEnterSplitter(true);
                setCursorMode(lastCursorMode());
              }}
              onMouseLeave={(e) => {
                if (e.shiftKey) {
                  setCursorMode(CursorMode["Zoom"]);
                }
                setEnterSplitter(false);
              }}
            >
              <Stack width="100%" height="100%" id={`legend-${props.id}`}>
                <Stack
                  direction="row-reverse"
                  style={{
                    height: "2.5rem",
                    width: "100%",
                  }}
                >
                  <Stack
                    direction="row"
                    id={`toolBox:${props.id}`}
                    width="15rem"
                    paddingRight="1rem"
                  >
                    <Tooltip.Root>
                      <Tooltip.Trigger>
                        <IconButton
                          variant="outline"
                          disabled={zoomReset()}
                          onclick={() => {
                            uPlot.sync(group()).plots.forEach((up: uPlot) => {
                              const xMax = Number(up.data[0].length - 1);
                              up.setScale("x", { min: 0, max: xMax });
                              setXRange(xMax);
                              props.onXRangeChange?.([0, xMax]);
                            });
                          }}
                        >
                          <IconZoomReset />
                        </IconButton>
                      </Tooltip.Trigger>
                      <Tooltip.Positioner>
                        <Tooltip.Content backgroundColor="bg.default">
                          <Text color="fg.default">Zoom Reset</Text>
                        </Tooltip.Content>
                      </Tooltip.Positioner>
                    </Tooltip.Root>

                    <ToggleGroup.Root
                      value={[CursorMode[lastCursorMode()]]}
                      onValueChange={(details) => {
                        if (details.value.length > 0) {
                          setCursorMode(
                            CursorMode[
                              details.value[0] as keyof typeof CursorMode
                            ],
                          );
                          setLastCursorMode(cursorMode());
                        } else {
                          setCursorMode(CursorMode.None);
                          setCursorMode(lastCursorMode());
                        }
                      }}
                    >
                      <Tooltip.Root>
                        <Tooltip.Trigger>
                          <ToggleGroup.Item
                            value={CursorMode[CursorMode.Pan]}
                            aria-label="Toggle Pan"
                            color={
                              cursorMode() === CursorMode.Pan
                                ? "fg.default"
                                : "fg.muted"
                            }
                            bgColor={
                              cursorMode() === CursorMode.Pan
                                ? "bg.emphasized"
                                : lastCursorMode() === CursorMode.Pan
                                  ? "bg.subtle"
                                  : "bg.default"
                            }
                          >
                            <IconArrowsMove />
                          </ToggleGroup.Item>
                        </Tooltip.Trigger>
                        <Portal>
                          <Tooltip.Positioner>
                            <Tooltip.Content backgroundColor="bg.default">
                              <Text color="fg.default">Plot Panning</Text>
                            </Tooltip.Content>
                          </Tooltip.Positioner>
                        </Portal>
                      </Tooltip.Root>

                      <Tooltip.Root>
                        <Tooltip.Trigger>
                          <ToggleGroup.Item
                            value={CursorMode[CursorMode.Zoom]}
                            aria-label="Toggle Selection Zoom"
                            color={
                              cursorMode() === CursorMode.Zoom
                                ? "fg.default"
                                : "fg.muted"
                            }
                            bgColor={
                              cursorMode() === CursorMode.Zoom
                                ? "bg.emphasized"
                                : lastCursorMode() === CursorMode.Zoom
                                  ? "bg.subtle"
                                  : "bg.default"
                            }
                          >
                            <IconZoomInArea />
                          </ToggleGroup.Item>
                        </Tooltip.Trigger>
                        <Portal>
                          <Tooltip.Positioner>
                            <Tooltip.Content backgroundColor="bg.default">
                              <Text color="fg.default">Selection Zoom</Text>
                            </Tooltip.Content>
                          </Tooltip.Positioner>
                        </Portal>
                      </Tooltip.Root>

                      <Tooltip.Root>
                        <Tooltip.Trigger>
                          <ToggleGroup.Item
                            value={CursorMode[CursorMode.Lock]}
                            aria-label="Toggle Cursor Lock"
                            color={
                              cursorMode() === CursorMode.Lock
                                ? "fg.default"
                                : "fg.muted"
                            }
                            bgColor={
                              cursorMode() === CursorMode.Lock
                                ? "bg.emphasized"
                                : lastCursorMode() === CursorMode.Lock
                                  ? "bg.subtle"
                                  : "bg.default"
                            }
                          >
                            <IconCrosshair />
                          </ToggleGroup.Item>
                        </Tooltip.Trigger>
                        <Portal>
                          <Tooltip.Positioner>
                            <Tooltip.Content backgroundColor="bg.default">
                              <Text color="fg.default">Cursor Lock</Text>
                            </Tooltip.Content>
                          </Tooltip.Positioner>
                        </Portal>
                      </Tooltip.Root>

                      <Tooltip.Root>
                        <Tooltip.Trigger>
                          <ToggleGroup.Item
                            value={CursorMode[CursorMode.Vertical]}
                            aria-label="Toggle Cursor Lock"
                            color={
                              cursorMode() === CursorMode.Vertical
                                ? "fg.default"
                                : "fg.muted"
                            }
                            bgColor={
                              cursorMode() === CursorMode.Vertical
                                ? "bg.emphasized"
                                : lastCursorMode() === CursorMode.Vertical
                                  ? "bg.subtle"
                                  : "bg.default"
                            }
                          >
                            <IconArrowsMoveVertical />
                          </ToggleGroup.Item>
                        </Tooltip.Trigger>
                        <Portal>
                          <Tooltip.Positioner>
                            <Tooltip.Content backgroundColor="bg.default">
                              <Text color="fg.default">Vertical Zoom</Text>
                            </Tooltip.Content>
                          </Tooltip.Positioner>
                        </Portal>
                      </Tooltip.Root>
                    </ToggleGroup.Root>
                  </Stack>
                </Stack>

                <Stack width={`calc(100% - 1rem)`} direction="row">
                  <Stack
                    width={`calc(100% - 3rem)`}
                    direction="row"
                    borderWidth="1px"
                    borderRadius="1rem"
                    paddingLeft="0.5rem"
                    padding="0.3rem"
                    gap="2"
                  >
                    <IconSearch />
                    <input
                      value={searchInput()}
                      onInput={(e) => {
                        setSearchInput(e.target.value);
                      }}
                      placeholder="Search series"
                      style={{
                        border: "none",
                        outline: "none",
                        "white-space": "nowrap",
                        overflow: "hidden",
                        display: "block",
                        "text-overflow": "ellipsis",
                        width: `calc(100% - 3rem)`,
                      }}
                      height="2.5rem"
                    />
                    <IconButton
                      variant="ghost"
                      onClick={() => setSearchInput("")}
                      padding="0"
                      size="sm"
                      width="3rem"
                      height="1.5rem"
                      borderRadius="3rem"
                    >
                      <IconX />
                    </IconButton>
                  </Stack>
                  <Tooltip.Root>
                    <Tooltip.Trigger>
                      <IconButton
                        variant="outline"
                        onClick={() => {
                          if (showLegendCheckBox()) {
                            setContext()(
                              "selected",
                              props.header.map(() => false),
                            );
                          }
                          setShowLegendCheckBox(!showLegendCheckBox());
                        }}
                      >
                        <Show
                          when={showLegendCheckBox()}
                          fallback={<IconLocationOff />}
                        >
                          <IconLocation />
                        </Show>
                      </IconButton>
                    </Tooltip.Trigger>
                    <Tooltip.Positioner>
                      <Tooltip.Content backgroundColor="bg.default">
                        <Text color="fg.default">Select</Text>
                      </Tooltip.Content>
                    </Tooltip.Positioner>
                  </Tooltip.Root>
                </Stack>
                <Show when={render()}>
                  <Stack
                    style={{
                      "padding-bottom": "0.5rem",
                      float: "left",
                      width: "100%",
                      "max-height": "calc(100% - 1.5rem - 6rem)",
                      "overflow-x": "auto",
                      "overflow-y": "auto",
                    }}
                  >
                    <Stack direction="row" gap="1.5">
                      <IconButton
                        size="sm"
                        variant="link"
                        onClick={() => {
                          setIsAllVisible(!isAllVisible());
                          setContext()(
                            "visible",
                            getContext().visible.map(() => isAllVisible()),
                          );
                          getContext().visible.forEach((val, i) => {
                            plot.setSeries(i + 1, {
                              show: val,
                            });
                          });
                          props.onContextChange?.(getContext());
                        }}
                      >
                        <Show when={isAllVisible()} fallback={<IconEye />}>
                          <IconEyeOff />
                        </Show>
                      </IconButton>
                      <Legend
                        plot={plot!}
                        series="Cycle"
                        group={group()}
                        width="min-content"
                        cursorIdx={cursorIdx()}
                        readonly
                      />
                    </Stack>
                    <For each={props.header}>
                      {(header, index) => (
                        <Show when={searchResults().includes(header)}>
                          <Legend
                            plot={plot}
                            group={group()}
                            series={header}
                            cursorIdx={cursorIdx()}
                            showSelectCheckBox={showLegendCheckBox()}
                            selected={getContext().selected[index()]}
                            onSelectChange={(isChecked, shiftKey) => {
                              if (
                                shiftKey === true &&
                                typeof prevCheck() === "number"
                              ) {
                                multiSelect(index(), prevCheck()!);
                                setPrevCheck(null);
                                return;
                              } else {
                                setContext()("selected", index(), isChecked);
                                setPrevCheck(index());
                                props.onContextChange?.(getContext());
                              }
                            }}
                            visible={getContext().visible[index()]}
                            onVisibleChange={(new_visible) => {
                              setContext()("visible", index(), new_visible);
                              // Index must add 1 to account for X-axis "Cycle" series
                              plot.setSeries(index() + 1, {
                                show: new_visible,
                              });
                              props.onContextChange?.(getContext());
                            }}
                            color={getContext().color[index()]}
                            onColorChange={(new_color) => {
                              setContext()("color", index(), new_color);
                              props.onContextChange?.(getContext());
                              plot.redraw();
                            }}
                            palette={getContext().palette}
                            width="min-content"
                            stroke={getContext().style[index()]}
                            onStrokeChange={(new_style) => {
                              setContext()("style", index(), new_style);
                              plot.delSeries(index() + 1);
                              const config = {
                                stroke: getContext().color[index()],
                                label: header,
                                ...(getContext().style[index()] ===
                                  LegendStroke.Dash && {
                                  dash: [10, 5],
                                }),
                                ...(getContext().style[index()] ===
                                  LegendStroke.Dot && {
                                  dash: [0, 5],
                                  points: {
                                    show: true,
                                    ...(dotFilter().length !== 0 && {
                                      filter: checkDotFilter,
                                    }),
                                  },
                                }),
                              };
                              plot.addSeries(config, index() + 1);
                              props.onContextChange?.(getContext());
                              setTimeout(() => {
                                plot.redraw();
                              }, 200);
                            }}
                          />
                        </Show>
                      )}
                    </For>
                  </Stack>
                </Show>
              </Stack>
            </Splitter.Panel>
          </Show>
        </Splitter.Root>
      </div>
      <Show when={yMin() && yMax()}>
        <Stack
          position="absolute"
          pointerEvents="none"
          backgroundColor="fg.subtle"
          style={{
            top: `${Math.min(yMax()!, yMin()!)}px`,
            left: `${selectionLeft()}px`,
            width: `${selectionWidth()}px`,
            height: `${Math.max(yMax()!, yMin()!) - Math.min(yMax()!, yMin()!)}px`,
            opacity: "0.1",
          }}
        />
      </Show>
    </>
  );
}
function getComputedCSSVariableValue(variable: string) {
  let value = getComputedStyle(document.documentElement).getPropertyValue(
    variable,
  );

  while (value.startsWith("var(")) {
    // Extract the name of the referenced variable
    const referencedVarName = value.slice(4, value.length - 1);
    value = getComputedStyle(document.documentElement).getPropertyValue(
      referencedVarName,
    );
  }

  return value.trim();
}

function clamp(
  nRange: number,
  nMin: number,
  nMax: number,
  fRange: number,
  fMin: number,
  fMax: number,
) {
  if (nRange > fRange) {
    nMin = fMin;
    nMax = fMax;
  } else if (nMin < fMin) {
    nMin = fMin;
    nMax = fMin + nRange;
  } else if (nMax > fMax) {
    nMax = fMax;
    nMin = fMax - nRange;
  }

  return [nMin, nMax];
}
const kelly_colors_hex = [
  "#FFB300", // Vivid Yellow
  "#803E75", // Strong Purple
  "#FF6800", // Vivid Orange
  "#A6BDD7", // Very Light Blue
  "#C10020", // Vivid Red
  "#CEA262", // Grayish Yellow
  "#817066", // Medium Gray

  // The following don't work well for people with color impairments.
  "#007D34", // Vivid Green
  "#F6768E", // Strong Purplish Pink
  "#00538A", // Strong Blue
  "#FF7A5C", // Strong Yellowish Pink
  "#53377A", // Strong Violet
  "#FF8E00", // Vivid Orange Yellow
  "#B32851", // Strong Purplish Red
  "#F4C800", // Vivid Greenish Yellow
  "#7F180D", // Strong Reddish Brown
  "#93AA00", // Vivid Yellowish Green
  "#593315", // Deep Yellowish Brown
  "#F13A13", // Vivid Reddish Orange
  "#232C16", // Dark Olive Green
];

function fuzzySearch(searchInputValue: string, headers: string[]): string[] {
  const uf = new uFuzzy({});
  // Pre-filter
  const idxs = uf.filter(headers, searchInputValue);

  if (idxs != null && idxs.length > 0) {
    const info = uf.info(idxs, headers, searchInputValue);
    const order = uf.sort(info, headers, searchInputValue);
    const result = [];
    for (let i = 0; i < order.length; i++) {
      result.push(headers[idxs[i]]);
    }
    return result;
  } else {
    return [];
  }
}
