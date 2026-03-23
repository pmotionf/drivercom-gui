import { createSignal, For, Show } from "solid-js";
import { Lines, Systems } from "../Monitoring";
import { Text } from "~/components/ui/text";
import { css } from "styled-system/css";
import { createDraggable } from "@neodrag/solid";
import { Badge } from "~/components/ui/badge";

export type SystemTopViewProps = { line: Lines; system: Systems };

export const SystemTopView = (props: SystemTopViewProps) => {
  const lines = () => props.line;
  const system = () => props.system;

  //@ts-ignore This draggable is needed to use neo-drag.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { draggable: dragOptions } = createDraggable();

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
          const [x, setX] = createSignal<number>(0);
          const [y, setY] = createSignal<number>(lineIndex() * 200);
          const carrierGap = (line.axisLength - line.carrierLength) * 0.5;

          return (
            <div
              id={line.name}
              style={{
                height: "max-content",
                width: "max-content",
                position: "absolute",
                cursor: "grab",
                "border-radius": "0.2rem",
              }}
              use:dragOptions={{
                bounds: "parent",
                position: {
                  x: x(),
                  y: y(),
                },
                onDragEnd: ({ offsetX, offsetY }) => {
                  setX(offsetX);
                  setY(offsetY);
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
                  width: `${lineWidth}px`,
                  height: `${lineHeight}`,
                  "border-width": "1px",
                  "border-radius": "0.2rem",
                  display: "flex",
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
                          width: `${driverWidth}px`,
                          height: "100%",
                          "border-left-width":
                            line.drivers === 1 ? "0px" : "1px",
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
                        >{`Driver ${driverId}`}</Badge>
                        <div
                          style={{
                            width: "100%",
                            display: "flex",
                            height: `calc(100% - 1.5rem)`,
                          }}
                        >
                          <For each={axesIds}>
                            {(axesId) => {
                              return (
                                <div
                                  style={{
                                    width: `${axisLength}px`,
                                    height: `calc(100% - 0.5rem)`,
                                    "border-width": "1px 0px 1px 0px",
                                    "border-left-width":
                                      axesId === 1 ? "0px" : "1px",
                                  }}
                                >
                                  <Badge
                                    marginLeft={"0.2rem"}
                                    paddingTop=" 0rem"
                                    paddingBottom="0rem"
                                    height="1.5rem"
                                    paddingLeft="0.4rem"
                                    paddingRight="0.4rem"
                                  >{`Axis ${axesId}`}</Badge>
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
                          width: `${line.carrierLength}px `,
                          height: "3.6rem",
                          "border-width": "1px",
                          position: "absolute",
                          left: `calc(${carrierGap}px + ${carrier.position}px)`,
                          top: `5.2rem`,
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
