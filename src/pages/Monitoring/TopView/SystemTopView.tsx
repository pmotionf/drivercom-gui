import { For, Show } from "solid-js";
import { Lines, Systems } from "../Monitoring";
import { Text } from "~/components/ui/text";
import { css } from "styled-system/css";
import { createDraggable } from "@neodrag/solid";
import { createStore } from "solid-js/store";
import { onMount, onCleanup } from "solid-js";
import Zoomist from "zoomist";
import "zoomist/css"; // 스타일 임포트 필수

export type SystemTopViewProps = { line: Lines; system: Systems };

type Direction = "column" | "row" | "column-reverse" | "row-reverse";

export const SystemTopView = (props: SystemTopViewProps) => {
  const lines = () => props.line;
  const system = () => props.system;

  //@ts-ignore This draggable is needed to use neo-drag.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { draggable: dragOptions } = createDraggable();

  const [positionStateStore, setPositionStateStore] = createStore<
    {
      line: string;
      isVertical: boolean;
      direction: Direction;
      positionX: number;
      positionY: number;
    }[]
  >(
    Array.from(lines()).map((line, i) => {
      return {
        line: line.name,
        isVertical: false,
        direction: "column",
        positionX: 0,
        positionY: i * 250,
      };
    }),
  );

  let containerRef: HTMLDivElement | undefined;
  let zoomistInstance: Zoomist | null = null;

  onMount(() => {
    if (containerRef) {
      zoomistInstance = new Zoomist(containerRef, {
        maxScale: 5,
        minScale: 0.5,
        initScale: 1,
        bounds: false,
        wheelable: true,
        draggable: true,
        zoomRatio: 0.1,
      });
    }
  });

  onCleanup(() => {
    zoomistInstance?.destroy();
  });

  return (
    <div
      ref={containerRef}
      class="zoomist-container"
      style={{ width: "100%", height: "100%" }}
      onDblClick={() => {
        if (zoomistInstance !== null) {
          zoomistInstance.reset();
        }
      }}
    >
      <div
        class="zoomist-wrapper"
        style={{ background: "transparent", position: "relative" }}
      >
        <div style={{ width: "100%", height: "100%" }} class="zoomist-image">
          <For each={lines()}>
            {(line, lineIndex) => {
              const axisLength = line.axisLength;
              const lineWidth = axisLength * line.axes;
              const driverIds = Array.from(
                { length: line.drivers },
                (_, i) => i + 1,
              );
              const carrierGap = (line.axisLength - line.carrierLength) * 0.5;
              const carrierWidth = 200;
              const axesIds = Array.from(
                { length: line.axes },
                (_, i) => i + 1,
              );

              return (
                <div
                  id={line.name}
                  class="zoomist-not-draggable"
                  onClick={(e) => e.stopPropagation()}
                  onContextMenu={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    setPositionStateStore(
                      lineIndex(),
                      "isVertical",
                      !positionStateStore[lineIndex()].isVertical,
                    );
                    setPositionStateStore(
                      lineIndex(),
                      "direction",
                      positionStateStore[lineIndex()].direction === "column"
                        ? "row"
                        : positionStateStore[lineIndex()].direction === "row"
                          ? "column-reverse"
                          : positionStateStore[lineIndex()].direction ===
                              "column-reverse"
                            ? "row-reverse"
                            : "column",
                    );
                  }}
                  style={{
                    height: positionStateStore[lineIndex()].isVertical
                      ? `${lineWidth}px`
                      : `calc(${carrierWidth}px + 2rem)`,
                    width: positionStateStore[lineIndex()].isVertical
                      ? `calc(${carrierWidth}px + 2rem)`
                      : `${lineWidth}px`,
                    position: "absolute",
                    cursor: "grab",
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                  use:dragOptions={{
                    //bounds: "parent",
                    position: {
                      x: positionStateStore[lineIndex()].positionX,
                      y: positionStateStore[lineIndex()].positionY,
                    },
                    onDragEnd: ({ offsetX, offsetY }) => {
                      setPositionStateStore(lineIndex(), "positionX", offsetX);
                      setPositionStateStore(lineIndex(), "positionY", offsetY);
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
                      width: positionStateStore[lineIndex()].isVertical
                        ? `calc(${carrierWidth}px + 2rem)`
                        : `${lineWidth}px`,
                      height: positionStateStore[lineIndex()].isVertical
                        ? `${lineWidth}px`
                        : `calc(${carrierWidth}px + 2rem)`,
                      display: "flex",
                      "flex-direction":
                        positionStateStore[lineIndex()].direction,
                    }}
                  >
                    <div
                      style={{
                        width: positionStateStore[lineIndex()].isVertical
                          ? ` 1rem`
                          : `${axisLength * line.axes}px`,
                        height: positionStateStore[lineIndex()].isVertical
                          ? `${axisLength * line.axes}px`
                          : `1rem`,

                        display: "flex",
                        "flex-direction": positionStateStore[
                          lineIndex()
                        ].direction.includes("column")
                          ? (positionStateStore[lineIndex()].direction.replace(
                              "column",
                              "row",
                            ) as Direction)
                          : (positionStateStore[lineIndex()].direction.replace(
                              "row",
                              "column",
                            ) as Direction),
                        "border-width": "1px",
                      }}
                    >
                      <For each={driverIds}>
                        {(driverId) => {
                          const axesLength =
                            driverId !== driverIds.length
                              ? 3
                              : line.axes % 3 !== 0
                                ? 2
                                : 3;

                          const driverWidth = axisLength * axesLength;

                          return (
                            <div
                              class={css({
                                background: system()[lineIndex()].driverState[
                                  driverId - 1
                                ].connected
                                  ? "accent.customGreen"
                                  : "bg.disabled",
                              })}
                              style={{
                                height: positionStateStore[lineIndex()]
                                  .isVertical
                                  ? `${driverWidth}px`
                                  : "1rem",
                                width: positionStateStore[lineIndex()]
                                  .isVertical
                                  ? "1rem"
                                  : `${driverWidth}px`,
                              }}
                            >
                              <Text
                                size="xs"
                                borderRadius="0.2rem"
                                letterSpacing={
                                  positionStateStore[lineIndex()].isVertical
                                    ? "0.5rem"
                                    : "0"
                                }
                                padding={"0"}
                                writingMode={
                                  positionStateStore[lineIndex()].isVertical
                                    ? "vertical-lr"
                                    : undefined
                                }
                                textOrientation={
                                  positionStateStore[lineIndex()].isVertical
                                    ? "upright"
                                    : undefined
                                }
                              >
                                {positionStateStore[lineIndex()].isVertical
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
                        width: positionStateStore[lineIndex()].isVertical
                          ? ` 1rem`
                          : `${axisLength * line.axes}px`,
                        height: positionStateStore[lineIndex()].isVertical
                          ? `${axisLength * line.axes}px`
                          : `1rem`,

                        display: "flex",
                        "flex-direction": positionStateStore[
                          lineIndex()
                        ].direction.includes("column")
                          ? (positionStateStore[lineIndex()].direction.replace(
                              "column",
                              "row",
                            ) as Direction)
                          : (positionStateStore[lineIndex()].direction.replace(
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
                                width: positionStateStore[lineIndex()]
                                  .isVertical
                                  ? `calc(${carrierWidth}px + 1rem)`
                                  : `${axisLength}px`,
                                height: positionStateStore[lineIndex()]
                                  .isVertical
                                  ? `${axisLength}px`
                                  : `calc(${carrierWidth}px + 1rem)`,
                                display: "flex",
                                "flex-direction": positionStateStore[
                                  lineIndex()
                                ].isVertical
                                  ? "row"
                                  : "column",
                                gap: "0",
                              }}
                            >
                              <div
                                class={css({
                                  background:
                                    system()[lineIndex()].axisState[axisIndex()]
                                      .waitingPull ||
                                    system()[lineIndex()].axisState[axisIndex()]
                                      .waitingPush
                                      ? "accent.customOrange"
                                      : system()[lineIndex()].axisState[
                                            axisIndex()
                                          ].motorActive
                                        ? "accent.customGreen"
                                        : "bg.muted",
                                  opacity: "0.8",
                                  borderColor: "bg.disabled",
                                })}
                                style={{
                                  width: positionStateStore[lineIndex()]
                                    .isVertical
                                    ? "1rem"
                                    : `${axisLength}px`,
                                  height: positionStateStore[lineIndex()]
                                    .isVertical
                                    ? `${axisLength}px`
                                    : "1rem",
                                  "border-width": positionStateStore[
                                    lineIndex()
                                  ].isVertical
                                    ? "0px 0px 1px 0px"
                                    : axisId === axesIds.length
                                      ? "0px"
                                      : "0px 1px 0px 0px",
                                }}
                              >
                                <Text
                                  size="xs"
                                  borderRadius="0.2rem"
                                  letterSpacing={
                                    positionStateStore[lineIndex()].isVertical
                                      ? "0.5rem"
                                      : "0"
                                  }
                                  padding={"0"}
                                  writingMode={
                                    positionStateStore[lineIndex()].isVertical
                                      ? "vertical-lr"
                                      : undefined
                                  }
                                  textOrientation={
                                    positionStateStore[lineIndex()].isVertical
                                      ? "upright"
                                      : undefined
                                  }
                                >
                                  {positionStateStore[lineIndex()].isVertical
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
                        width: positionStateStore[lineIndex()].isVertical
                          ? `${carrierWidth}px `
                          : `${axisLength * line.axes}px`,
                        height: positionStateStore[lineIndex()].isVertical
                          ? `${axisLength * line.axes}px`
                          : `${carrierWidth}px`,

                        display: positionStateStore[lineIndex()].isVertical
                          ? undefined
                          : "flex",
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
                                width: positionStateStore[lineIndex()]
                                  .isVertical
                                  ? `${carrierWidth - 2}px`
                                  : `${axisLength}px`,
                                height: positionStateStore[lineIndex()]
                                  .isVertical
                                  ? `${axisLength}px`
                                  : `${carrierWidth - 2}px `,
                                "border-width": positionStateStore[lineIndex()]
                                  .isVertical
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
                    when={
                      system()[lineIndex()].carrierState &&
                      system()[lineIndex()].carrierState.length > 0
                    }
                  >
                    <For each={system()[lineIndex()].carrierState}>
                      {(carrier) => {
                        return (
                          <div
                            class={css({
                              background: "bg.default",
                              shadow: "md",
                              borderColor: "bg.disabled",
                            })}
                            style={{
                              width: positionStateStore[lineIndex()].isVertical
                                ? `${carrierWidth}px`
                                : `${line.carrierLength}px `,
                              height: positionStateStore[lineIndex()].isVertical
                                ? `${line.carrierLength}px `
                                : `${carrierWidth}px`,
                              "border-width": "1px",
                              position: "absolute",
                              left: positionStateStore[lineIndex()].isVertical
                                ? positionStateStore[
                                    lineIndex()
                                  ].direction.includes("reverse")
                                  ? "0"
                                  : "2rem"
                                : positionStateStore[
                                      lineIndex()
                                    ].direction.includes("reverse")
                                  ? `calc(${axisLength * line.axes}px - ${line.carrierLength}px - ${carrierGap}px - ${carrier.position}px)`
                                  : `calc(${carrierGap}px + ${carrier.position}px)`,
                              top: positionStateStore[lineIndex()].isVertical
                                ? positionStateStore[
                                    lineIndex()
                                  ].direction.includes("reverse")
                                  ? `calc(${axisLength * line.axes}px - ${line.carrierLength}px - ${carrierGap}px - ${carrier.position}px + 1.5rem)`
                                  : `calc(${carrierGap}px + ${carrier.position}px + 1.5rem)`
                                : positionStateStore[
                                      lineIndex()
                                    ].direction.includes("reverse")
                                  ? "1.5rem"
                                  : "3.5rem",
                              "z-index": "10",
                              "border-radius": "0.2rem",
                            }}
                          >
                            <Text
                              marginLeft="0.2rem"
                              size="sm"
                              fontWeight="medium"
                            >{`Carrier ${carrier.id}`}</Text>
                          </div>
                        );
                      }}
                    </For>
                  </Show>
                </div>
              );
            }}
          </For>
        </div>
      </div>
    </div>
  );
};
