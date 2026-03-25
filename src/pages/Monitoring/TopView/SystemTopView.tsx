import { createSignal, For, Show } from "solid-js";
import { Lines, Systems } from "../Monitoring";
import { Text } from "~/components/ui/text";
import { css } from "styled-system/css";
import { createDraggable } from "@neodrag/solid";
import { Badge } from "~/components/ui/badge";
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
        positionY: i * 200,
      };
    }),
  );

  return (
    <div style={{ width: "100%", height: "100%" }}>
      <For each={lines()}>
        {(line, lineIndex) => {
          const axisLength = line.axisLength;
          const lineWidth = axisLength * line.axes;
          const lineHeight = "8rem";
          const driverIds = Array.from(
            { length: line.drivers },
            (_, i) => i + 1,
          );
          //const [x, setX] = createSignal<number>(0);
          // const [y, setY] = createSignal<number>(lineIndex() * 200);
          const carrierGap = (line.axisLength - line.carrierLength) * 0.5;

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
                height: "max-content",
                width: "max-content",
                position: "absolute",
                cursor: "grab",
                "border-radius": "0.2rem",
              }}
              use:dragOptions={{
                // bounds: "parent",
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
                    ? `${lineHeight}`
                    : `${lineWidth}px`,
                  height: positionStateStore[lineIndex()].rotate
                    ? `${lineWidth}px`
                    : `${lineHeight}`,
                  "border-width": "1px",
                  "border-radius": "0.2rem",
                  display: positionStateStore[lineIndex()].rotate
                    ? undefined
                    : "flex",
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
                          width: positionStateStore[lineIndex()].rotate
                            ? "100%"
                            : `${driverWidth}px`,
                          height: positionStateStore[lineIndex()].rotate
                            ? `${driverWidth}px`
                            : "100%",
                          "border-left-width":
                            line.drivers === 1 ? "0px" : "1px",
                          display: positionStateStore[lineIndex()].rotate
                            ? "flex"
                            : undefined,
                        }}
                      >
                        <Badge
                          marginBottom="0.1rem"
                          marginLeft={"0.1rem"}
                          paddingTop=" 0rem"
                          paddingBottom="0rem"
                          background={
                            system()[lineIndex()].driverState[driverId - 1]
                              .connected
                              ? "accent.customGreen"
                              : "bg.canvas"
                          }
                        >
                          {positionStateStore[lineIndex()].rotate
                            ? `D${driverId}`
                            : `Driver ${driverId}`}
                        </Badge>
                        <div
                          style={{
                            width: positionStateStore[lineIndex()].rotate
                              ? `calc(100% - 1.5rem)`
                              : "100%",
                            display: positionStateStore[lineIndex()].rotate
                              ? "unset"
                              : "flex",
                            height: positionStateStore[lineIndex()].rotate
                              ? "100%"
                              : `calc(100% - 1.5rem)`,
                          }}
                        >
                          <For each={axesIds}>
                            {(axesId) => {
                              return (
                                <div
                                  style={{
                                    width: positionStateStore[lineIndex()]
                                      .rotate
                                      ? "100%"
                                      : `${axisLength}px`,
                                    height: positionStateStore[lineIndex()]
                                      .rotate
                                      ? `${axisLength}px`
                                      : `calc(100% - 0.5rem)`,
                                    "border-width": positionStateStore[
                                      lineIndex()
                                    ].rotate
                                      ? "0px 0px 1px 1px"
                                      : "1px 1px 1px 0px",
                                    "border-left-width":
                                      axesId === 1 ? "0px" : "1px",
                                  }}
                                >
                                  <Badge
                                    marginLeft={"0.2rem"}
                                    paddingTop="0rem"
                                    paddingBottom="0rem"
                                    height="1.5rem"
                                    paddingLeft="0.4rem"
                                    paddingRight="0.4rem"
                                  >
                                    {positionStateStore[lineIndex()].rotate
                                      ? `A${axesId}`
                                      : `Axis ${axesId}`}
                                  </Badge>
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
