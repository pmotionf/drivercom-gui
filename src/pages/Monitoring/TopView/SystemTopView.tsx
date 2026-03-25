import { For, Show } from "solid-js";
import { Lines, Systems } from "../Monitoring";
import { Text } from "~/components/ui/text";
import { css } from "styled-system/css";
import { createDraggable } from "@neodrag/solid";
import { createStore } from "solid-js/store";

export type SystemTopViewProps = { line: Lines; system: Systems };

export const SystemTopView = (props: SystemTopViewProps) => {
  const lines = () => props.line;
  const system = () => props.system;

  //@ts-ignore This draggable is needed to use neo-drag.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { draggable: dragOptions } = createDraggable();

  const [positionStateStore, setPositionStateStore] = createStore<
    { line: string; rotate: boolean; positionX: number; positionY: number }[]
  >(
    Array.from(lines()).map((line, i) => {
      return {
        line: line.name,
        rotate: false,
        positionX: 0,
        positionY: i * 250,
      };
    }),
  );

  return (
    <div style={{ width: "100%", height: "100%" }}>
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

          return (
            <div
              id={line.name}
              onContextMenu={(e) => {
                e.stopPropagation();
                e.preventDefault();
                setPositionStateStore(
                  lineIndex(),
                  "rotate",
                  !positionStateStore[lineIndex()].rotate,
                );
              }}
              style={{
                height: positionStateStore[lineIndex()].rotate
                  ? `${lineWidth}px`
                  : `calc(${carrierWidth}px + 2rem)`,
                width: positionStateStore[lineIndex()].rotate
                  ? `calc(${carrierWidth}px + 2rem)`
                  : `${lineWidth}px`,
                position: "absolute",
                cursor: "grab",
              }}
              use:dragOptions={{
                bounds: "parent",
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
                  width: positionStateStore[lineIndex()].rotate
                    ? `calc(${carrierWidth}px + 2rem)`
                    : `${lineWidth}px`,
                  height: positionStateStore[lineIndex()].rotate
                    ? `${lineWidth}px`
                    : `calc(${carrierWidth}px + 2rem)`,
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
                    const axesIds = Array.from(
                      { length: axesLength },
                      (_, i) => i + 1,
                    );
                    const driverWidth = axisLength * axesLength;

                    return (
                      <div
                        style={{
                          display: positionStateStore[lineIndex()].rotate
                            ? "flex"
                            : undefined,
                          height: positionStateStore[lineIndex()].rotate
                            ? `${driverWidth}px`
                            : `calc(${carrierWidth}px + 2rem)`,
                          width: positionStateStore[lineIndex()].rotate
                            ? `calc(${carrierWidth}px + 2rem)`
                            : `${driverWidth}px`,
                        }}
                      >
                        <div
                          class={css({
                            background: system()[lineIndex()].driverState[
                              driverId - 1
                            ].connected
                              ? "accent.customGreen"
                              : "bg.disabled",
                          })}
                          style={{
                            height: positionStateStore[lineIndex()].rotate
                              ? `${driverWidth}px`
                              : "1rem",
                            width: positionStateStore[lineIndex()].rotate
                              ? "1rem"
                              : `${driverWidth}px`,
                          }}
                        >
                          <Text
                            size="xs"
                            borderRadius="0.2rem"
                            letterSpacing={
                              positionStateStore[lineIndex()].rotate
                                ? "0.5rem"
                                : "0"
                            }
                            padding={"0"}
                            writingMode={
                              positionStateStore[lineIndex()].rotate
                                ? "vertical-lr"
                                : undefined
                            }
                            textOrientation={
                              positionStateStore[lineIndex()].rotate
                                ? "upright"
                                : undefined
                            }
                          >
                            {positionStateStore[lineIndex()].rotate
                              ? `D${driverId}`
                              : `Driver ${driverId}`}
                          </Text>
                        </div>

                        <div
                          style={{
                            width: positionStateStore[lineIndex()].rotate
                              ? `calc(${carrierWidth}px + 1rem)`
                              : `${driverWidth}px`,
                            height: positionStateStore[lineIndex()].rotate
                              ? `${driverWidth}px`
                              : `calc(${carrierWidth}px + 1rem)`,

                            display: positionStateStore[lineIndex()].rotate
                              ? undefined
                              : "flex",
                            "border-width": "1px",
                          }}
                        >
                          <For each={axesIds}>
                            {(axisId) => {
                              return (
                                <div
                                  style={{
                                    width: positionStateStore[lineIndex()]
                                      .rotate
                                      ? `calc(${carrierWidth}px + 1rem)`
                                      : `${axisLength}px`,
                                    height: positionStateStore[lineIndex()]
                                      .rotate
                                      ? `${axisLength}px`
                                      : `calc(${carrierWidth}px + 1rem)`,
                                    display: "flex",
                                    "flex-direction": positionStateStore[
                                      lineIndex()
                                    ].rotate
                                      ? "row"
                                      : "column",
                                    gap: "0",
                                  }}
                                >
                                  <div
                                    class={css({
                                      background: "bg.muted",
                                      borderColor: "bg.disabled",
                                    })}
                                    style={{
                                      width: positionStateStore[lineIndex()]
                                        .rotate
                                        ? "1rem"
                                        : `${axisLength}px`,
                                      height: positionStateStore[lineIndex()]
                                        .rotate
                                        ? `${axisLength}px`
                                        : "1rem",
                                      "border-width": positionStateStore[
                                        lineIndex()
                                      ].rotate
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
                                        positionStateStore[lineIndex()].rotate
                                          ? "0.5rem"
                                          : "0"
                                      }
                                      padding={"0"}
                                      writingMode={
                                        positionStateStore[lineIndex()].rotate
                                          ? "vertical-lr"
                                          : undefined
                                      }
                                      textOrientation={
                                        positionStateStore[lineIndex()].rotate
                                          ? "upright"
                                          : undefined
                                      }
                                    >
                                      {positionStateStore[lineIndex()].rotate
                                        ? `A${axisId}`
                                        : `Axis ${axisId}`}
                                    </Text>
                                  </div>
                                  <div
                                    style={{
                                      width: positionStateStore[lineIndex()]
                                        .rotate
                                        ? `calc(${carrierWidth}px + 1rem)`
                                        : `${axisLength}px`,
                                      height: positionStateStore[lineIndex()]
                                        .rotate
                                        ? `${axisLength}px`
                                        : `calc(${carrierWidth}px + 1rem)`,
                                      "border-width": positionStateStore[
                                        lineIndex()
                                      ].rotate
                                        ? "0px 0px 1px 0px"
                                        : axisId === axesIds.length
                                          ? "0px"
                                          : "0px 1px 0px 0px",
                                    }}
                                  />
                                </div>
                              );
                            }}
                          </For>
                        </div>
                      </div>
                    );
                  }}
                </For>
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
                          width: positionStateStore[lineIndex()].rotate
                            ? "3.6rem"
                            : `${line.carrierLength}px `,
                          height: positionStateStore[lineIndex()].rotate
                            ? `${line.carrierLength}px `
                            : "3.6rem",
                          "border-width": "1px",
                          position: "absolute",
                          left: positionStateStore[lineIndex()].rotate
                            ? "4.2rem"
                            : `calc(${carrierGap}px + ${carrier.position}px)`,
                          top: positionStateStore[lineIndex()].rotate
                            ? `calc(${carrierGap}px + ${carrier.position}px + 1.5rem)`
                            : `5.2rem`,
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
  );
};
