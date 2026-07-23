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

type SystemLineCommandParam = {
  lineIndex: number;
} & LineCommandParameters;

export type SystemProps = JSX.HTMLAttributes<HTMLDivElement> & {
  lines: Store<Lines>;
  systems: Store<Systems>;
  sendingCommand: SendingCommand;
  onLineCommands?: (params: SystemLineCommandParam) => void;
  onPush?: (
    lineIndex: number,
    commandDirection: string,
    axis: string,
    carrier?: string,
  ) => void;
  onPull?: (
    lineIndex: number,
    commandDirection: string,
    axis: string,
    carrier: string,
    destination?: string,
    cas?: string,
  ) => void;
  onStopPull?: (lineIndex: number, axisId: number) => void;
  onStopPush?: (lineIndex: number, axisId: number) => void;
  onInitialize?: (
    lineIndex: number,
    axisId: number,
    direction: string,
    carrierId: string,
    linkAxis?: string,
  ) => void;
  onDeinitialize?: (lineIndex: number, axisId: number) => void;
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
              {(lineIndex) => {
                const sortable = createSortable(lineIndex);
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
                      line={props.lines[lineIndex]}
                      system={props.systems[lineIndex]}
                      disableCalibrateButton={disableCalibrateButton(lineIndex)}
                      disableSetZeroButton={disableSetZero(lineIndex)}
                      sendingCommand={props.sendingCommand}
                      onLineCommands={(param) => {
                        const newParam: SystemLineCommandParam = {
                          lineIndex: lineIndex,
                          speed: param.speed,
                          acceleration: param.acceleration,
                          calibrate: param.calibrate,
                          setZero: param.setZero,
                        };
                        props.onLineCommands?.(newParam);
                      }}
                    >
                      <Show when={props.systems[lineIndex]}>
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
                                length: props.lines[lineIndex].drivers,
                              },
                              (_, i) => i,
                            )}
                          >
                            {(driverIndex) => {
                              const maximumAxisLength = 3;
                              const lineAxesLength =
                                props.lines[lineIndex].axes;
                              const driverAxesLength =
                                driverIndex + 1 ===
                                props.lines[lineIndex].drivers!
                                  ? lineAxesLength % maximumAxisLength !== 0
                                    ? lineAxesLength % maximumAxisLength
                                    : maximumAxisLength
                                  : maximumAxisLength;
                              return (
                                <div>
                                  <Driver
                                    id={`${driverIndex + 1}`}
                                    driverInfo={
                                      props.systems[lineIndex].driverState[
                                        driverIndex
                                      ]
                                    }
                                    driverError={
                                      props.systems[lineIndex].driverErrors[
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
                                                  props.lines[lineIndex].name &&
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
                                              axisError={
                                                props.systems[lineIndex]
                                                  .axisErrors[axisIndex]
                                              }
                                              axisInfo={
                                                props.systems[lineIndex]
                                                  .axisState[axisIndex]
                                              }
                                              carrier={
                                                props.systems[lineIndex]
                                                  .carrierState
                                                  ? props.systems[lineIndex]
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
                                                  lineIndex,
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
                                                  lineIndex,
                                                  axisDirection,
                                                  `${axisId}`,
                                                  carrierId,
                                                );
                                              }}
                                              onStopPull={() => {
                                                props.onStopPull?.(
                                                  lineIndex,
                                                  axisId,
                                                );
                                              }}
                                              onStopPush={() => {
                                                props.onStopPush?.(
                                                  lineIndex,
                                                  axisId,
                                                );
                                              }}
                                              onInitialize={(
                                                direction,
                                                carrierId,
                                                axisLink,
                                              ) => {
                                                props.onInitialize?.(
                                                  lineIndex,
                                                  axisId,
                                                  direction,
                                                  carrierId,
                                                  axisLink,
                                                );
                                              }}
                                              onDeinitialize={() => {
                                                props.onDeinitialize?.(
                                                  lineIndex,
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
