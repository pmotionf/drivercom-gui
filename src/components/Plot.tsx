import { JSX, createEffect, onMount, splitProps, useContext } from "solid-js";

import uPlot, { AlignedData } from "uplot";
import "uplot/dist/uPlot.min.css";

import { GlobalStateContext } from "~/GlobalState";
import { Heading } from "~/components/ui/heading";
import { SettingButton } from "./SettingButton";
import { render } from "solid-js/web";

export type PlotProps = JSX.HTMLAttributes<HTMLDivElement> & {
  id: string;
  name: string;
  header: string[];
  series: number[][];
};

type PlotContainer = {
  plot: uPlot | null;
};

export function Plot(props: PlotProps) {
  const [, rest] = splitProps(props, ["name", "header", "series", "id"]);
  var fg_default = getComputedCSSVariableValue("--colors-fg-default");
  var bg_muted = getComputedCSSVariableValue("--colors-bg-muted");
  const { globalState } = useContext(GlobalStateContext)!;
  var theme = globalState.theme;
  var uplot: PlotContainer = { plot: null };

  function createPlot() {
    var plot_element = document.getElementById(props.id)!;
    var legend_element = document.getElementById(props.id + "-legend")!;
    plot_element.replaceChildren();
    legend_element.replaceChildren();

    var series: uPlot.Series[] = [
      {
        label: "Cycle",
      },
      ...props.header.map((label, index, _) => ({
        label: label,
        stroke: kelly_colors_hex[index % kelly_colors_hex.length],
      })),
    ];
    var scales: uPlot.Scales = {
      x: {
        time: false,
      },
    };

    // Save and restore existing plot state.
    if (uplot.plot) {
      series = uplot.plot.series;
      scales = uplot.plot.scales;
    }

    uplot.plot = new uPlot(
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
          mount: (_, el) => {
            legend_element.appendChild(el);
          },
          markers: {
            show: true,
            width: 3,
          },
          values: [],
        },
        width: plot_element.clientWidth,
        height: plot_element.clientHeight,
        series: series,
        cursor: {
          sync: {
            key: "plotSync",
          },
          bind: {
            mousedown: (u, _targ, handler) => {
              return (e) => {
                if (e.button == 0) {
                  // Always release cursor lock if not control-clicking.
                  if (!e.ctrlKey) {
                    // @ts-ignore
                    if (u.cursor._lock) {
                      // @ts-ignore
                      u.cursor._lock = false;
                    }
                  }

                  // Only select/zoom when not panning or locking.
                  if (!e.shiftKey && !e.ctrlKey) {
                    handler(e);
                  } else if (e.ctrlKey) {
                    // Lock cursor in plot only when control-clicking.
                    // @ts-ignore
                    u.cursor._lock = !u.cursor._lock;
                  } else if (e.shiftKey) {
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

                      uPlot.sync("plotSync").plots.forEach((up) => {
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
                  if (u.select.width >= 10) {
                    handler(e);
                  } else {
                    u.select.width = 0;
                    handler(e);
                  }
                }
                return null;
              };
            },
          },
        },
        plugins: [wheelZoomPlugin({ factor: 0.75 })],
      },
      [
        [...Array(props.series[0].length).keys()],
        ...props.series,
      ] as AlignedData,
      plot_element,
    );
    syncUplotArray.push(uplot.plot!);

    for (var i = 0; i < props.header.length; i++) {
      addOptionButton(props.id, uplot, i + 1);
    }
  }

  onMount(() => {
    // Wrap in create effect to handle ID changing.
    createEffect(() => {
      var resize = new ResizeObserver((entries) => {
        if (entries.length == 0) return;
        const entry = entries[0];
        setTimeout(() => {
          if (uplot.plot) {
            uplot.plot.setSize({
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
  const legend_css = `
    .u-inline tr {
      display: block;
    }
    .u-legend {
      text-align: left;
    }
    .u-legend th {
      vertical-align: middle;
      display: inline-block;
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
            width: "calc(100% - 15em)",
            height: "calc(100% - 0.5rem)",
          }}
        ></div>
        <style>{legend_css}</style>
        <div
          id={props.id + "-legend"}
          style={{
            float: "left",
            "margin-top": "1rem",
            "margin-bottom": "1rem",
            height: "calc(100% - 2rem - 0.5rem)",
            width: "15em",
            overflow: "auto",
          }}
        ></div>
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

          uPlot.sync("plotSync").plots.forEach((up: uPlot) => {
            up.setScale("x", { min: nxMin, max: nxMax });
          });
        });
      },
    },
  };
}

function addOptionButton(uplotId: string, uplot: PlotContainer, index: number) {
  const div = document.getElementById(uplotId + "-wrapper");
  if (div) {
    const legend_elements = div.querySelectorAll(`.u-series`);
    var row = legend_elements.item(index) as HTMLTableRowElement;
    var new_cell = row.insertCell(0);
    const container = document.createElement("div");
    new_cell.appendChild(container);
    render(
      () => <SettingButton uplotId={uplotId} uplot={uplot} index={index} />,
      container,
    );
  }
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

const syncUplotArray: uPlot[] = [];
