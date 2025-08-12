import { JSX, Show, createSignal } from "solid-js";
import { Line } from "./Line.tsx";
import { Accordion } from "../ui/accordion.tsx";
import { For } from "solid-js/web";
import { Station } from "./Station.tsx";
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
import { SystemConfig } from "~/pages/Monitoring.tsx";

export type SystemProps = JSX.HTMLAttributes<HTMLDivElement> & {
  value: Store<SystemConfig>;
};

export function System(props: SystemProps) {
  if (props.value.lines.length === 0) return;

  const [accordionStates, setAccordionStates] = createSignal<string[]>(
    props.value.lines!.map((val) => val.line.name!),
  );
  const [dragging, setDragging] = createSignal<boolean>(false);

  const [items, setItems] = createSignal(
    Array.from({ length: props.value.lines.length }, (_, i) => i),
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
                    <Line
                      line={props.value.lines[item].line}
                      system={
                        props.value.lines[item].system
                          ? props.value.lines[item].system
                          : undefined
                      }
                    >
                      <Station>
                        <Show when={props.value.lines[item].system}>
                          <Axis
                            axisError={
                              props.value.lines[item].system!.axisErrors!
                            }
                            axisInfo={
                              props.value.lines[item].system!.axisInfos!
                            }
                            carrier={
                              props.value.lines[item].system!.carrierInfos
                            }
                          />
                        </Show>
                      </Station>
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
