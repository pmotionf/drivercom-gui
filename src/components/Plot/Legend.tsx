import {
  createEffect,
  createSignal,
  Match,
  onCleanup,
  onMount,
  Show,
  splitProps,
  Switch,
} from "solid-js";
import { Portal } from "solid-js/web";

import { Stack, StackProps } from "styled-system/jsx/index.mjs";

import uPlot from "uplot";

import { Button } from "~/components/ui/button.tsx";
import { Dialog } from "~/components/ui/dialog.tsx";
import { Heading } from "~/components/ui/heading.tsx";
import { Icon } from "~/components/ui/icon.tsx";
import { IconButton } from "~/components/ui/icon-button.tsx";
import { Text } from "~/components/ui/text.tsx";

import { SeriesConfiguration } from "~/components/Plot/SeriesConfiguration.tsx";

import {
  IconLine,
  IconLineDashed,
  IconPoint,
  IconX,
} from "@tabler/icons-solidjs";

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
  ]);

  const group = () => props.group ?? props.id ?? "";

  let seriesIndex: number = 0;
  let seriesFound: boolean = false;
  props.plot.series.forEach((series, index) => {
    if (series.label === props.series) {
      seriesIndex = index;
      seriesFound = true;
    }
  });

  if (!seriesFound) return <></>;

  const [configOpen, setConfigOpen] = createSignal(false);

  const [visible, setVisible] = createSignal(
    props.visible != null ? props.visible : true,
  );
  const [color, setColor] = createSignal(props.color ?? "");
  const [stroke, setStroke] = createSignal(props.stroke ?? LegendStroke.Line);
  const [value, setValue] = createSignal(null as number | null);

  // Autodetect initial color from plot if color is not provided in props.
  if (props.color == null && props.plot.series[seriesIndex].stroke) {
    let new_color = color();
    if (typeof props.plot.series[seriesIndex].stroke === "string") {
      new_color = props.plot.series[seriesIndex].stroke as string;
    } else if (typeof props.plot.series[seriesIndex].stroke === "function") {
      new_color = (props.plot.series[seriesIndex].stroke as (
        self: uPlot,
        seriesIdx: number,
      ) => CanvasRenderingContext2D["strokeStyle"])(
        props.plot,
        seriesIndex,
      ) as string;
    }
    props.onColorChange?.(new_color);
    setColor(new_color);
  }

  const updateValue = () => {
    if (props.visible != null) {
      if (!props.visible) return;
    } else if (!visible()) return;

    const data_index = props.plot.cursor.idx;
    if (data_index != null) {
      const val = props.plot.data[seriesIndex][data_index];
      if (val != null) {
        setValue(val);
      } else {
        setValue(null);
      }
    } else {
      setValue(null);
    }
  };

  onMount(() => {
    createEffect(() => {
      uPlot.sync(group()).plots.forEach((up) => {
        up.over.removeEventListener("mousemove", updateValue);
        up.over.removeEventListener("mouseleave", updateValue);
      });
      uPlot.sync(group()).plots.forEach((up) => {
        up.over.addEventListener("mousemove", updateValue);
        up.over.addEventListener("mouseleave", updateValue);
      });
    });
  });

  onCleanup(() => {
    uPlot.sync(group()).plots.forEach((up) => {
      up.over.removeEventListener("mousemove", updateValue);
      up.over.removeEventListener("mouseleave", updateValue);
    });
  });

  createEffect(() => {
    if (props.visible != null) {
      if (!props.visible) {
        setValue(null);
        return;
      }
    } else if (!visible()) {
      setValue(null);
      return;
    }
    updateValue();
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
    <Stack
      direction="row"
      gap={"1"}
      opacity={(props.visible != null ? props.visible : visible())
        ? "100%"
        : "30%"}
      {...rest}
    >
      <Show
        when={!props.readonly}
        fallback={
          <Icon
            style={{
              width: strokeIconSize,
              padding: "0px",
              margin: "0px",
            }}
          >
            <StrokeIcon />
          </Icon>
        }
      >
        <Dialog.Root
          open={configOpen()}
          onOpenChange={() => setConfigOpen(false)}
          lazyMount
          unmountOnExit
        >
          <IconButton
            variant="link"
            disabled={!(props.visible != null ? props.visible : visible())}
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
            size={"sm"}
            fontWeight={"medium"}
            style={{ "justify-content": "left" }}
          >
            {props.series}:
          </Heading>
        }
      >
        <Button
          variant="link"
          style={{ "justify-content": "left" }}
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
        size={"sm"}
        style={{
          "white-space": "nowrap",
        }}
      >
        {value() != null ? value() : "--"}
      </Text>
    </Stack>
  );
}
