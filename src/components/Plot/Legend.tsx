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
import * as Dialog from "~/components/ui/dialog";
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
import * as Checkbox from "../ui/checkbox";

export type LegendProps = Omit<StackProps, "stroke"> & {
  plot: uPlot;
  group?: string;
  series: string;
  visible?: boolean;
  enumValuesMapping?: Map<number, string>;
  onVisibleChange?: (new_visible: boolean, shiftKey: boolean) => void;
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
  onSelectChange?: (checkBoxValue: boolean, isShiftClick?: boolean) => void;
  filter?: number;
  onFilterChange?: (filter: number) => void;
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
  const [filter, setFilter] = createSignal(props.filter ?? 0);
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
        if (props.enumValuesMapping) {
          if (props.enumValuesMapping.has(val)) {
            setValue(`${props.enumValuesMapping.get(val)}(${val})`);
          } else {
            setValue(`undefined(${val})`);
          }
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
    <Stack direction="row" gap="0.2rem" alignItems="center" {...rest}>
      <Show when={!props.readonly}>
        <Show when={props.showSelectCheckBox}>
          <div
            onClick={(e) => {
              props.onSelectChange?.(!props.selected, e.shiftKey);
            }}
          >
            <Checkbox.Root checked={props.selected === true}>
              <Checkbox.HiddenInput />
              <Checkbox.Control>
                <Checkbox.Indicator />
              </Checkbox.Control>
            </Checkbox.Root>
          </div>
        </Show>
        <Dialog.Root
          open={configOpen()}
          onOpenChange={() => setConfigOpen(false)}
          lazyMount
          unmountOnExit
        >
          <IconButton
            size="xs"
            variant="plain"
            disabled={!(props.visible != null ? props.visible : visible())}
            opacity={
              (props.visible != null ? props.visible : visible())
                ? "100%"
                : "30%"
            }
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
              <Dialog.Content padding="0">
                <SeriesConfiguration
                  series={props.series}
                  color={color()}
                  stroke={stroke()}
                  dataFilter={filter()}
                  palette={props.palette}
                  onSave={(new_color, new_style, new_filter) => {
                    props.onColorChange?.(new_color);
                    props.onStrokeChange?.(new_style);
                    setColor(new_color);
                    setStroke(new_style);
                    props.onFilterChange?.(new_filter ?? 0);
                    setFilter(new_filter ?? 0);
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
            textStyle="sm"
            fontWeight="medium"
            style={{ "justify-content": "left" }}
          >
            {props.series}:
          </Heading>
        }
      >
        <Button
          size="xs"
          variant="plain"
          _hover={{ background: "Background" }}
          style={{ "justify-content": "left" }}
          padding="0"
          opacity={
            (props.visible != null ? props.visible : visible()) ? "100%" : "30%"
          }
          onclick={(e) => {
            props.onVisibleChange?.(
              props.visible != null ? !props.visible : !visible(),
              e.shiftKey,
            );
            setVisible((prev) => !prev);
          }}
        >
          {props.series}:
        </Button>
      </Show>
      <Text
        textStyle="sm"
        style={{
          "white-space": "nowrap",
        }}
        opacity={
          (props.visible != null ? props.visible : visible()) ? "100%" : "30%"
        }
      >
        {value() != null ? value() : "--"}
      </Text>
    </Stack>
  );
}
