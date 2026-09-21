import { createSignal, For, Show } from "solid-js";
import { Text } from "~/components/ui/text";
import { createDraggable } from "@neodrag/solid";
import { createStore } from "solid-js/store";
import {
  Request_Direction,
  type Request as CommandRequest,
} from "~/proto/mmc/command_pb";
import { Input } from "~/components/ui/input";
import { css } from "styled-system/css";
import { Button } from "~/components/ui/button";
import { MmcCommandWebsocket } from "~/services/MmcCommandWebsocket";
import { Response_Line_Carrier_State_State } from "~/proto/mmc/info_pb";
import { Control } from "~/proto/mmc/control_pb";
import { CarrierState } from "./CarrierPage";
import { LineConfig } from "../Monitoring";
import { ScenarioScriptBlock } from "./ScenarioPage/ScnarioScriptBlock";
import { prettierLabel } from "~/utils/PrettierLabel";

const mmcCommandField = [
  "initialize",
  "deinitialize",
  "move",
  "push",
  "pull",
] as const;
type MmcCommandField = (typeof mmcCommandField)[number];

const waitCommands = [
  Response_Line_Carrier_State_State.CARRIER_STATE_INITIALIZE_COMPLETED,
  Response_Line_Carrier_State_State.CARRIER_STATE_MOVE_COMPLETED,
];
//Type for scenario script wait command
export type WaitCommand = {
  case: "wait";
  value: {
    carrierState: Response_Line_Carrier_State_State;
    lineId: number;
    carrierId: number;
    timeout?: number;
  };
};
//Type for scenario script mmc command
type MmcCommand = { case: "mmcCommand"; value: { command: CommandRequest } };

//Type for scenario script every command
export type ScenarioCommand = MmcCommand | WaitCommand;

