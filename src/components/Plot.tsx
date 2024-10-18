import { JSX, createEffect, onMount, splitProps, useContext } from "solid-js";

import uPlot, { AlignedData } from "uplot";
import "uplot/dist/uPlot.min.css";

import { GlobalStateContext } from "~/GlobalState";
import { Heading } from "~/components/ui/heading";

// Option Button Imports
import { ColorPicker } from "~/components/ui/color-picker";
import { For } from "solid-js";
import { IconButton } from "~/components/ui/icon-button";
import { Button } from "~/components/ui/button";
import { Text } from "~/components/ui/text";
import { Input } from "~/components/ui/input";
import { IconSettings } from "@tabler/icons-solidjs";
import { Portal, render } from "solid-js/web";
import { Dialog } from "~/components/ui/dialog";
import { parseColor } from "@ark-ui/solid";
import { createStore } from "solid-js/store";
import { Stack } from "styled-system/jsx";

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

    for (var i = 0; i < props.header.length; i++) {
      addOptionsButton(props.id, uplot, i + 1);
    }

    addStrokeColorList(props.series.length);
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

type SettingButtonProps = {
  uplotId: string;
  uplot: PlotContainer;
  index: number;
};

var strokeColorList = ["#ffffff"];
const [colorList, setColorList] = createStore(strokeColorList);

function SettingButton(props: SettingButtonProps) {
  const lastColor = colorList[props.index];

  const changeColor = (index: number) => {
    if (props.uplot.plot) {
      var series = props.uplot.plot!.series[index];
      props.uplot.plot.delSeries(index);
      props.uplot.plot.addSeries(
        { stroke: colorList[index], label: series.label! },
        index,
      );
      setColorList(index, colorList[index]);
      props.uplot.plot.redraw();
      addOptionsButton(props.uplotId, props.uplot, index);
    }
  };

  return (
    <Dialog.Root>
      <Dialog.Trigger>
        <IconButton variant="ghost" size="sm" style={{ padding: "0px" }}>
          <IconSettings style={{ padding: "0px" }} />
        </IconButton>
      </Dialog.Trigger>
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Stack gap="8" p="6">
              <ColorPicker.Root
                value={parseColor(colorList[props.index])}
                onValueChange={(e) =>
                  setColorList(props.index, e.valueAsString)
                }
                onValueChangeEnd={(e) =>
                  setColorList(props.index, e.valueAsString)
                }
                open={true}
              >
                <ColorPicker.Label>
                  <Heading>Color</Heading>
                </ColorPicker.Label>
                <ColorPicker.Control>
                  <ColorPicker.ChannelInput
                    channel="hex"
                    asChild={(inputProps) => <Input {...inputProps()} />}
                  />
                  <ColorPicker.Trigger
                    asChild={(triggerProps) => (
                      <IconButton
                        variant="outline"
                        {...triggerProps()}
                        isActive={true}
                      >
                        <ColorPicker.ValueSwatch />
                      </IconButton>
                    )}
                  />
                </ColorPicker.Control>
                <ColorPicker.Area>
                  <ColorPicker.AreaBackground />
                  <ColorPicker.AreaThumb />
                </ColorPicker.Area>
                <ColorPicker.ChannelSlider
                  channel="hue"
                  style={{ "margin-top": "1rem" }}
                >
                  <ColorPicker.ChannelSliderTrack />
                  <ColorPicker.ChannelSliderThumb />
                </ColorPicker.ChannelSlider>
                <Text
                  size="xs"
                  fontWeight="bold"
                  color="fg.default"
                  style={{ "margin-top": "0.2rem" }}
                >
                  Color Palette
                </Text>
                <ColorPicker.SwatchGroup>
                  <For each={presets}>
                    {(color) => (
                      <ColorPicker.SwatchTrigger value={color}>
                        <ColorPicker.Swatch value={color} />
                      </ColorPicker.SwatchTrigger>
                    )}
                  </For>
                </ColorPicker.SwatchGroup>
              </ColorPicker.Root>
              <Dialog.CloseTrigger>
                <Stack direction="row" width="full">
                  <Button
                    width={"full"}
                    onClick={() => {
                      changeColor(props.index);
                    }}
                  >
                    Save
                  </Button>
                  <Button
                    variant={"outline"}
                    width={"full"}
                    onClick={() => {
                      setColorList(props.index, lastColor);
                    }}
                  >
                    Cancel
                  </Button>
                </Stack>
              </Dialog.CloseTrigger>
            </Stack>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}

function addOptionsButton(
  uplotId: string,
  uplot: PlotContainer,
  index: number,
) {
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

function addStrokeColorList(index: number) {
  if (index <= kelly_colors_hex.length) {
    strokeColorList.push(...kelly_colors_hex.slice(0, index));
  } else {
    let i = 0;
    while (i < index) {
      strokeColorList.push(kelly_colors_hex[i % kelly_colors_hex.length]);
      i++;
    }
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

const presets = [
  "#820D37", //more purplered
  "#B32357", //purple red
  "#CE2E68", //pink red
  "#E65A00", //orange
  "#FD8305", //yellow orange
  "#FFC107", //more yellow orange
  "#FFEC07", //yellow
  "#78B398", //pastel dark green
  "#009E73", //blue green
  "#14C7BA", //mint
  "#449AE4", //skyblue
  "#3B3EDE", //dark blue
  "#2C2E9C", //more dark blue
];
