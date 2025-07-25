import { JSX, on, onMount, Show } from "solid-js";
import { Line, LineConfig } from "./Line.tsx";
import { Accordion } from "../ui/accordion.tsx";
import { For } from "solid-js/web";
import { Station } from "./Station.tsx";
import { Axis } from "./Axes.tsx";
import { createSignal } from "solid-js";
import { createDraggable } from "@neodrag/solid";
import { Stack } from "styled-system/jsx/stack";
import { createEffect } from "solid-js";

export type SystemProps = JSX.HTMLAttributes<HTMLDivElement> & {
  lineConfig: LineConfig[];
};

export function System(props: SystemProps) {
  const [lineNames, setLineNames] = createSignal<string[]>(
    props.lineConfig.map((config) => config.line.name!),
  );
  const lineDivElements: Map<string, string> = new Map();
  onMount(() => {
    if (lineNames().length < 0) return;
    lineNames().forEach((name) => {
      lineDivElements.set(name, crypto.randomUUID());
    });
  });

  const [draggingLine, setDraggingLine] = createSignal<string>("");
  //@ts-ignore This draggable is needed to use neo-drag.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { draggable: dragOptions } = createDraggable();

  const reorderLines = (
    prevIndex: number,
    nextIndex: number,
    lineNames: string[],
  ) => {
    const draggedLine = lineNames[prevIndex];
    const removedLines = lineNames.filter((_, i) => i !== prevIndex);
    const updatedLines = [
      ...removedLines.slice(0, nextIndex),
      draggedLine,
      ...removedLines.slice(nextIndex, removedLines.length),
    ];
    return updatedLines;
  };

  const [render, setRender] = createSignal<boolean>(true);

  createEffect(
    on(
      () => render(),
      () => {
        if (!render()) {
          setTimeout(() => {
            setRender(true);
          }, 0);
        }
      },
      { defer: true },
    ),
  );

  const [accordionValues, setAccordionValues] = createSignal<string[]>(
    props.lineConfig.map((line) => line.line.name!),
  );

  const [dragoverLineName, setDragOverLineName] = createSignal<string | null>(
    null,
  );
  let scrollContainer: HTMLDivElement | undefined;

  const getOvelayTop = (
    lineName: string,
    lineNames: string[],
    scrollTop: number,
  ) => {
    const lineIndex = lineNames.indexOf(lineName);
    let itemTop: number = 0;
    for (let i = 0; i < lineIndex; i++) {
      const divId = lineDivElements.get(lineNames[i])!;
      const div = document.getElementById(divId);
      if (!div) break;
      itemTop = itemTop + div.offsetHeight;
    }
    return itemTop - scrollTop;
  };

  return (
    <div
      ref={scrollContainer}
      style={{
        width: "100%",
        height: "100%",
        "overflow-y": "auto",
      }}
    >
      <Show when={render()}>
        <Accordion.Root
          multiple
          defaultValue={accordionValues()}
          onValueChange={(e) => setAccordionValues(e.value)}
          style={{
            width: "100%",
            height: "100%",
          }}
        >
          <For each={lineNames()}>
            {(lineName, lineIndex) => {
              return (
                <div
                  style={{
                    position: "relative",
                    "z-index": draggingLine() === lineName ? 100 : 0,
                    "pointer-events":
                      draggingLine() === lineName ? "none" : undefined,
                  }}
                  onMouseEnter={() => {
                    if (draggingLine()) {
                      setDragOverLineName(lineName);
                    }
                  }}
                  onMouseLeave={() => {
                    if (draggingLine()) {
                      setTimeout(() => {
                        if (draggingLine() === lineName) {
                          setDragOverLineName(null);
                        }
                      }, 10);
                    }
                  }}
                  use:dragOptions={{
                    cancel: ".cancel",
                    onDragStart: () => {
                      setDraggingLine(lineName);
                    },
                    onDragEnd: () => {
                      if (dragoverLineName()) {
                        const nextIndex = lineNames().indexOf(
                          dragoverLineName()!,
                        );
                        if (nextIndex > -1) {
                          const updateLines = reorderLines(
                            lineIndex(),
                            nextIndex,
                            lineNames(),
                          );
                          setTimeout(() => {
                            setLineNames(updateLines);
                          }, 10);
                        }
                      }
                      setDragOverLineName(null);
                      setDraggingLine("");
                      setRender(false);
                    },
                  }}
                >
                  <div id={lineDivElements.get(lineName)}>
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
                </div>
              );
            }}
          </For>
          <Show
            when={
              dragoverLineName() &&
              lineDivElements.get(dragoverLineName()!) &&
              document.getElementById(lineDivElements.get(dragoverLineName()!)!)
            }
          >
            <Stack
              style={{
                top: `${getOvelayTop(dragoverLineName()!, lineNames(), scrollContainer!.scrollTop) + 1}px`,
                height: `${document.getElementById(lineDivElements.get(dragoverLineName()!)!)!.offsetHeight}px`,
                width: `${document.getElementById(lineDivElements.get(dragoverLineName()!)!)?.offsetWidth}px`,
                position: "absolute",
                "z-index": 10,
                opacity: "0.2",
              }}
              backgroundColor="fg.default"
            >
              {
                document.getElementById(
                  lineDivElements.get(dragoverLineName()!)!,
                )!.clientTop
              }
            </Stack>
          </Show>
        </Accordion.Root>
      </Show>
    </div>
  );
}
