import {
  createEffect,
  createSignal,
  Match,
  Show,
  splitProps,
  Switch,
} from "solid-js";

import { Stack, StackProps } from "styled-system/jsx";

import uPlot from "uplot";

import { Button } from "~/components/ui/button";
import { Dialog } from "~/components/ui/dialog";
import { IconButton } from "~/components/ui/icon-button";
import { Text } from "~/components/ui/text";
import { SeriesConfiguration } from "./SeriesConfiguration";

import {
  IconLine,
  IconLineDashed,
  IconPoint,
  IconX,
} from "@tabler/icons-solidjs";
import { Heading } from "../ui/heading";
import { Portal } from "solid-js/web";
import { enumMappings, enumSeries } from "~/GlobalState";
import { Checkbox } from "../ui/checkbox";

export type LegendProps = Omit<StackProps, "stroke"> & {
  plot: uPlot;
  group?: string;
  series: string;
  visible?: boolean;
  onVisibleChange?: (new_visible: boolean) => void;
  color?: string;
  onColorChange?: (new_color: string) => void;
  palette?: string[];
  onPaletteChange?: (new_palette: string[]) => void;
  stroke?: LegendStroke;
  onStrokeChange?: (new_style: LegendStroke) => void;
  readonly?: boolean;
  cursorIdx?: number | null | undefined;
  showSelectCheckBox?: boolean;
  selected?: boolean;
  onSelectChange?: (checkBoxValue: boolean) => void;
};

export enum LegendStroke {
  Line,
  Dash,
  Dot,
}

export function Legend(props: LegendProps) {
  const [, rest] = splitProps(props, [
    "plot",
    "group",
    "series",
    "visible",
    "onVisibleChange",
    "color",
    "onColorChange",
    "stroke",
    "onStrokeChange",
    "readonly",
    "selected",
    "onSelectChange",
  ]);

  let seriesIndex: number = 0;
  let seriesFound: boolean = false;
  props.plot.series.forEach((series, index) => {
    if (series.label === props.series) {
      seriesIndex = index;
      seriesFound = true;
    }
  });

  if (!seriesFound) return;

  const [configOpen, setConfigOpen] = createSignal(false);

  const [visible, setVisible] = createSignal(
    props.visible != null ? props.visible : true,
  );
  const [color, setColor] = createSignal(props.color ?? "");
  const [stroke, setStroke] = createSignal(props.stroke ?? LegendStroke.Line);
  const [value, setValue] = createSignal(null as number | string | null);

  // Autodetect initial color from plot if color is not provided in props.
  if (props.color == null && props.plot.series[seriesIndex].stroke) {
    let new_color = color();
    if (typeof props.plot.series[seriesIndex].stroke === "string") {
      new_color = props.plot.series[seriesIndex].stroke as string;
    } else if (typeof props.plot.series[seriesIndex].stroke === "function") {
      new_color = (
        props.plot.series[seriesIndex].stroke as (
          self: uPlot,
          seriesIdx: number,
        ) => CanvasRenderingContext2D["strokeStyle"]
      )(props.plot, seriesIndex) as string;
    }
    props.onColorChange?.(new_color);
    setColor(new_color);
  }

  const [enumMappingsIndex, setEnumMappingsIndex] = createSignal<number | null>(
    null,
  );

  createEffect(() => {
    let matchedSeriesName = "";
    for (let i = 0; i < enumSeries().length; i++) {
      const enumSeriesName = enumSeries()[i][0];
      if (props.series === enumSeriesName) {
        matchedSeriesName = enumSeries()[i][1];

        break;
      }
    }
    if (matchedSeriesName.length == 0) return;

    for (let i = 0; i < enumMappings().length; i++) {
      const enumTypeName = enumMappings()[i][0];
      if (matchedSeriesName === enumTypeName) {
        setEnumMappingsIndex(i);
      }
    }
  });

  const updateValue = (data_index: number | null | undefined) => {
    if (props.visible != null) {
      if (!props.visible) {
        setValue(null);
        return;
      }
    } else if (!visible()) {
      setValue(null);
      return;
    }

    if (data_index != null) {
      const val = props.plot.data[seriesIndex][data_index];
      if (val != null) {
        if (enumMappingsIndex() != null) {
          let name = "";
          for (const mapping of enumMappings()[enumMappingsIndex()!][1]) {
            if (mapping[0] == val) {
              name = mapping[1];
              break;
            }
          }
          setValue(`${name} (${val})`);
        } else {
          setValue(val);
        }
      } else {
        setValue(null);
      }
    } else {
      setValue(null);
    }
  };

  createEffect(() => {
    updateValue(props.cursorIdx);
  });

  const StrokeIcon = () => (
    <Switch fallback={<IconX />}>
      <Match when={stroke() == LegendStroke.Line}>
        <IconLine color={color()} />
      </Match>
      <Match when={stroke() == LegendStroke.Dash}>
        <IconLineDashed color={color()} />
      </Match>
      <Match when={stroke() == LegendStroke.Dot}>
        <IconPoint color={color()} />
      </Match>
    </Switch>
  );

  const strokeIconSize: string = "1.2rem";
  return (
    <Stack direction="row" gap="1" {...rest}>
      <Show when={!props.readonly}>
        <Show when={props.showSelectCheckBox}>
          <Checkbox
            value={props.selected ? props.selected.toString() : "false"}
            onCheckedChange={(e) =>
              props.onSelectChange?.(
                e.checked.toString() === "true" ? true : false,
              )}
          />
        </Show>
        <Dialog.Root
          open={configOpen()}
          onOpenChange={() => setConfigOpen(false)}
          lazyMount
          unmountOnExit
        >
          <IconButton
            variant="link"
            disabled={!(props.visible != null ? props.visible : visible())}
            opacity={(props.visible != null ? props.visible : visible())
              ? "100%"
              : "30%"}
            onClick={() => setConfigOpen(true)}
            style={{
              width: strokeIconSize,
              padding: "0px",
              margin: "0px",
            }}
          >
            <StrokeIcon />
          </IconButton>
          <Portal>
            <Dialog.Backdrop />
            <Dialog.Positioner>
              <Dialog.Content>
                <SeriesConfiguration
                  series={props.series}
                  color={color()}
                  stroke={stroke()}
                  palette={props.palette}
                  onSave={(new_color, new_style) => {
                    props.onColorChange?.(new_color);
                    props.onStrokeChange?.(new_style);
                    setColor(new_color);
                    setStroke(new_style);
                    setConfigOpen(false);
                  }}
                  onCancel={() => setConfigOpen(false)}
                />
              </Dialog.Content>
            </Dialog.Positioner>
          </Portal>
        </Dialog.Root>
      </Show>
      <Show
        when={!props.readonly}
        fallback={
          <Heading
            size="sm"
            fontWeight="medium"
            style={{ "justify-content": "left" }}
          >
            {props.series}:
          </Heading>
        }
      >
        <Button
          variant="link"
          style={{ "justify-content": "left" }}
          opacity={(props.visible != null ? props.visible : visible())
            ? "100%"
            : "30%"}
          onclick={() => {
            props.onVisibleChange?.(
              props.visible != null ? !props.visible : !visible(),
            );
            setVisible((prev) => !prev);
          }}
        >
          {props.series}:
        </Button>
      </Show>
      <Text
        size="sm"
        style={{
          "white-space": "nowrap",
        }}
        opacity={(props.visible != null ? props.visible : visible())
          ? "100%"
          : "30%"}
      >
        {value() != null ? value() : "--"}
      </Text>
    </Stack>
  );
}
