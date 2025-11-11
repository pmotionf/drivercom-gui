import { TooltipProps } from "@dschz/solid-uplot/plugins";
import {
  Accessor,
  Setter,
  createSignal,
  Show,
  For,
  createEffect,
  on,
} from "solid-js";
import { Stack } from "styled-system/jsx";
import { Text } from "../ui/text";
import { enumSeries, enumMappings } from "~/GlobalState";
import { IconLine, IconLineDashed, IconPoint } from "@tabler/icons-solidjs";
import { Dynamic, Portal } from "solid-js/web";

export const PlotToolTip = (props: TooltipProps) => {
  if (!props.u.cursor.event) return;
  const seriesValues: Map<
    number,
    [Accessor<number | string>, Setter<number | string>]
  > = new Map();
  props.seriesData.forEach((_, i) =>
    seriesValues.set(i, createSignal<string | number>("")),
  );

  const [cursorY, setCursorY] = createSignal<number | null>(null);
  const [cursorX, setCursorX] = createSignal<number | null>(null);

  const one_rem = parseFloat(
    getComputedStyle(document.documentElement).fontSize,
  );

  createEffect(
    on(
      () => props.cursor.idx,
      () => {
        const halfHeight =
          document.getElementById(props.cursor.plotId)!.offsetHeight * 0.5;
        setCursorY(
          props.cursor.position.top < halfHeight
            ? props.cursor.position.top + one_rem * 2
            : props.cursor.position.top -
                document.getElementById(props.cursor.plotId + "tooltip")!
                  .offsetHeight,
        );
        if (props.cursor.position.left) {
          setCursorX(props.cursor.position.left + one_rem * 5);
        }
      },
    ),
  );

  return (
    <Portal>
      <Stack
        id={props.cursor.plotId + "tooltip"}
        background="bg.default"
        gap="0"
        style={{
          "border-radius": "0.5rem",
          "border-width": "1px",
          "max-height": "10em",
          "overflow-y": "auto",
          "pointer-events": "auto",
          opacity: "100%",
          position: "absolute",
          top: `${
            document
              .getElementById(props.cursor.plotId)!
              .getBoundingClientRect().y + cursorY()!
          }px`,
          left: `${
            cursorX()! +
            document
              .getElementById(props.cursor.plotId)!
              .getBoundingClientRect().x
          }px`,
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
              const cursorY = props.cursor.position.top;

              const one_rem = parseFloat(
                getComputedStyle(document.documentElement).fontSize,
              );

              const yMin = props.u.posToVal(cursorY - one_rem * 0.6, "y");
              const yMax = props.u.posToVal(cursorY + one_rem * 0.6, "y");

              if (val > yMin || val < yMax) {
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
    </Portal>
  );
};
