import { ColorPicker } from "~/components/ui/color-picker";
import { For, Show } from "solid-js";
import { IconButton } from "~/components/ui/icon-button";
import { Button } from "~/components/ui/button";
import { Text } from "~/components/ui/text";
import { Input } from "~/components/ui/input";
import {
  IconLine,
  IconLineDashed,
  IconPoint,
  IconSettings,
} from "@tabler/icons-solidjs";
import { Portal, render } from "solid-js/web";
import { Dialog } from "~/components/ui/dialog";
import { parseColor } from "@ark-ui/solid";
import { Stack } from "styled-system/jsx";
import { JSX, createSignal } from "solid-js";
import { ToggleGroup } from "~/components/ui/toggle-group";
import { savedColorList, setSavedColorList } from "~/GlobalState";

export type SettingButtonProps = JSX.HTMLAttributes<HTMLElement> & {
  uplotId: string;
  uplot: PlotContainer;
  index: number;
};

type PlotContainer = {
  plot: uPlot | null;
};

export function SettingButton(props: SettingButtonProps) {
  const div = document.getElementById(props.uplotId + "-wrapper");
  const markers = div!.querySelectorAll(`.u-marker`);
  const marker = markers.item(props.index) as HTMLElement;
  const prevStrokeColor = getComputedStyle(marker).borderColor;

  const [color, setColor] = createSignal(prevStrokeColor);
  const [style, setStyle] = createSignal("");
  const [strokeWidth, setStrokeWidth] = createSignal(
    props.uplot.plot!.series[props.index].width,
  );

  var dash = props.uplot.plot!.series[props.index].dash;
  if (dash === undefined) setStyle("line") && dash === undefined;
  else if (JSON.stringify(dash) === JSON.stringify([0, 5])) setStyle("dot");
  else setStyle("dottedLine");

  const changeStyle = (index: number) => {
    if (props.uplot.plot) {
      var series = props.uplot.plot!.series[index];
      props.uplot.plot.delSeries(index);
      if (style() === "line") {
        props.uplot.plot.addSeries(
          {
            stroke: color(),
            label: series.label!,
            width: strokeWidth(),
          },
          index,
        );
      } else if (style() === "dot") {
        props.uplot.plot.addSeries(
          {
            stroke: color(),
            label: series.label!,
            dash: [0, 5],
            width: strokeWidth(),
          },
          index,
        );
      } else if (style() === "dottedLine") {
        props.uplot.plot.addSeries(
          {
            stroke: color(),
            label: series.label!,
            dash: [20, 10],
            width: strokeWidth(),
          },
          index,
        );
      }
      props.uplot.plot.redraw();
      addOptionButton(props.uplotId, props.uplot, index);
    }
  };

  const inputHandler = (event: any) => {
    setStrokeWidth(parseInt(event.currentTarget.value));
  };

  const addColor = (newColor: string) => {
    if (newColor === prevStrokeColor) {
      setSavedColorList(savedColorList());
    } else {
      setSavedColorList((prevColor) => {
        var updatedColors = [newColor, ...prevColor];
        if (updatedColors.length >= 8)
          updatedColors = updatedColors.slice(0, 7);
        return updatedColors;
      });
    }
  };

  return (
    <Dialog.Root closeOnInteractOutside={false}>
      <Dialog.Trigger
        asChild={(triggerProps) => (
          <IconButton
            variant="link"
            style={{
              height: "1.5em",
              "min-width": "1.5em",
              width: "1.5em",
              padding: "0px",
              margin: "0px",
              "vertical-align": "top",
            }}
            {...triggerProps()}
          >
            <IconSettings
              style={{
                width: "1.2em",
                height: "1.2em",
                padding: "0px",
                margin: "0px",
                "vertical-align": "middle",
              }}
            />
          </IconButton>
        )}
      />
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content p="6">
            <ColorPicker.Root
              value={parseColor(color())}
              onValueChange={(e) => setColor(e.valueAsString)}
              onValueChangeEnd={(e) => setColor(e.valueAsString)}
              open={true}
            >
              <ColorPicker.Label>
                <Text
                  size="xs"
                  fontWeight="bold"
                  style={{ "margin-top": "0.2rem" }}
                >
                  Stroke Color
                </Text>
              </ColorPicker.Label>
              <ColorPicker.Control>
                <ColorPicker.ChannelInput
                  channel="hex"
                  asChild={(inputProps) => <Input {...inputProps()} />}
                />
                <IconButton variant="outline">
                  <ColorPicker.ValueSwatch />
                </IconButton>
              </ColorPicker.Control>
              <ColorPicker.Area mt="1">
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
              <Show when={savedColorList().length >= 1}>
                <Text
                  size="xs"
                  fontWeight="bold"
                  style={{ "margin-top": "0.2rem" }}
                >
                  Saved Color
                </Text>
                <ColorPicker.SwatchGroup>
                  <For each={savedColorList()}>
                    {(color) => (
                      <ColorPicker.SwatchTrigger value={color}>
                        <ColorPicker.Swatch value={color} />
                      </ColorPicker.SwatchTrigger>
                    )}
                  </For>
                </ColorPicker.SwatchGroup>
              </Show>
            </ColorPicker.Root>
            <Stack>
              <Stack direction="row" mt="2" width="full">
                <Text size="xs" fontWeight="bold">
                  Stroke Width
                </Text>
                <Text
                  size="xs"
                  fontWeight="bold"
                  style={{ "margin-left": "10rem" }}
                >
                  Stroke Style
                </Text>
              </Stack>
              <Stack direction="row" width={"23rem"}>
                <Input
                  id={"inputStrokeWidth"}
                  value={strokeWidth()}
                  width="full"
                  placeholder="width"
                  type="number"
                  max={10}
                  min={1}
                  onInput={(e) => inputHandler(e)}
                />
                <ToggleGroup.Root value={[style()]} width={"12rem"}>
                  <ToggleGroup.Item
                    value={"line"}
                    onClick={() => setStyle("line")}
                  >
                    <IconLine />
                  </ToggleGroup.Item>
                  <ToggleGroup.Item
                    value={"dot"}
                    onClick={() => setStyle("dot")}
                  >
                    <IconPoint />
                  </ToggleGroup.Item>
                  <ToggleGroup.Item
                    value={"dottedLine"}
                    onClick={() => setStyle("dottedLine")}
                  >
                    <IconLineDashed />
                  </ToggleGroup.Item>
                </ToggleGroup.Root>
              </Stack>
              <Dialog.CloseTrigger>
                <Stack direction="row" width="full" mt="1">
                  <Button
                    variant={"outline"}
                    width={"full"}
                    onClick={() => {
                      setColor(prevStrokeColor);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    width={"full"}
                    onClick={() => {
                      changeStyle(props.index);
                      addColor(color());
                    }}
                  >
                    Save
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
