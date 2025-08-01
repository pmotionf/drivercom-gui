import { TooltipProps } from "@dschz/solid-uplot/plugins";
import {
  Accessor,
  Setter,
  createSignal,
  Show,
  For,
  createEffect,
} from "solid-js";
import { Stack } from "styled-system/jsx";
import { Text } from "../ui/text";
import { enumSeries, enumMappings } from "~/GlobalState";
import { IconLine, IconLineDashed, IconPoint } from "@tabler/icons-solidjs";
import { Dynamic } from "solid-js/web";

export const PlotToolTip = (props: TooltipProps) => {
  if (!props.u.cursor.event) return;
  const seriesValues: Map<
    number,
    [Accessor<number | string>, Setter<number | string>]
  > = new Map();
  props.seriesData.forEach((_, i) =>
    seriesValues.set(i, createSignal<string | number>("")),
  );

  return (
    <Stack
      background="bg.default"
      gap="0"
      style={{
        "border-radius": "0.5rem",
        "border-width": "1px",
        "max-height": "20em",
        "overflow-y": "auto",
        "pointer-events": "auto",
        opacity: "100%",
      }}
    >
      <For each={props.seriesData}>
        {(series, i) => {
          const currentSeries = props.u.series[i() + 1];
          let matchedSeriesName: string = "";
          let enumMappingIndex: number | null = null;

          const lineName = enumSeries().filter(
            (data) => series.label === data[0],
          )[0];
          if (lineName) {
            matchedSeriesName = lineName[1];
            enumMappingIndex = enumMappings()
              .map((mapping) => mapping[0])
              .indexOf(matchedSeriesName);
          }

          createEffect(() => {
            if (!seriesValues.get(i())) return;
            const val: number = props.u.data[i() + 1][props.cursor.xValue]!;
            const yMin = props.u.scales.y.min!;
            const yMax = props.u.scales.y.max!;

            const yRange = yMax - yMin;

            const cursorY = props.cursor.position.top;
            const plotHeight = props.u.over.offsetHeight;
            const currentLocation = cursorY / plotHeight;
            const currentY: number = Number(yMax - yRange * currentLocation);

            const one_rem = parseFloat(
              getComputedStyle(document.documentElement).fontSize,
            );

            const cursorRange = (0.6 * one_rem) / plotHeight;
            const plotRange = yRange * cursorRange;

            if (val < currentY - plotRange || val > currentY + plotRange) {
              seriesValues.get(i())![1]("");
              return;
            }

            if (enumMappingIndex !== null) {
              const array: [number, string][] =
                enumMappings()[enumMappingIndex][1];
              const index = array
                .map((arr) => {
                  return arr[0];
                })
                .indexOf(val);

              if (array[val]) {
                const enumValue = array[index][0];
                const enumKind = array[index][1];
                const seriesValue = `${enumKind} (${enumValue})`;
                seriesValues.get(i())![1](seriesValue);
              }
            } else {
              seriesValues.get(i())![1](val);
            }
          });

          return (
            <Show
              when={
                props.u.series[i() + 1].show &&
                seriesValues.get(i())![0]().toString().length > 0
              }
            >
              <Stack direction="row" gap="0.5em" padding="0.2em">
                <Stack width="1em" height="1em" gap="0" marginTop="0.2em">
                  <Dynamic
                    size="20px"
                    color={series.stroke as string}
                    component={
                      !currentSeries.dash
                        ? IconLine
                        : JSON.stringify(currentSeries.dash) === "[10,5]"
                          ? IconLineDashed
                          : IconPoint
                    }
                  />
                </Stack>
                <Text size="sm" fontWeight="bold">
                  {series.label}:
                </Text>
                <Text size="sm">{seriesValues.get(i())![0]()}</Text>
              </Stack>
            </Show>
          );
        }}
      </For>
    </Stack>
  );
};
