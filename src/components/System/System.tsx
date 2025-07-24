import { JSX } from "solid-js";
import { Line, LineConfig } from "./Line.tsx";
import { Accordion } from "../ui/accordion.tsx";
import { For } from "solid-js/web";
import { Station } from "./Station.tsx";
import { Axis } from "./Axes.tsx";
import { createSignal } from "solid-js";
import { createDraggable } from "@neodrag/solid";
import { Stack } from "styled-system/jsx/stack";

export type SystemProps = JSX.HTMLAttributes<HTMLDivElement> & {
  lineConfig: LineConfig[];
};

export function System(props: SystemProps) {
  const [lineNames, setLineNames] = createSignal<string[]>(
    props.lineConfig.map((config) => config.line.name!),
  );
  const [draggingLine, setDraggingLine] = createSignal<string>("");

  //@ts-ignore This draggable is needed to use neo-drag.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { draggable: dragOptions } = createDraggable();
  return (
    <Accordion.Root
      multiple
      defaultValue={props.lineConfig.map((line) => line.line.name!)}
      style={{
        width: "100%",
        height: "100%",
      }}
    >
      <For each={lineNames()}>
        {(lineName) => {
          return (
            <div
              style={{
                position: "relative",
                "z-index": draggingLine() === lineName ? 100 : 0,
              }}
              use:dragOptions={{
                bounds: "parent",
                cancel: ".cancel",
                onDragStart: (data) => {
                  console.log(data.event.offsetY, "dragStart");
                  setDraggingLine(lineName);
                },
                onDrag: (data) => {
                  console.log(data.event.clientY, "dragging");
                },
                onDragEnd: (data) => {
                  console.log(data.event.clientY, "dragEnd");
                  setDraggingLine("");
                },
              }}
            >
              <Line
                value={
                  props.lineConfig[
                    props.lineConfig
                      .map((config) => config.line.name)
                      .indexOf(lineName)
                  ]
                }
              >
                <Station>
                  <Axis />
                </Station>
              </Line>
            </div>
          );
        }}
      </For>
    </Accordion.Root>
  );
}
