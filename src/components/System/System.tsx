import { JSX, Show, createSignal } from "solid-js";
import { Line } from "./Line.tsx";
import { Accordion } from "../ui/accordion.tsx";
import { For } from "solid-js/web";
import { Driver } from "./Driver.tsx";
import { Axis } from "./Axes.tsx";
import { Store } from "solid-js/store";

import { useDragDropContext } from "@thisbeyond/solid-dnd";
import {
  DragDropProvider,
  DragDropSensors,
  SortableProvider,
  createSortable,
  closestCenter,
} from "@thisbeyond/solid-dnd";
import { Lines, Systems } from "~/pages/Monitoring.tsx";
import { Stack } from "styled-system/jsx/stack";

export type SystemProps = JSX.HTMLAttributes<HTMLDivElement> & {
  lines: Store<Lines>;
  systems: Store<Systems>;
};

export function System(props: SystemProps) {
  if (props.lines.length === 0) return;

  const [accordionStates, setAccordionStates] = createSignal<string[]>(
    props.lines!.map((val) => val.name!),
  );
  const [dragging, setDragging] = createSignal<boolean>(false);

  const [items, setItems] = createSignal(
    Array.from({ length: props.lines.length }, (_, i) => i),
  );
  const ids = () => items();

  //@ts-ignore Using Library
  const onDragEnd = ({ draggable, droppable }) => {
    if (draggable && droppable) {
      const currentItems = ids();
      const fromIndex = currentItems.indexOf(draggable.id);
      const toIndex = currentItems.indexOf(droppable.id);
      if (fromIndex !== toIndex) {
        const updatedItems = currentItems.slice();
        updatedItems.splice(toIndex, 0, ...updatedItems.splice(fromIndex, 1));
        setItems(updatedItems);
      }
    }
  };

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        "overflow-y": "auto",
      }}
    >
      <Accordion.Root
        multiple
        value={accordionStates()}
        onValueChange={(e) => {
          if (dragging()) {
            setDragging(false);
          } else {
            setAccordionStates(e.value);
          }
        }}
      >
        <DragDropProvider
          onDragStart={() => setDragging(true)}
          //@ts-ignore Using Library
          onDragEnd={onDragEnd}
          collisionDetector={closestCenter}
        >
          <DragDropSensors />
          <SortableProvider ids={ids()}>
            <For each={items()}>
              {(item) => {
                const sortable = createSortable(item);
                //@ts-ignore Using Library
                const [state] = useDragDropContext();

                return (
                  <div
                    //@ts-ignore Using Library
                    use:sortable
                    class="sortable"
                    classList={{
                      "opacity-25": sortable.isActiveDraggable,
                      "transition-transform": !!state.active.draggable,
                    }}
                  >
                    <Line line={props.lines[item]} system={props.systems[item]}>
                      <Show when={props.systems[item]}>
                        <Stack
                          width="100%"
                          height="100%"
                          direction="row"
                          overflowX="auto"
                          gap="1rem"
                        >
                          <For
                            each={Array.from(
                              { length: props.lines[item].axes! / 3 },
                              (_, i) => i,
                            )}
                          >
                            {(driverIndex) => {
                              return (
                                <div>
                                  <Driver
                                    id={`${driverIndex + 1}`}
                                    driverInfo={
                                      props.systems[item].driverState[
                                        driverIndex
                                      ]
                                    }
                                    driverError={
                                      props.systems[item].driverErrors[
                                        driverIndex
                                      ]
                                    }
                                  >
                                    <Stack
                                      direction="row"
                                      gap="0.5rem"
                                      marginTop="0.5rem"
                                    >
                                      <For
                                        each={Array.from(
                                          { length: 3 },
                                          (_, i) => driverIndex * 3 + i,
                                        )}
                                      >
                                        {(axisIndex) => {
                                          const axisId = axisIndex + 1;
                                          return (
                                            <Axis
                                              id={`${driverIndex + 1}:${axisId}`}
                                              axisError={
                                                props.systems[item].axisErrors[
                                                  axisIndex
                                                ]
                                              }
                                              axisInfo={
                                                props.systems[item].axisState[
                                                  axisIndex
                                                ]
                                              }
                                              carrier={
                                                props.systems[item].carrierState
                                                  ? props.systems[item]
                                                      .carrierState
                                                  : null
                                              }
                                            />
                                          );
                                        }}
                                      </For>
                                    </Stack>
                                  </Driver>
                                </div>
                              );
                            }}
                          </For>
                        </Stack>
                      </Show>
                    </Line>
                  </div>
                );
              }}
            </For>
          </SortableProvider>
        </DragDropProvider>
      </Accordion.Root>
    </div>
  );
}
