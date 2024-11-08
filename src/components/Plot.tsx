import {
  For,
  JSX,
  Show,
  createEffect,
  createSignal,
  onCleanup,
  onMount,
  splitProps,
  useContext,
} from "solid-js";
import { createStore } from "solid-js/store";

import uPlot, { AlignedData } from "uplot";
import "uplot/dist/uPlot.min.css";

import { GlobalStateContext } from "~/GlobalState";
import { Heading } from "~/components/ui/heading";
import { ToggleGroup } from "~/components/ui/toggle-group";
import { IconButton } from "~/components/ui/icon-button";
import {
  IconArrowsMove,
  IconCrosshair,
  IconZoomInArea,
  IconZoomReset,
} from "@tabler/icons-solidjs";
import { Stack } from "styled-system/jsx";
import { Legend, LegendStroke } from "./Plot/Legend";

export type PlotProps = JSX.HTMLAttributes<HTMLDivElement> & {
  id: string;
  group?: string;
  name: string;
  header: string[];
  series: number[][];
  context?: PlotContext;
};

export type PlotContext = {
  visible: boolean[];
  color: string[];
  palette: string[];
  style: LegendStroke[];
};

enum CursorMode {
  None,
  Pan,
  Zoom,
  Lock,
}

export function Plot(props: PlotProps) {
  const [, rest] = splitProps(props, ["name", "header", "series", "id"]);
  var fg_default = getComputedCSSVariableValue("--colors-fg-default");
  var bg_muted = getComputedCSSVariableValue("--colors-bg-muted");
  const { globalState } = useContext(GlobalStateContext)!;
  var theme = globalState.theme;

  const [render, setRender] = createSignal(false);
  var plot: uPlot;

  const group = () => props.group ?? props.id;

  const [ctx, setCtx] = createStore(
    props.context != null ? props.context : ({} as PlotContext),
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

    setContext()(
      "color",
      props.header.map(
        (_, index) => kelly_colors_hex[index % kelly_colors_hex.length],
      ),
    );

    setContext()(
      "style",
      props.header.map(() => LegendStroke.Line),
    );

    setContext()(
      "visible",
      props.header.map(() => true),
    );
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
    }
  };
  const cursorModeRelease = (event: KeyboardEvent) => {
    if (event.key === "Control" && cursorMode() === CursorMode.Lock) {
      setCursorMode(lastCursorMode());
    } else if (event.key === "Shift" && cursorMode() === CursorMode.Zoom) {
      setCursorMode(lastCursorMode());
    } else if (event.key === "Alt" && cursorMode() === CursorMode.None) {
    }
  };

  const checkZoomLevel = async () => {
    setTimeout(() => {
      setZoomReset(
        !plot ||
          !plot.scales.x.min ||
          !plot.scales.x.max ||
          !(
            plot.scales.x.min > 0 || plot.scales.x.max < plot.data[0].length - 1
          ),
      );
    }, 10);
  };

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
    var plot_element = document.getElementById(props.id)!;
    plot_element.replaceChildren();

    var series: uPlot.Series[] = [
      {
        label: "Cycle",
      },
      ...props.header.map((_, index) => ({
        label: props.header[index],
        stroke: () => getContext().color[index],
      })),
    ];
    var scales: uPlot.Scales = {
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
                    // @ts-ignore
                    if (u.cursor._lock) {
                      uPlot.sync(group()).plots.forEach((up) => {
                        // @ts-ignore
                        up.cursor._lock = false;
                      });
                    }
                  } else {
                    // @ts-ignore
                    const new_lock = !u.cursor._lock;
                    // Lock cursor in plot only when control-clicking.
                    uPlot.sync(group()).plots.forEach((up) => {
                      // @ts-ignore
                      up.cursor._lock = new_lock;
                    });
                    return null;
                  }

                  if (cursorMode() === CursorMode.Zoom) {
                    handler(e);
                  } else if (cursorMode() === CursorMode.Pan) {
                    let xMin = 0;
                    let xMax = u.data[0].length;

                    let left0 = e.clientX;

                    let scXMin0 = u.scales.x.min!;
                    let scXMax0 = u.scales.x.max!;

                    let xUnitsPerPx = u.posToVal(1, "x") - u.posToVal(0, "x");

                    function onmove(e: any) {
                      e.preventDefault();

                      let left1 = e.clientX;
                      const dx = xUnitsPerPx * (left1 - left0);

                      let minXBoundary = scXMin0 - dx;
                      let maxXBoundary = scXMax0 - dx;

                      var scaleXMin = minXBoundary;
                      var scaleXMax = maxXBoundary;

                      if (xMin >= minXBoundary)
                        (scaleXMin = xMin), (scaleXMax = scXMax0);
                      else if (xMax <= maxXBoundary)
                        (scaleXMin = scXMin0), (scaleXMax = xMax);
                      else (scaleXMin = scaleXMin), (scaleXMax = scaleXMax);

                      uPlot.sync(group()).plots.forEach((up) => {
                        up.setScale("x", {
                          min: scaleXMin,
                          max: scaleXMax,
                        });
                      });
                    }

                    function onup() {
                      document.removeEventListener("mousemove", onmove);
                      document.removeEventListener("mouseup", onup);
                    }

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
    setContext()(
      "visible",
      props.header.map(() => true),
    );
  }

  onMount(() => {
    // Wrap in create effect to handle ID changing.
    createEffect(() => {
      var resize = new ResizeObserver((entries) => {
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
  createEffect(createPlot);

  const selection_css = `
    .u-select {
      background: var(--colors-fg-subtle);
      opacity: 0.1;
    }
  `;

  return (
    <>
      <div {...rest} id={props.id + "-wrapper"}>
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
            float: "left",
            width: "calc(100% - 15rem)",
            height: "calc(100% - 0.5rem)",
          }}
        ></div>
        <Stack
          direction={"row"}
          style={{
            float: "left",
            height: "2.5rem",
            "margin-top": "0.5rem",
          }}
        >
          <IconButton
            variant={"outline"}
            disabled={zoomReset()}
            onclick={() => {
              uPlot.sync(group()).plots.forEach((up: uPlot) => {
                up.setScale("x", { min: 0, max: up.data[0].length - 1 });
              });
            }}
          >
            <IconZoomReset />
          </IconButton>
          <ToggleGroup.Root
            value={[CursorMode[lastCursorMode()]]}
            onValueChange={(details) => {
              if (details.value.length > 0) {
                setCursorMode(
                  CursorMode[details.value[0] as keyof typeof CursorMode],
                );
                setLastCursorMode(cursorMode());
              } else {
                setCursorMode(CursorMode.None);
                setCursorMode(lastCursorMode());
              }
            }}
          >
            <ToggleGroup.Item
              value={CursorMode[CursorMode.Pan]}
              aria-label="Toggle Pan"
              color={
                cursorMode() === CursorMode.Pan ? "fg.default" : "fg.muted"
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
            <ToggleGroup.Item
              value={CursorMode[CursorMode.Zoom]}
              aria-label="Toggle Selection Zoom"
              color={
                cursorMode() === CursorMode.Zoom ? "fg.default" : "fg.muted"
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
            <ToggleGroup.Item
              value={CursorMode[CursorMode.Lock]}
              aria-label="Toggle Cursor Lock"
              color={
                cursorMode() === CursorMode.Lock ? "fg.default" : "fg.muted"
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
          </ToggleGroup.Root>
        </Stack>
        <Show when={render()}>
          <Stack
            style={{
              "margin-top": "1rem",
              "padding-bottom": "0.5rem",
              float: "left",
              width: "15rem",
              "max-height": "calc(100% - 1.5rem - 3rem)",
              "overflow-x": "auto",
              "overflow-y": "auto",
            }}
          >
            <Legend
              plot={plot!}
              series={"Cycle"}
              width={"min-content"}
              readonly
            />
            <For each={props.header}>
              {(header, index) => (
                <Legend
                  plot={plot!}
                  series={header}
                  visible={getContext().visible[index()]}
                  onVisibleChange={(new_visible) => {
                    setContext()("visible", index(), new_visible);
                    // Index must add 1 to account for X-axis "Cycle" series
                    plot.setSeries(index() + 1, {
                      show: new_visible,
                    });
                  }}
                  color={getContext().color[index()]}
                  onColorChange={(new_color) => {
                    setContext()("color", index(), new_color);
                    plot.redraw();
                  }}
                  palette={getContext().palette}
                  width={"min-content"}
                  stroke={getContext().style[index()]}
                  onStrokeChange={(new_style) => {
                    setContext()("style", index(), new_style);
                    plot.delSeries(index() + 1);
                    if (getContext().style[index()] === LegendStroke.Line) {
                      plot.addSeries(
                        {
                          stroke: getContext().color[index()],
                          label: header,
                        },
                        index() + 1,
                      );
                    } else if (
                      getContext().style[index()] === LegendStroke.Dash
                    ) {
                      plot.addSeries(
                        {
                          stroke: getContext().color[index()],
                          label: header,
                          dash: [10, 5],
                        },
                        index() + 1,
                      );
                    }
                    plot.redraw();
                  }}
                />
              )}
            </For>
          </Stack>
        </Show>
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
    let referencedVarName = value.slice(4, value.length - 1);
    value = getComputedStyle(document.documentElement).getPropertyValue(
      referencedVarName,
    );
  }

  return value.trim();
}

function wheelZoomPlugin(opts: any) {
  let factor = opts.factor || 0.75;

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
        xMin = u.scales.x.min!;
        xMax = u.scales.x.max!;

        xRange = xMax - xMin;

        let over = u.over;
        let rect = over.getBoundingClientRect();

        // wheel scroll zoom
        over.addEventListener("wheel", (e: any) => {
          e.preventDefault();

          let { left } = u.cursor;

          let leftPct = left! / rect.width;
          let xVal = u.posToVal(left!, "x");
          let oxRange = u.scales.x.max! - u.scales.x.min!;

          let nxRange = e.deltaY < 0 ? oxRange * factor : oxRange / factor;
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
