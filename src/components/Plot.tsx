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

import uPlot, { AlignedData } from "uplot";
import "uplot/dist/uPlot.min.css";

import { GlobalStateContext } from "~/GlobalState";
import { Heading } from "~/components/ui/heading";
import { ToggleGroup } from "~/components/ui/toggle-group";
import { IconButton } from "~/components/ui/icon-button";
import {
  IconArrowsMove,
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
import { PanelSizeContext } from "./PanelLayout";
import { Splitter } from "./ui/splitter";

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
  legendSplitterSize?: PanelSizeContext[];
  onLegendSplitterSizeChange?: (size: PanelSizeContext[]) => void;
  legendShrink?: boolean;
  onLegendShrinkChange?: (isShrink: boolean) => void;
  cursorIdx?: number | null | undefined;
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
}

export function Plot(props: PlotProps) {
  const [, rest] = splitProps(props, ["name", "header", "series", "id"]);
  let fg_default = getComputedCSSVariableValue("--colors-fg-default");
  let bg_muted = getComputedCSSVariableValue("--colors-bg-muted");
  const { globalState } = useContext(GlobalStateContext)!;
  let theme = globalState.theme;

  const [render, setRender] = createSignal(false);
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
    setSetContext((_) => setCtx);

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
      setCursorMode(CursorMode.Zoom);
    } else if (event.key === "Alt") {
      // TODO: Handle alt click
    }
  };
  const cursorModeRelease = (event: KeyboardEvent) => {
    if (event.key === "Control" && cursorMode() === CursorMode.Lock) {
      setCursorMode(lastCursorMode());
    } else if (event.key === "Shift" && cursorMode() === CursorMode.Zoom) {
      setCursorMode(lastCursorMode());
    } else if (event.key === "Alt" && cursorMode() === CursorMode.None) {
      // TODO: Handle alt click
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
    }, 10);
  };

  const [dotFilter, setDotFilter] = createSignal<number[]>([]);
  const checkDotFilter = () => dotFilter();
  const [xRange, setXRange] = createSignal<number>(0);

  createEffect(() => {
    const domainWidth: number = document.getElementById(
      props.id + "-wrapper",
    )!.offsetWidth;
    const scale: number = xRange() / domainWidth;
    const array: number[] = [];

    let i: number = 0;
    while (scale > 0.1) {
      array.push(i);
      i += (Math.floor(scale) > 0
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

  function createPlot() {
    const plot_element = document.getElementById(props.id)!;
    plot_element.replaceChildren();
    const oldContext: PlotContext = unwrap(getContext());

    let series: uPlot.Series[] = [
      {
        label: "Cycle",
      },
      ...props.header.map((_, index) => ({
        label: props.header[index],
        stroke: () => oldContext.color[index],
        show: oldContext.visible[index],
        ...{
          ...(oldContext.style[index] === LegendStroke.Dash && {
            dash: [10, 5],
          }),
          ...(oldContext.style[index] === LegendStroke.Dot && {
            dash: [0, 5],
            points: {
              show: true,
              ...(dotFilter().length !== 0 && { filter: checkDotFilter() }),
            },
          }),
        },
      })),
    ];
    let scales: uPlot.Scales = {
      x: {
        time: false,
      },
    };

    // Save and restore existing plot state.
    if (plot) {
      series = plot.series;
      scales = plot.scales;
    }

    plot = new uPlot(
      {
        scales: scales,
        axes: [
          {
            stroke: fg_default,
            grid: {
              stroke: bg_muted,
            },
            ticks: {
              stroke: bg_muted,
            },
          },
          {
            stroke: fg_default,
            grid: {
              stroke: bg_muted,
            },
            ticks: {
              stroke: bg_muted,
            },
          },
        ],
        legend: {
          show: false,
        },
        width: plot_element.clientWidth,
        height: plot_element.clientHeight,
        series: series,
        cursor: {
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

                    const xUnitsPerPx = u.posToVal(1, "x") - u.posToVal(0, "x");

                    const onmove = (e: MouseEvent) => {
                      e.preventDefault();

                      const left1 = e.clientX;
                      const dx = xUnitsPerPx * (left1 - left0);

                      const minXBoundary = scXMin0 - dx;
                      const maxXBoundary = scXMax0 - dx;

                      let scaleXMin = minXBoundary;
                      let scaleXMax = maxXBoundary;

                      if (xMin >= minXBoundary) {
                        (scaleXMin = xMin), (scaleXMax = scXMax0);
                      } else if (xMax <= maxXBoundary) {
                        (scaleXMin = scXMin0), (scaleXMax = xMax);
                      }

                      uPlot.sync(group()).plots.forEach((up) => {
                        up.setScale("x", {
                          min: scaleXMin,
                          max: scaleXMax,
                        });
                      });
                    };

                    const onup = () => {
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
        },
        plugins: [wheelZoomPlugin({ factor: 0.75, group: group() })],
      },
      [
        [...Array(props.series[0].length).keys()],
        ...props.series,
      ] as AlignedData,
      plot_element,
    );
    setRender(true);

    if (props.xRange) {
      const xMin = props.xRange[0];
      const xMax = props.xRange[1];

      if (xMin >= xMax) return;
      uPlot.sync(group()).plots.forEach((up: uPlot) => {
        up.setScale("x", { min: xMin, max: xMax });
        setXRange(xMax - xMin);
      });
    }
  }

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
      resize.observe(document.getElementById(props.id)!);
    });
  });
  createEffect(() => {
    if (globalState.theme !== theme) {
      theme = globalState.theme;
      fg_default = getComputedCSSVariableValue("--colors-fg-default");
      bg_muted = getComputedCSSVariableValue("--colors-bg-muted");
      createPlot();
    }
  });

  createEffect(() => {
    setTimeout(() => {
      createPlot();
    }, 200);
  });

  const selection_css = `
    .u-select {
      background: var(--colors-fg-subtle);
      opacity: 0.1;
    }
  `;

  const [showLegendCheckBox, setShowLegendCheckBox] = createSignal<boolean>(
    false,
  );

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

  return (
    <>
      <div {...rest} id={props.id + "-wrapper"}>
        <Splitter.Root
          size={props.legendSplitterSize}
          onSizeChange={(details) => {
            const parseSize = details.size.map((panel) => {
              return {
                id: panel.id as string,
                size: Number(panel.size)!,
              };
            });
            props.onLegendSplitterSizeChange?.(parseSize);
          }}
        >
          <Splitter.Panel id="A" borderWidth="0">
            <Heading
              size="lg"
              style={{
                "padding-top": "0.25rem",
                "padding-left": "1rem",
              }}
            >
              {props.name}
            </Heading>
            <style>{selection_css}</style>
            <div
              id={props.id}
              style={{
                width: "100%",
                height: "calc(100% - 0.5rem)",
              }}
            >
            </div>
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
                id="A:B"
                opacity="0%"
                onMouseEnter={(e) => (e.currentTarget.style.opacity = "100%")}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = "0%")}
              />
            </Show>
          </Stack>
          <Splitter.Panel
            id="B"
            borderWidth="0"
            style={{
              "min-width": props.legendShrink ? "0rem" : panelMinWidth(),
            }}
          >
            <Stack width="100%" height="100%">
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
                          color={cursorMode() === CursorMode.Pan
                            ? "fg.default"
                            : "fg.muted"}
                          bgColor={cursorMode() === CursorMode.Pan
                            ? "bg.emphasized"
                            : lastCursorMode() === CursorMode.Pan
                            ? "bg.subtle"
                            : "bg.default"}
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
                          color={cursorMode() === CursorMode.Zoom
                            ? "fg.default"
                            : "fg.muted"}
                          bgColor={cursorMode() === CursorMode.Zoom
                            ? "bg.emphasized"
                            : lastCursorMode() === CursorMode.Zoom
                            ? "bg.subtle"
                            : "bg.default"}
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
                          color={cursorMode() === CursorMode.Lock
                            ? "fg.default"
                            : "fg.muted"}
                          bgColor={cursorMode() === CursorMode.Lock
                            ? "bg.emphasized"
                            : lastCursorMode() === CursorMode.Lock
                            ? "bg.subtle"
                            : "bg.default"}
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
                  </ToggleGroup.Root>

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
              </Stack>
              <Stack
                width="100%"
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
              <Show when={render()}>
                <Stack
                  id="legend_container"
                  style={{
                    "padding-bottom": "0.5rem",
                    float: "left",
                    width: "100%",
                    "max-height": "calc(100% - 1.5rem - 8rem)",
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
                      cursorIdx={props.cursorIdx}
                      readonly
                    />
                  </Stack>
                  <For each={props.header}>
                    {(header, index) => (
                      <Show when={searchResults().includes(header)}>
                        <Legend
                          plot={plot!}
                          group={group()}
                          series={header}
                          cursorIdx={props.cursorIdx}
                          showSelectCheckBox={showLegendCheckBox()}
                          selected={getContext().selected[index()]}
                          onSelectChange={(isChecked) => {
                            setContext()("selected", index(), isChecked);
                            props.onContextChange?.(getContext());
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
        </Splitter.Root>
      </div>
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

type WheelZoomPluginOpts = {
  factor: number;
  group: string;
};

function wheelZoomPlugin(opts: WheelZoomPluginOpts) {
  const factor = opts.factor || 0.75;

  let xMin: number, xMax: number, xRange: number;

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

  return {
    hooks: {
      ready: (u: uPlot) => {
        xMin = 0;
        xMax = u.data[0].length - 1!;

        xRange = xMax - xMin;

        const over = u.over;
        const rect = over.getBoundingClientRect();

        // wheel scroll zoom
        over.addEventListener("wheel", (e) => {
          e.preventDefault();

          const { left } = u.cursor;

          const leftPct = left! / rect.width;
          const xVal = u.posToVal(left!, "x");
          const oxRange = u.scales.x.max! - u.scales.x.min!;

          const nxRange = e.deltaY < 0 ? oxRange * factor : oxRange / factor;
          let nxMin = xVal - leftPct * nxRange;
          let nxMax = nxMin + nxRange;
          [nxMin, nxMax] = clamp(nxRange, nxMin, nxMax, xRange, xMin, xMax);

          uPlot.sync(opts.group).plots.forEach((up: uPlot) => {
            up.setScale("x", { min: nxMin, max: nxMax });
          });
        });
      },
    },
  };
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
