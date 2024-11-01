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
import { Stack } from "styled-system/jsx";
import { JSX, createSignal } from "solid-js";
import { Heading } from "./ui/heading";

export type SettingButtonListProps = JSX.HTMLAttributes<HTMLElement> & {
  uplotId: string;
  uplot: PlotContainer;
  index: number;
};

type PlotContainer = {
  plot: uPlot | null;
};

export function SettingButton(props: SettingButtonListProps) {
  const [color, setColor] = createSignal("");
  const div = document.getElementById(props.uplotId + "-wrapper");
  const markers = div!.querySelectorAll(`.u-marker`);
  const marker = markers.item(props.index) as HTMLElement;
  const prevStrokeColor = getComputedStyle(marker).borderColor;
  setColor(prevStrokeColor);

  const changeColor = (index: number) => {
    if (props.uplot.plot) {
      var series = props.uplot.plot!.series[index];
      props.uplot.plot.delSeries(index);
      props.uplot.plot.addSeries(
        { stroke: color(), label: series.label! },
        index,
      );
      props.uplot.plot.redraw();
      addOptionButton(props.uplotId, props.uplot, index);
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
                value={parseColor(color())}
                onValueChange={(e) => setColor(e.valueAsString)}
                onValueChangeEnd={(e) => setColor(e.valueAsString)}
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
                  <IconButton variant="outline">
                    <ColorPicker.ValueSwatch />
                  </IconButton>
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
                      changeColor(props.index);
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
