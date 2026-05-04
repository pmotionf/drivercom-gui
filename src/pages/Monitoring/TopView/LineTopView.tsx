import { LineType, TrackType } from "~/services/ServerHandler";
import { Direction, PositionStateStore } from "./SystemTopView";
import { Text } from "~/components/ui/text";
import { css } from "styled-system/css";
import { For, Show, createSignal } from "solid-js";
import { createDraggable } from "@neodrag/solid";

export type LineTopViewProps = {
  line: LineType;
  system: TrackType;
  positionStateStore: PositionStateStore;
  onRotate?: () => void;
  onStorePosition?: (offsetX: number, offsetY: number) => void;
  linked?: LineTopViewProps;
};

export function LineTopView(props: LineTopViewProps) {
  const line = props.line;
  const axisLength = line.axisLength;
  const lineWidth = axisLength * line.axes;
  const driverIds = Array.from({ length: line.drivers }, (_, i) => i + 1);
  const carrierGap = (line.axisLength - line.carrierLength) * 0.5;
  const carrierWidth = line.carrierWidth;
  const axesIds = Array.from({ length: line.axes }, (_, i) => i + 1);

  //@ts-ignore This draggable is needed to use neo-drag.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { draggable: dragOptions } = createDraggable();

  const [onRightClick, setRightClick] = createSignal<boolean>(false);
  const [outsideClick, setOutSideClick] = createSignal<boolean>(false);

  return (
    <div
      id={line.name}
      class="zoomist-not-draggable cancel"
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => {
        // e.stopPropagation();
        // e.preventDefault();
        // props.onRotate?.();
      }}
      onContextLost={() => {
        console.log("context lost");
      }}
      style={{
        height: props.positionStateStore.isVertical
          ? `${lineWidth}px`
          : `calc(${carrierWidth}px + 2rem)`,
        width: props.positionStateStore.isVertical
          ? `calc(${carrierWidth}px + 2rem)`
          : `${lineWidth}px`,
        position: "absolute",
        cursor: "grab",
      }}
      onMouseDown={(e) => e.stopPropagation()}
      use:dragOptions={{
        cancel: ".cancel",
        position: {
          x: props.positionStateStore.positionX,
          y: props.positionStateStore.positionY,
        },
        onDragEnd: ({ offsetX, offsetY }) => {
          props.onStorePosition?.(offsetX, offsetY);
        },
      }}
    >
      <Text fontWeight="bold">
        {Array.from(line.name).map((char, i) =>
          line.name[i] === " "
            ? char.toUpperCase()
            : i === 0
              ? char.toUpperCase()
              : char.toLowerCase(),
        )}
      </Text>
      <div
        class={css({ background: "bg.default" })}
        style={{
          width: props.positionStateStore.isVertical
            ? `calc(${carrierWidth}px + 2rem)`
            : `${lineWidth}px`,
          height: props.positionStateStore.isVertical
            ? `${lineWidth}px`
            : `calc(${carrierWidth}px + 2rem)`,
          display: "flex",
          "flex-direction": props.positionStateStore.direction,
        }}
      >
        <div
          style={{
            width: props.positionStateStore.isVertical
              ? ` 1rem`
              : `${axisLength * line.axes}px`,
            height: props.positionStateStore.isVertical
              ? `${axisLength * line.axes}px`
              : `1rem`,

            display: "flex",
            "flex-direction": props.positionStateStore.direction.includes(
              "column",
            )
              ? (props.positionStateStore.direction.replace(
                  "column",
                  "row",
                ) as Direction)
              : (props.positionStateStore.direction.replace(
                  "row",
                  "column",
                ) as Direction),
            "border-width": "1px",
          }}
        >
          <For each={driverIds}>
            {(driverId) => {
              const axesLength =
                driverId !== driverIds.length ? 3 : line.axes % 3 !== 0 ? 2 : 3;

              const driverWidth = axisLength * axesLength;

              return (
                <div
                  class={css({
                    background: props.system.driverState[driverId - 1].connected
                      ? "accent.customGreen"
                      : "bg.disabled",
                  })}
                  style={{
                    height: props.positionStateStore.isVertical
                      ? `${driverWidth}px`
                      : "1rem",
                    width: props.positionStateStore.isVertical
                      ? "1rem"
                      : `${driverWidth}px`,
                  }}
                >
                  <Text
                    size="xs"
                    borderRadius="0.2rem"
                    textAlign={"center"}
                    letterSpacing={
                      props.positionStateStore.isVertical ? "0.5rem" : "0"
                    }
                    padding={"0"}
                    writingMode={
                      props.positionStateStore.isVertical
                        ? "vertical-lr"
                        : undefined
                    }
                    textOrientation={
                      props.positionStateStore.isVertical
                        ? "upright"
                        : undefined
                    }
                  >
                    {props.positionStateStore.isVertical
                      ? `D${driverId}`
                      : `Driver ${driverId}`}
                  </Text>
                </div>
              );
            }}
          </For>
        </div>
        <div
          style={{
            width: props.positionStateStore.isVertical
              ? ` 1rem`
              : `${axisLength * line.axes}px`,
            height: props.positionStateStore.isVertical
              ? `${axisLength * line.axes}px`
              : `1rem`,

            display: "flex",
            "flex-direction": props.positionStateStore.direction.includes(
              "column",
            )
              ? (props.positionStateStore.direction.replace(
                  "column",
                  "row",
                ) as Direction)
              : (props.positionStateStore.direction.replace(
                  "row",
                  "column",
                ) as Direction),
            "border-width": "1px",
          }}
        >
          <For each={axesIds}>
            {(axisId, axisIndex) => {
              return (
                <div
                  style={{
                    width: props.positionStateStore.isVertical
                      ? `calc(${carrierWidth}px + 1rem)`
                      : `${axisLength}px`,
                    height: props.positionStateStore.isVertical
                      ? `${axisLength}px`
                      : `calc(${carrierWidth}px + 1rem)`,
                    display: "flex",
                    "flex-direction": props.positionStateStore.isVertical
                      ? "row"
                      : "column",
                    gap: "0",
                  }}
                >
                  <div
                    class={css({
                      background:
                        props.system.axisState[axisIndex()].waitingPull ||
                        props.system.axisState[axisIndex()].waitingPush
                          ? "accent.customOrange"
                          : props.system.axisState[axisIndex()].motorActive
                            ? "accent.customGreen"
                            : "bg.muted",
                      opacity: "0.8",
                      borderColor: "bg.disabled",
                    })}
                    style={{
                      width: props.positionStateStore.isVertical
                        ? "1rem"
                        : `${axisLength}px`,
                      height: props.positionStateStore.isVertical
                        ? `${axisLength}px`
                        : "1rem",
                      "border-width": props.positionStateStore.isVertical
                        ? "0px 0px 1px 0px"
                        : axisId === axesIds.length
                          ? "0px"
                          : "0px 1px 0px 0px",
                    }}
                  >
                    <Text
                      size="xs"
                      borderRadius="0.2rem"
                      textAlign={"center"}
                      letterSpacing={
                        props.positionStateStore.isVertical ? "0.5rem" : "0"
                      }
                      padding={"0"}
                      writingMode={
                        props.positionStateStore.isVertical
                          ? "vertical-lr"
                          : undefined
                      }
                      textOrientation={
                        props.positionStateStore.isVertical
                          ? "upright"
                          : undefined
                      }
                    >
                      {props.positionStateStore.isVertical
                        ? `A${axisId}`
                        : `Axis ${axisId}`}
                    </Text>
                  </div>
                </div>
              );
            }}
          </For>
        </div>
        <div
          style={{
            width: props.positionStateStore.isVertical
              ? `${carrierWidth}px `
              : `${axisLength * line.axes}px`,
            height: props.positionStateStore.isVertical
              ? `${axisLength * line.axes}px`
              : `${carrierWidth}px`,

            display: props.positionStateStore.isVertical ? undefined : "flex",
            "border-width": "1px",
          }}
        >
          <For each={axesIds}>
            {(axisId) => {
              return (
                <div
                  class={css({
                    background: "bg.canvas",
                  })}
                  style={{
                    width: props.positionStateStore.isVertical
                      ? `${carrierWidth - 2}px`
                      : `${axisLength}px`,
                    height: props.positionStateStore.isVertical
                      ? `${axisLength}px`
                      : `${carrierWidth - 2}px `,
                    "border-width": props.positionStateStore.isVertical
                      ? "0px 0px 1px 0px"
                      : axisId === axesIds.length
                        ? "0px"
                        : "0px 1px 0px 0px",
                  }}
                />
              );
            }}
          </For>
        </div>
      </div>
      <Show
        when={props.system.carrierState && props.system.carrierState.length > 0}
      >
        <For each={props.system.carrierState}>
          {(carrier) => {
            return (
              <div
                class={css({
                  background: "bg.default",
                  shadow: "md",
                  borderColor: "bg.disabled",
                })}
                style={{
                  position: "absolute",
                  left: props.positionStateStore.isVertical
                    ? props.positionStateStore.direction.includes("reverse")
                      ? "0"
                      : "2rem"
                    : props.positionStateStore.direction.includes("reverse")
                      ? `calc(${axisLength * line.axes}px - ${line.carrierLength}px - ${carrierGap}px - ${carrier.position}px)`
                      : `calc(${carrierGap}px + ${carrier.position}px)`,
                  top: props.positionStateStore.isVertical
                    ? props.positionStateStore.direction.includes("reverse")
                      ? `calc(${axisLength * line.axes}px - ${line.carrierLength}px - ${carrierGap}px - ${carrier.position}px + 1.5rem)`
                      : `calc(${carrierGap}px + ${carrier.position}px + 1.5rem)`
                    : props.positionStateStore.direction.includes("reverse")
                      ? "1.5rem"
                      : "3.5rem",
                  "z-index": "10",
                }}
              >
                <Show
                  when={props.linked}
                  fallback={
                    <Text
                      style={{
                        width: props.positionStateStore.isVertical
                          ? `${carrierWidth}px`
                          : `${line.carrierLength}px `,
                        height: props.positionStateStore.isVertical
                          ? `${line.carrierLength}px `
                          : `${carrierWidth}px`,
                        "border-width": "1px",
                        "border-radius": "0.2rem",
                      }}
                      marginLeft="0.2rem"
                      size="sm"
                      fontWeight="medium"
                    >{`Carrier ${carrier.id}`}</Text>
                  }
                >
                  <LineTopView
                    line={props.line}
                    system={props.system}
                    positionStateStore={{
                      line: props.line.name,
                      isVertical: true,
                      direction: "row",
                      positionX: 0,
                      positionY:
                        props.line.axisLength * props.line.axes * 0.5 * -1,
                    }}
                  />
                </Show>
              </div>
            );
          }}
        </For>
      </Show>
      <Show when={onRightClick()}></Show>
    </div>
  );
}
