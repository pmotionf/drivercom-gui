import { JSX, createEffect, splitProps } from "solid-js";

import uPlot, { AlignedData } from "uplot";
import "uplot/dist/uPlot.min.css";

import { Heading } from "~/components/ui/heading";

export type PlotProps = JSX.HTMLAttributes<HTMLDivElement> & {
  id: string;
  name: string;
  header: string[];
  series: number[][];
};

export function Plot(props: PlotProps) {
  const [, rest] = splitProps(props, ["name", "header", "series", "id"]);

  createEffect(() => {
    var plot_element = document.getElementById(props.id)!;
    var legend_element = document.getElementById(props.id + "-legend")!;
    plot_element.replaceChildren();
    legend_element.replaceChildren();
    let u = new uPlot(
      {
        scales: {
          x: {
            time: false,
          },
        },
        axes: [
          {
            stroke: getComputedCSSVariableValue("--colors-fg-default"),
            grid: {
              stroke: getComputedCSSVariableValue("--colors-bg-muted"),
            },
            ticks: {
              stroke: getComputedCSSVariableValue("--colors-bg-muted"),
            },
          },
          {
            stroke: getComputedCSSVariableValue("--colors-fg-default"),
            grid: {
              stroke: getComputedCSSVariableValue("--colors-bg-muted"),
            },
            ticks: {
              stroke: getComputedCSSVariableValue("--colors-bg-muted"),
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
        series: [
          {
            label: "Cycle",
          },
          ...props.header.map((label, index, _) => ({
            label: label,
            stroke: kelly_colors_hex[index % kelly_colors_hex.length],
          })),
        ],
      },
      [
        [...Array(props.series[0].length).keys()],
        ...props.series,
      ] as AlignedData,
      plot_element,
    );

    var resize = new ResizeObserver((entries) => {
      if (entries.length == 0) return;
      const entry = entries[0];
      setTimeout(
        () =>
          u.setSize({
            width: entry.contentRect.width,
            height: entry.contentRect.height,
          }),
        200,
      );
    });
    resize.observe(plot_element);
  });

  const selection_css = `
    .u-select {
      background: ${getComputedCSSVariableValue("--colors-fg-subtle")};
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
      <div {...rest}>
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
            height: "calc(100% - 2rem)",
          }}
        ></div>
        <style>{legend_css}</style>
        <div
          id={props.id + "-legend"}
          style={{
            float: "left",
            "margin-top": "2rem",
            "margin-bottom": "2rem",
            height: "calc(100% - 4rem - 2rem)",
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
