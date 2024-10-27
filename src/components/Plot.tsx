import { JSX, createEffect, onMount, splitProps, useContext } from "solid-js";

import uPlot, { AlignedData } from "uplot";
import "uplot/dist/uPlot.min.css";

import { GlobalStateContext } from "~/GlobalState";
import { Heading } from "~/components/ui/heading";

export type PlotProps = JSX.HTMLAttributes<HTMLDivElement> & {
  id: string;
  name: string;
  header: string[];
  series: number[][];
};

export function Plot(props: PlotProps) {
  const [, rest] = splitProps(props, ["name", "header", "series", "id"]);
  var fg_default = getComputedCSSVariableValue("--colors-fg-default");
  var bg_muted = getComputedCSSVariableValue("--colors-bg-muted");
  const { globalState } = useContext(GlobalStateContext)!;
  var theme = globalState.theme;
  var uplot: uPlot | null = null;

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
    if (uplot) {
      series = uplot.series;
      scales = uplot.scales;
    }

    uplot = new uPlot(
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
        },
        width: plot_element.clientWidth,
        height: plot_element.clientHeight,
        series: series,
        cursor: {
          lock: true,
          sync: {
            key: "chartSync",
          },
        },
      },
      [
        [...Array(props.series[0].length).keys()],
        ...props.series,
      ] as AlignedData,
      plot_element,
    );
  }

  onMount(() => {
    // Wrap in create effect to handle ID changing.
    createEffect(() => {
      var resize = new ResizeObserver((entries) => {
        if (entries.length == 0) return;
        const entry = entries[0];
        setTimeout(() => {
          if (uplot) {
            uplot.setSize({
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
