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
import { enumSeriesMap, enumMappings } from "~/GlobalState";
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
  const [positionY, setPositionY] = createSignal<number | null>(null);

  const oneRem = parseFloat(
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
            ? props.cursor.position.top + oneRem * 2
            : props.cursor.position.top -
                document.getElementById(props.cursor.plotId + "tooltip")!
                  .offsetHeight,
        );
        if (props.cursor.position.left) {
          setCursorX(props.cursor.position.left + oneRem * 5);
        }
        setPositionY(props.cursor.position.top);
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
            let enumMappingIndex: number | null = null;
            if (enumSeriesMap.has(series.label)) {
              const seriesEnumTypeName = enumSeriesMap.get(series.label);
              const findIndex = enumMappings().findIndex(
                (mapping) => mapping.enumTypeName === seriesEnumTypeName,
              );
              if (findIndex !== -1) {
                enumMappingIndex = findIndex;
              }
            }
            const cursorRange = oneRem * 0.6;

            return (
              <Show
                when={
                  props.u.data[i() + 1][props.cursor.idx]! >
                    props.u.posToVal(positionY()! + cursorRange, "y") &&
                  props.u.data[i() + 1][props.cursor.idx]! <
                    props.u.posToVal(positionY()! - cursorRange, "y") &&
                  props.u.series[i() + 1].show
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
                  <Text size="sm">
                    {enumMappingIndex
                      ? `${enumMappings()[enumMappingIndex!].enumValues.get(props.u.data[i() + 1][props.cursor.xValue]!)}(${props.u.data[i() + 1][props.cursor.xValue]})`
                      : props.u.data[i() + 1][props.cursor.xValue]}
                  </Text>
                </Stack>
              </Show>
            );
          }}
        </For>
      </Stack>
    </Portal>
  );
};