export function ScenarioPage(props: {
  commandWebsocket: MmcCommandWebsocket;
  lineConfig: LineConfig[];
  carrierStates: CarrierState[];
}) {
  const scenarioDropDivId = "scenario_drop_space";
  const [scenarioCommands, setScenarioCommands] = createStore<
    ScenarioCommand[]
  >([]);
  const [scenarioVeloctiy, setScenarioVelocity] = createSignal<number>(40);
  const [scenarioAcceleration, setScenarioAcceleration] =
    createSignal<number>(40);

  const commandRequestValue = (
    field: MmcCommandField,
  ): CommandRequest | null => {
    if (field == "initialize") {
      const newRequest: CommandRequest = {
        $typeName: "mmc.command.Request",
        body: {
          case: "initialize",
          value: {
            $typeName: "mmc.command.Request.Initialize",
            line: 1,
            axis: 1,
            carrier: 0,
            direction: Request_Direction.UNSPECIFIED,
          },
        },
      };
      return newRequest;
    }

    if (field == "deinitialize") {
      const newRequest: CommandRequest = {
        $typeName: "mmc.command.Request",
        body: {
          case: "deinitialize",
          value: {
            $typeName: "mmc.command.Request.Deinitialize",
            line: 1,
            target: {
              case: "axes",
              value: {
                start: 0,
                end: 0,
                $typeName: "root.Range",
              },
            },
          },
        },
      };
      return newRequest;
    }

    if (field === "pull") {
      const newRequest: CommandRequest = {
        $typeName: "mmc.command.Request",
        body: {
          case: "pull",
          value: {
            $typeName: "mmc.command.Request.Pull",
            line: 1,
            axis: 1,
            carrier: 0,
            direction: Request_Direction.FORWARD,
            acceleration: scenarioAcceleration(),
            velocity: scenarioVeloctiy(),
          },
        },
      };
      return newRequest;
    }

    if (field === "push") {
      const newRequest: CommandRequest = {
        $typeName: "mmc.command.Request",
        body: {
          case: "push",
          value: {
            $typeName: "mmc.command.Request.Push",
            line: 1,
            axis: 1,
            direction: Request_Direction.FORWARD,
            acceleration: scenarioAcceleration(),
            velocity: scenarioVeloctiy(),
          },
        },
      };
      return newRequest;
    }
    if (field === "move") {
      const newRequest: CommandRequest = {
        $typeName: "mmc.command.Request",
        body: {
          case: "move",
          value: {
            $typeName: "mmc.command.Request.Move",
            line: 1,
            carrier: 0,
            acceleration: scenarioAcceleration(),
            velocity: scenarioVeloctiy(),
            target: {
              case: "axis",
              value: 1,
            },
            control: Control.POSITION,
          },
        },
      };
      return newRequest;
    }
    return null;
  };

  const deleteScenarioCommand = (index: number) => {
    setScenarioCommands((prev) => prev.filter((_, i) => i !== index));
  };

  const [isDragging, setIsDragging] = createSignal<number | null>(null);
  const [isDragOver, setIsDragOver] = createSignal<number | null>(null);
  const [dragPosition, setDragPosition] = createSignal<{
    clientX: number;
    clientY: number;
  } | null>(null);

  const reorderCommand = (prevIndex: number, reorderedIndex: number) => {
    if (prevIndex === reorderedIndex) return;
    setScenarioCommands((prev) => {
      const draggedCommand = prev[prevIndex];
      const deleteDraggedCommand = prev.filter((_, i) => i !== prevIndex);
      const newCommand = [
        ...deleteDraggedCommand.slice(0, reorderedIndex),
        draggedCommand,
        ...deleteDraggedCommand.slice(reorderedIndex, prev.length),
      ];
      return newCommand;
    });
  };

  const [commandRender, setCommandRender] = createSignal<boolean>(true);
  const commandSpaceRefresh = () => {
    setCommandRender(false);
    setTimeout(() => {
      setCommandRender(true);
    });
  };

  //@ts-ignore This draggable is needed to use neo-drag.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { draggable: dragOptions } = createDraggable();
  const [tabRender, setTabRender] = createSignal<boolean>(true);
  const tabRefresh = () => {
    setTabRender(false);
    setTimeout(() => {
      setTabRender(true);
    });
  };

  const getCarrierInfo = (lineId: number, carrierId: number) => {
    if (lineId > props.carrierStates.length) return null;
    const findLine = props.carrierStates[lineId - 1];
    const findCarrier = findLine.carrierStates.find(
      (status) => status.id === carrierId,
    );
    return findCarrier ?? null;
  };

  const waitForCarrierState = async (
    commandValue: WaitCommand,
  ): Promise<boolean> => {
    const { lineId, carrierId, carrierState, timeout } = commandValue.value;
    const startTime = Date.now();
    let isSuccess = false;

    while (!isSuccess) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      const carrierInfo = getCarrierInfo(lineId, carrierId);
      if (!carrierInfo) {
        break;
      }
      if (timeout && timeout > 0 && Date.now() - startTime >= timeout) {
        break;
      }
      if (carrierInfo.state === carrierState) {
        isSuccess = true;
        break;
      } else {
        continue;
      }
    }
    return isSuccess;
  };

  const [currentRunningCommand, setCurrentRunningCommand] = createSignal<
    number | null
  >(null);

  const sideBarWidth = "13rem";

  return (
    <div
      style={{ width: "100%", height: `calc(100% - 2rem)`, display: "flex" }}
    >
      <div
        style={{
          display: "absolute",
          width: sideBarWidth,
          "max-width": sideBarWidth,
          height: "100%",
          "border-right-width":
            "1px" /*"overflow-y" : "auto", "overflow-x" :"hidden"*/,
        }}
      >
        <Show when={tabRender()} fallback={<></>}>
          {/* Code block on the left side only for mmc commands */}
          <For each={mmcCommandField}>
            {(field) => {
              return (
                <div
                  class={css({
                    padding: "0.5rem",
                    borderBottomWidth: "1px",
                    zIndex: 100,
                    position: "sticky",
                    background: "gray.1",
                    userSelect: "none",
                  })}
                  use:dragOptions={{
                    onDragStart: () => {
                      setIsDragging(scenarioCommands.length);
                    },
                    onDrag: (data) => {
                      // Update drag event whenver change for UI event.
                      const clientX = data.event.clientX;
                      const clientY = data.event.clientY;
                      setDragPosition({
                        clientX: clientX,
                        clientY: clientY,
                      });
                    },
                    onDragEnd: (data) => {
                      const clientX = data.event.clientX;
                      const clientY = data.event.clientY;

                      const dropDiv =
                        document.getElementById(scenarioDropDivId);
                      if (dropDiv) {
                        const getBound = dropDiv.getBoundingClientRect();
                        const divLeft = getBound.left;
                        const divTop = getBound.top;

                        if (clientX > divLeft && clientY > divTop) {
                          const newRequest = commandRequestValue(field);
                          if (newRequest !== null) {
                            if (typeof isDragOver() === "number") {
                              setScenarioCommands((prev) => {
                                const reorderIndex = isDragOver()!;
                                const parseCommand: MmcCommand = {
                                  case: "mmcCommand",
                                  value: { command: newRequest },
                                };
                                const newCommands = [
                                  ...prev.slice(0, reorderIndex),
                                  parseCommand,
                                  ...prev.slice(reorderIndex, prev.length),
                                ];
                                return newCommands;
                              });
                            } else {
                              setScenarioCommands(scenarioCommands.length, {
                                case: "mmcCommand",
                                value: { command: newRequest },
                              });
                            }
                          }
                        }
                      }
                      setDragPosition(null);
                      setIsDragging(null);
                      setIsDragOver(null);
                      tabRefresh();
                    },
                  }}
                >
                  <Text
                    style={{ "user-select": "none", "font-weight": "bold" }}
                  >
                    {prettierLabel(field)}
                  </Text>
                </div>
              );
            }}
          </For>
          <div>
            {/* Code block on the left side only for wait commands */}
            <For each={waitCommands}>
              {(wait) => {
                return (
                  <div
                    class={css({
                      padding: "0.5rem",
                      borderBottomWidth: "1px",
                      zIndex: 100,
                      position: "relative",
                      background: "gray.1",
                      userSelect: "none",
                    })}
                    use:dragOptions={{
                      onDragStart: () => {
                        setIsDragging(scenarioCommands.length);
                      },
                      onDrag: (data) => {
                        const clientX = data.event.clientX;
                        const clientY = data.event.clientY;
                        setDragPosition({
                          clientX: clientX,
                          clientY: clientY,
                        });
                      },
                      onDragEnd: (data) => {
                        const clientX = data.event.clientX;
                        const clientY = data.event.clientY;

                        const dropDiv =
                          document.getElementById(scenarioDropDivId);
                        if (dropDiv) {
                          const getBound = dropDiv.getBoundingClientRect();
                          const divLeft = getBound.left;
                          const divTop = getBound.top;

                          if (clientX > divLeft && clientY > divTop) {
                            const parseCommand: WaitCommand = {
                              case: "wait",
                              value: {
                                carrierState: wait,
                                carrierId: 0,
                                lineId: 0,
                              },
                            };
                            if (typeof isDragOver() === "number") {
                              setScenarioCommands((prev) => {
                                const reorderIndex = isDragOver()!;

                                const newCommands = [
                                  ...prev.slice(0, reorderIndex),
                                  parseCommand,
                                  ...prev.slice(reorderIndex, prev.length),
                                ];
                                return newCommands;
                              });
                            } else {
                              setScenarioCommands(
                                scenarioCommands.length,
                                parseCommand,
                              );
                            }
                          }
                        }
                        setDragPosition(null);
                        setIsDragging(null);
                        setIsDragOver(null);
                        tabRefresh();
                      },
                    }}
                  >
                    <Text
                      style={{ "user-select": "none", "font-weight": "bold" }}
                    >
                      {prettierLabel(
                        Response_Line_Carrier_State_State[wait].replace(
                          "CARRIER_STATE",
                          "WAIT",
                        ),
                      )}
                    </Text>
                  </div>
                );
              }}
            </For>
          </div>
        </Show>
      </div>
      {/* Draggable Scenario code block on the right side. */}
      <div
        id={scenarioDropDivId}
        style={{
          width: `calc(100% - ${sideBarWidth})`,
          height: "100%",
          display: "flex",
          "flex-direction": "column",
          "overflow-y": "scroll",
        }}
      >
        <For each={scenarioCommands}>
          {(scenarioCommand, index) => {
            return (
              <Show when={commandRender()}>
                <ScenarioScriptBlock
                  command={scenarioCommand}
                  lineConfig={props.lineConfig}
                  isRunning={
                    currentRunningCommand() &&
                    index() === currentRunningCommand()
                      ? true
                      : false
                  }
                  isCommandDragging={isDragging() ? true : false}
                  dragPosition={dragPosition() ?? undefined}
                  onCommandDrag={(clientX, clientY) => {
                    if (clientX && clientY) {
                      setDragPosition({ clientX: clientX, clientY: clientY });
                    } else {
                      setDragPosition(null);
                    }
                  }}
                  onCommandDelete={() => {
                    deleteScenarioCommand(index());
                  }}
                  onDragStart={() => {
                    setIsDragging(index());
                  }}
                  onDragEnd={() => {
                    if (
                      typeof isDragging() === "number" &&
                      typeof isDragOver() === "number"
                    ) {
                      reorderCommand(isDragging()!, isDragOver()!);
                      commandSpaceRefresh();
                    }
                    setIsDragging(null);
                  }}
                  onDragEnter={() => {
                    setIsDragOver(index());
                  }}
                  onDragLeave={() => {
                    setIsDragOver(null);
                  }}
                />
              </Show>
            );
          }}
        </For>
        <div
          style={{
            position: "absolute",
            display: "flex",
            top: "0",
            right: "0",
            "align-items": "center",
          }}
        >
          <Text>{"Velocity"}</Text>
          <Input
            value={scenarioVeloctiy()}
            onChange={(e) => setScenarioVelocity(Number(e.target.value))}
          />
          <Text>{"Acceleration"}</Text>
          <Input
            value={scenarioAcceleration()}
            onChange={(e) => setScenarioAcceleration(Number(e.target.value))}
          />
          <Button
            position="absolute"
            top="0"
            right="0"
            onClick={async () => {
              if (scenarioCommands.length < 1) return;
              for await (const [
                commandIndex,
                command,
              ] of scenarioCommands.entries()) {
                setCurrentRunningCommand(commandIndex);
                if (command.case === "mmcCommand") {
                  try {
                    await props.commandWebsocket.runCommand(
                      command.value.command,
                    );
                  } catch (err) {
                    console.error(err);
                    setCurrentRunningCommand(null);
                    break;
                  }
                } else if (command.case === "wait") {
                  try {
                    const result = await waitForCarrierState(command);
                    if (!result) {
                      setCurrentRunningCommand(null);
                      break;
                    }
                  } catch {
                    setCurrentRunningCommand(null);
                    break;
                  }
                }
                setCurrentRunningCommand(null);
              }
            }}
          >
            {"start"}
          </Button>
        </div>
      </div>
    </div>
  );
}
