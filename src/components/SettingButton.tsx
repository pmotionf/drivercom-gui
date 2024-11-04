import { ColorPicker } from "~/components/ui/color-picker";
import { For, Show } from "solid-js";
import { IconButton } from "~/components/ui/icon-button";
import { Button } from "~/components/ui/button";
import { Text } from "~/components/ui/text";
import { Input } from "~/components/ui/input";
import {
  IconLine,
  IconLineDashed,
  IconAdjustmentsHorizontal,
  IconPlus,
  IconPoint,
  IconRefresh,
  IconSettings,
  IconCircleCheckFilled,
} from "@tabler/icons-solidjs";
import { Portal, render } from "solid-js/web";
import { Dialog } from "~/components/ui/dialog";
import { parseColor } from "@ark-ui/solid";
import { Stack } from "styled-system/jsx";
import { JSX, createSignal } from "solid-js";
import { ToggleGroup } from "~/components/ui/toggle-group";

export type SettingButtonProps = JSX.HTMLAttributes<HTMLElement> & {
  uplotId: string;
  uplot: PlotContainer;
  index: number;
};

type PlotContainer = {
  plot: uPlot | null;
};

enum StyleMode {
  Line,
  Dot,
  DottedLine,
}

export function SettingButton(props: SettingButtonProps) {
  const div = document.getElementById(props.uplotId + "-wrapper");
  const markers = div!.querySelectorAll(`.u-marker`);
  const marker = markers.item(props.index) as HTMLElement;
  const prevStrokeColor = getComputedStyle(marker).borderColor;

  const [color, setColor] = createSignal(prevStrokeColor);
  const [style, setStyle] = createSignal(StyleMode.Line);
  const [strokeWidth, setStrokeWidth] = createSignal(
    props.uplot.plot!.series[props.index].width,
  );

  const [edittable, setEdittable] = createSignal(false);

  var dash = props.uplot.plot!.series[props.index].dash;
  if (dash === undefined) setStyle(StyleMode.Line);
  else if (JSON.stringify(dash) === JSON.stringify([0, 5])) setStyle(StyleMode.Dot);
  else setStyle(StyleMode.DottedLine)

  const changeStyle = (index: number) => {
    if (props.uplot.plot) {
      var series = props.uplot.plot!.series[index];
      props.uplot.plot.delSeries(index);
      if (style() === StyleMode.Line) {
        props.uplot.plot.addSeries(
          {
            stroke: color(),
            label: series.label!,
            width: strokeWidth(),
          },
          index,
        );
      } else if (style() === StyleMode.Dot) {
        props.uplot.plot.addSeries(
          {
            stroke: color(),
            label: series.label!,
            dash: [0, 5],
            width: strokeWidth(),
          },
          index,
        );
      } else if (style() === StyleMode.DottedLine) {
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
          <Dialog.Content p="6" width={"26rem"}>
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
              <Stack direction={"row"}>
                <Text
                  size="xs"
                  fontWeight="bold"
                  style={{ "margin-top": "0.4rem" }}
                >
                  <Show when={edittable() === true} fallback="Color Palette">
                    Edit Color Palette
                  </Show>
                </Text>
                <Button
                  variant={"ghost"}
                  width={"1rem"}
                  size={"xs"}
                  style={{ padding: 0 }}
                  onClick={() => setEdittable(!edittable())}
                >
                  <Show
                    when={edittable() === true}
                    fallback={
                      <IconAdjustmentsHorizontal style={{ padding: "0" }} />
                    }
                  >
                    <IconCircleCheckFilled style={{ padding: "0" }} />
                  </Show>
                </Button>
                <Show when={edittable() === true}>
                  <IconButton
                    variant="ghost"
                    size="xs"
                    width={"1rem"}
                    style={{ padding: 0, margin: 0 }}
                    onClick={() => setCustomColorPalette(presets)}
                  >
                    <IconRefresh />
                  </IconButton>
                </Show>
              </Stack>
              <div
                style={{
                  display: "grid",
                  "grid-template-rows": "repeat(1, 1fr)",
                  "grid-template-columns": "repeat(7 ,1fr)",
                  gap: "0.3rem",
                }}
              >
                <For each={customColorPalette()}>
                  {(colors, i) => (
                    <Show
                      when={edittable() === false}
                      fallback={
                        <CustomColorPaletteButton color={colors} index={i()} />
                      }
                    >
                      <ColorPicker.SwatchTrigger
                        value={colors}
                        style={{ margin: "3.2px" }}
                      >
                        <ColorPicker.Swatch value={colors} />
                      </ColorPicker.SwatchTrigger>
                    </Show>
                  )}
                </For>
                <Show when={customColorPalette().length <= 13}>
                  <IconButton
                    variant={"outline"}
                    onClick={() => addCustomColorPalette(color())}
                    style={{ padding: 0, width: "1rem" }}
                    size={"xs"}
                  >
                    <IconPlus style={{ padding: "0" }} />
                  </IconButton>
                </Show>
              </div>
              <Show when={savedColorList().length >= 1}>
                <Text
                  size="xs"
                  fontWeight="bold"
                  style={{ "margin-top": "0.2rem" }}
                >
                  Saved Color
                </Text>
                <div
                  style={{
                    display: "grid",
                    "grid-template-rows": "repeat(1, 1fr)",
                    "grid-template-columns": "repeat(7 ,1fr)",
                    gap: "0.3rem",
                  }}
                >
                  <For each={savedColorList()}>
                    {(color) => (
                      <ColorPicker.SwatchTrigger value={color}>
                        <ColorPicker.Swatch value={color} />
                      </ColorPicker.SwatchTrigger>
                    )}
                  </For>
                </div>
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
                <ToggleGroup.Root value={[StyleMode[style()]]} width={"12rem"}
                  onValueChange={(details) => {
                    setStyle(
                      StyleMode[details.value[0] as keyof typeof StyleMode],
                    );
                  }}>
                  <ToggleGroup.Item
                    value={StyleMode[StyleMode.Line]}
                  >
                    <IconLine />
                  </ToggleGroup.Item>
                  <ToggleGroup.Item
                    value={StyleMode[StyleMode.Dot]}
                  >
                    <IconPoint />
                  </ToggleGroup.Item>
                  <ToggleGroup.Item
                    value={StyleMode[StyleMode.DottedLine]}
                  >
                    <IconLineDashed />
                  </ToggleGroup.Item>
                </ToggleGroup.Root>
              </Stack>
              <Dialog.CloseTrigger>
                <Stack direction="row-reverse" width="full" mt="1">
                  <Button
                    style={{ "margin-right": "0" }}
                    onClick={() => {
                      changeStyle(props.index);
                      addColor(color());
                    }}
                  >
                    Save
                  </Button>
                  <Button
                    variant={"outline"}
                    onClick={() => {
                      setColor(prevStrokeColor);
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

type CustomColorPaletteButtonProps = {
  color: string;
  index: number;
};

function CustomColorPaletteButton(props: CustomColorPaletteButtonProps) {
  const [newColor, setNewColor] = createSignal(props.color);

  return (
    <ColorPicker.Root
      value={parseColor(props.color)}
      onValueChange={(e) => setNewColor(e.valueAsString)}
    >
      <ColorPicker.Control>
        <ColorPicker.Trigger>
          <IconButton
            variant={"ghost"}
            size={"xs"}
            style={{ padding: "0", width: "1rem" }}
          >
            <ColorPicker.Swatch value={props.color} />
          </IconButton>
        </ColorPicker.Trigger>
      </ColorPicker.Control>
      <ColorPicker.Positioner>
        <ColorPicker.Content>
          <Stack gap={"3"}>
            <ColorPicker.Area width={"15rem"}>
              <ColorPicker.AreaBackground />
              <ColorPicker.AreaThumb />
            </ColorPicker.Area>
            <Stack gap="2" direction={"row"}>
              <IconButton
                variant={"outline"}
                size={"sm"}
                style={{ padding: 0, "margin-top": "1rem" }}
              >
                <ColorPicker.ValueSwatch />
              </IconButton>
              <Stack>
                <ColorPicker.ChannelSlider channel="hue" width={"12rem"} mt="2">
                  <ColorPicker.ChannelSliderTrack />
                  <ColorPicker.ChannelSliderThumb />
                </ColorPicker.ChannelSlider>
                <ColorPicker.ChannelInput
                  channel="hex"
                  asChild={(inputProps) => (
                    <Input {...inputProps()} size={"xs"} />
                  )}
                />
              </Stack>
            </Stack>
          </Stack>
          <Show when={savedColorList().length > 0}>
            <Text
              size={"xs"}
              fontWeight={"bold"}
              style={{ "margin-top": "0.5rem" }}
            >
              Saved Color
            </Text>
            <div
              style={{
                display: "grid",
                "grid-template-columns": "repeat(7 ,1fr)",
                gap: "0.1rem",
                padding: "0.2rem",
                "margin-top": "0.2rem",
              }}
            >
              <For each={savedColorList()}>
                {(color) => (
                  <ColorPicker.SwatchTrigger value={color}>
                    <ColorPicker.Swatch value={color} />
                  </ColorPicker.SwatchTrigger>
                )}
              </For>
            </div>
          </Show>
          <Stack
            direction="row-reverse"
            width="full"
            style={{ "margin-top": "1rem", padding: "0.5rem" }}
          >
            <Button
              size={"xs"}
              onClick={() => {
                saveColor(newColor(), props.index);
              }}
            >
              Save
            </Button>
            <Button
              variant={"outline"}
              size={"xs"}
              onClick={() => {
                removeColor(props.index);
              }}
            >
              Delete
            </Button>
          </Stack>
        </ColorPicker.Content>
      </ColorPicker.Positioner>
    </ColorPicker.Root>
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

function saveColor(newColor: any, index: number) {
  setCustomColorPalette((prevColor) => {
    var updatedColor = [...prevColor];
    if (prevColor[index] !== newColor) {
      updatedColor[index] = newColor;
      return updatedColor;
    }
    return updatedColor;
  });
}

function addCustomColorPalette(newColor: any) {
  if (customColorPalette().length <= 13) {
    setCustomColorPalette((prevColor) => {
      const updatedColor = [...prevColor, newColor];
      return updatedColor;
    });
  }
}

function removeColor(index: number) {
  setCustomColorPalette((prevColor) => {
    var updatedColor = [...prevColor];
    updatedColor.splice(index, 1);
    return updatedColor;
  });
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
  "#6300AB",
];

const [savedColorList, setSavedColorList] = createSignal<string[]>([]);

const [customColorPalette, setCustomColorPalette] = createSignal<string[]>([
  "#820D37",
  "#B32357",
  "#CE2E68",
  "#E65A00",
  "#FD8305",
  "#FFC107",
  "#FFEC07",
  "#78B398",
  "#009E73",
  "#14C7BA",
  "#449AE4",
  "#3B3EDE",
  "#2C2E9C",
  "#6300AB",
]);
