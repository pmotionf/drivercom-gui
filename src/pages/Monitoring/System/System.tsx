import { JSX, Show, createSignal } from "solid-js";
import { Line } from "./Line.tsx";
import { Accordion } from "~/components/ui/accordion.tsx";
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
import { Lines, Systems } from "~/pages/Monitoring/Monitoring.tsx";
import { Stack } from "styled-system/jsx/stack";
import { LineCommandParameters } from "./LineControlButton.tsx";

export type SendingCommand = {
  line: string;
  axisId: number;
  movingCarrier?: boolean;
} | null;

export type SystemProps = JSX.HTMLAttributes<HTMLDivElement> & {
  lines: Store<Lines>;
  systems: Store<Systems>;
  sendingCommand: SendingCommand;
  disableMmcCliBtn: boolean;
  onLineCommands?: (params: LineCommandParameters) => void;
  onPush?: (
    line: string,
    commandDirection: string,
    axis: string,
    carrier?: string,
  ) => void;
  onPull?: (
    line: string,
    commandDirection: string,
    axis: string,
    carrier: string,
    destination?: string,
    cas?: string,
  ) => void;
  onStopPull?: (line: string, axisId: number) => void;
  onStopPush?: (line: string, axisId: number) => void;
  onStopCommand?: (line: string, axisId: number) => void;
  onInitialize?: (
    line: string,
    axisId: number,
    direction: string,
    carrierId: string,
    linkAxis?: string,
  ) => void;
  onDeinitialize?: (line: string, axisId: number) => void;
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

  const disableBtn = () => props.disableMmcCliBtn;

  const disableCalibrateButton = (index: number): boolean => {
    if (!props.systems[index] || !props.lines[index]) return true;
    const currentSystem = props.systems[index];
    const carrierState = currentSystem.carrierState;
    if (carrierState.length > 0) return true;

    const axisInfos = currentSystem.axisState;
    const checkFirstAxis =
      axisInfos[0].hallAlarmBack || axisInfos[0].hallAlarmFront;
    const checkOtherAxes = axisInfos
      .slice(1, axisInfos.length)
      .map((status) => !status.hallAlarmBack && !status.hallAlarmFront);
    const ableToCalibrate =
      checkFirstAxis && !checkOtherAxes.some((check) => !check);
    const disableCalibrate = !ableToCalibrate;
    return disableCalibrate;
  };

  const disableSetZero = (index: number): boolean => {
    if (!props.systems[index] || !props.lines[index]) return true;
    const currentSystem = props.systems[index];
    const carrierState = currentSystem.carrierState;
    if (carrierState.length === 0) return true;

    const filterFirstAxisCarrier = carrierState.filter(
      (state) => state.axisMain === 1 || state.axisAuxiliary === 1,
    );
    const disableSetZero = filterFirstAxisCarrier.length === 0;
    return disableSetZero;
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
                      line={props.lines[item]}
                      system={props.systems[item]}
                      disableCommandButton={disableBtn()}
                      disableCalibrateButton={disableCalibrateButton(item)}
                      disableSetZeroButton={disableSetZero(item)}
                      sendingCommand={props.sendingCommand}
                      onLineCommands={(param) => props.onLineCommands?.(param)}
                    >
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
                              {
                                length: props.lines[item].drivers,
                              },
                              (_, i) => i,
                            )}
                          >
                            {(driverIndex) => {
                              const maximumAxisLength = 3;
                              const lineAxesLength = props.lines[item].axes;
                              const driverAxesLength =
                                driverIndex + 1 === props.lines[item].drivers!
                                  ? lineAxesLength % maximumAxisLength !== 0
                                    ? lineAxesLength % maximumAxisLength
                                    : maximumAxisLength
                                  : maximumAxisLength;
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
                                          {
                                            length: driverAxesLength,
                                          },
                                          (_, i) =>
                                            driverIndex * maximumAxisLength + i,
                                        )}
                                      >
                                        {(axisIndex) => {
                                          const axisId = axisIndex + 1;
                                          return (
                                            <Axis
                                              id={`${driverIndex + 1}:${axisId}`}
                                              sendingCommand={
                                                props.sendingCommand &&
                                                props.sendingCommand.line ===
                                                  props.lines[item].name &&
                                                props.sendingCommand.axisId ===
                                                  axisId
                                                  ? true
                                                  : false
                                              }
                                              disableCommandButton={
                                                props.sendingCommand
                                                  ? true
                                                  : false
                                              }
                                              disableMmcCliButton={
                                                props.disableMmcCliBtn
                                              }
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
                                              onPull={(
                                                axisDirection,
                                                carrierId,
                                                cas,
                                                des,
                                              ) => {
                                                props.onPull?.(
                                                  props.lines[item].name,
                                                  axisDirection,
                                                  `${axisId}`,
                                                  carrierId,
                                                  des,
                                                  cas,
                                                );
                                              }}
                                              onPush={(
                                                axisDirection,
                                                carrierId,
                                              ) => {
                                                props.onPush?.(
                                                  props.lines[item].name,
                                                  axisDirection,
                                                  `${axisId}`,
                                                  carrierId,
                                                );
                                              }}
                                              onStopPull={() => {
                                                props.onStopPull?.(
                                                  props.lines[item].name,
                                                  axisId,
                                                );
                                              }}
                                              onStopPush={() => {
                                                props.onStopPush?.(
                                                  props.lines[item].name,
                                                  axisId,
                                                );
                                              }}
                                              onStopCommand={() => {
                                                props.onStopCommand?.(
                                                  props.lines[item].name,
                                                  axisId,
                                                );
                                              }}
                                              onInitialize={(
                                                direction,
                                                carrierId,
                                                axisLink,
                                              ) => {
                                                props.onInitialize?.(
                                                  props.lines[item].name,
                                                  axisId,
                                                  direction,
                                                  carrierId,
                                                  axisLink,
                                                );
                                              }}
                                              onDeinitialize={() => {
                                                props.onDeinitialize?.(
                                                  props.lines[item].name,
                                                  axisId,
                                                );
                                              }}
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
