import { createEffect, createSignal, For, on, Show } from "solid-js";
import { Text } from "~/components/ui/text";
import { createDraggable } from "@neodrag/solid";
import { createStore } from "solid-js/store";
import {
  Request_Direction,
  type Request as CommandRequest,
} from "~/proto/mmc/command_pb";
import { toaster } from "~/components/ui/toast.tsx";
import { css } from "styled-system/css";
import { Button } from "~/components/ui/button";
import { MmcCommandWebsocket } from "~/services/MmcCommandWebsocket";
import { Response_Line_Carrier_State_State } from "~/proto/mmc/info_pb";
import { Control } from "~/proto/mmc/control_pb";
import { CarrierState } from "./CarrierPage";
import { LineConfig } from "../Monitoring";
import { ScenarioScriptBlock } from "./ScenarioPage/ScenarioScriptBlock";
import { ScriptList } from "./ScenarioPage/ScriptList";

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
    line: number;
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

  const commandRequestValue = (
    field: MmcCommandField,
  ): CommandRequest | null => {
    const lineIndex = 0;
    const lineId = lineIndex + 1;

    if (field == "initialize") {
      const newRequest: CommandRequest = {
        $typeName: "mmc.command.Request",
        body: {
          case: "initialize",
          value: {
            $typeName: "mmc.command.Request.Initialize",
            line: lineId,
            axis: 1,
            carrier: 0,
            direction: Request_Direction.FORWARD,
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
            line: lineId,
            target: {
              case: "axes",
              value: {
                start: 1,
                end: 1,
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
            line: lineId,
            axis: 1,
            carrier: 0,
            direction: Request_Direction.FORWARD,
            acceleration: props.lineConfig[lineIndex].acceleration,
            velocity: props.lineConfig[lineIndex].speed,
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
            line: lineId,
            axis: 1,
            direction: Request_Direction.FORWARD,
            acceleration: props.lineConfig[lineIndex].acceleration,
            velocity: props.lineConfig[lineIndex].speed,
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
            line: lineId,
            carrier: 0,
            acceleration: props.lineConfig[lineIndex].acceleration,
            velocity: props.lineConfig[lineIndex].speed,
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

  const getCarrierInfo = (lineId: number, carrierId: number) => {
    if (lineId > props.carrierStates.length) return null;
    const findLine = props.carrierStates[lineId - 1];
    const findCarrier = findLine.carrierStates.filter(
      (status) => status.id === carrierId,
    );
    return findCarrier[0] ?? null;
  };

  const waitForCarrierState = async (
    commandValue: WaitCommand,
  ): Promise<boolean> => {
    const { line, carrierId, carrierState, timeout } = commandValue.value;
    const startTime = Date.now();
    let isSuccess: boolean = false;

    while (!isSuccess) {
      await new Promise((resolve) => setTimeout(resolve, 1));
      const carrierInfo = getCarrierInfo(line, carrierId);
      if (!startScenario()) {
        break;
      }
      if (!carrierInfo) {
        break;
      }
      if (timeout && Date.now() - startTime >= timeout) {
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

  const [startScenario, setStartScenario] = createSignal<boolean>(false);

  createEffect(
    on(
      () => startScenario(),
      () => {
        if (startScenario()) {
          runScenarioCommand(scenarioCommands);
        }
      },
      { defer: true },
    ),
  );

  const runScenarioCommand = async (scenarioCommands: ScenarioCommand[]) => {
    if (scenarioCommands.length < 1) return;
    for await (const [commandIndex, command] of scenarioCommands.entries()) {
      setCurrentRunningCommand(commandIndex);
      if (command.case === "mmcCommand") {
        try {
          await props.commandWebsocket.runCommand({
            $typeName: "mmc.Request",
            body: { case: "command", value: command.value.command },
          });
        } catch (e) {
          setCurrentRunningCommand(null);
          setStartScenario(false);
          toaster.create({ title: "Scenario Error", description: e as string });
          break;
        }
      } else if (command.case === "wait") {
        if (command.value.carrierId === 0) {
          setStartScenario(false);
          toaster.create({
            title: "Scenario Error",
            description: "Carrier ID must be bigger then 0.",
          });
          break;
        }
        try {
          const result = await waitForCarrierState(command);
          if (!result) {
            setCurrentRunningCommand(null);
            break;
          }
        } catch (e) {
          setStartScenario(false);
          toaster.create({ title: "Scenario Error", description: e as string });
          setCurrentRunningCommand(null);
          break;
        }
      }
      setCurrentRunningCommand(null);
      if (!startScenario()) {
        break;
      }
    }
    if (startScenario()) {
      return await runScenarioCommand(scenarioCommands);
    }
    return;
  };

  const [currentRunningCommand, setCurrentRunningCommand] = createSignal<
    number | null
  >(null);

  const sideBarWidth = "13rem";

  return (
    <div
      style={{
        width: "100%",
        height: `100%`,
        display: "grid",
        "grid-template-columns": `${sideBarWidth} minmax(0, 1fr)`,
        "grid-template-rows": `3rem minmax(0, 1fr)`,
      }}
    >
      <div
        class={css({
          background: "gray.1",
        })}
        style={{
          "grid-row": "1",
          "grid-column": "1 / span 3",
          "border-bottom-width": "1px",
          display: "flex",
          "align-items": "center",
          gap: "0.5rem",
          padding: "0.5rem",
        }}
      >
        <Button
          size="xs"
          variant={!startScenario() ? "solid" : "outline"}
          onClick={() => {
            if (scenarioCommands.length <= 0) {
              toaster.create({
                title: "No Scenario Commands",
                description: "The Scenario command is empty.",
              });
              return;
            }
            setStartScenario((prev) => !prev);
          }}
        >
          {!startScenario() ? "Start" : "Stop"}
        </Button>
      </div>

      {/* Draggable Scenario code blocks */}
      <div
        id={scenarioDropDivId}
        style={{
          height: "100%",
          display: "flex",
          "flex-direction": "column",
          "overflow-y": "scroll",
          "grid-row": "2",
          "grid-column": "2",
          "border-right-width": "1px",
          width: "100%",
        }}
      >
        <For each={scenarioCommands}>
          {(scenarioCommand, index) => {
            return (
              <Show when={commandRender()}>
                <ScenarioScriptBlock
                  command={scenarioCommand}
                  commandIndex={index()}
                  lineConfig={props.lineConfig}
                  dragDisabled={startScenario()}
                  isRunning={
                    startScenario() && index() === currentRunningCommand()
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
                    }
                    commandSpaceRefresh();
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
      </div>

      <div
        class={css({ background: "gray.1" })}
        style={{
          display: "absolute",
          width: sideBarWidth,
          "max-width": sideBarWidth,
          height: "100%",
          "border-right-width": "1px",
          "grid-row": "2",
          "grid-column": "1",
          overflow: "auto",
          gap: "0",
        }}
      >
        <Text
          fontSize="xs"
          padding={"0.5rem 0.5rem 0.2rem 0.5rem"}
          fontWeight="bold"
          color="fg.muted"
        >
          {"Scripts"}
        </Text>
        <ScriptList
          commandsList={[...mmcCommandField]}
          dragDisabled={startScenario()}
          onDragStart={() => setIsDragging(scenarioCommands.length)}
          onDrag={(clientX, clientY) =>
            setDragPosition({
              clientX: clientX,
              clientY: clientY,
            })
          }
          onDragEnd={(clientX, clientY, field) => {
            const dropDiv = document.getElementById(scenarioDropDivId);
            if (dropDiv) {
              const getBound = dropDiv.getBoundingClientRect();
              const divLeft = getBound.left;
              const divTop = getBound.top;

              if (clientX > divLeft && clientY > divTop) {
                const newField = field as MmcCommandField;
                const newRequest = commandRequestValue(newField);
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
              setDragPosition(null);
              setIsDragging(null);
              setIsDragOver(null);
            }
          }}
        />
        <ScriptList
          commandsList={[
            ...waitCommands.map(
              (cmd) => Response_Line_Carrier_State_State[cmd],
            ),
          ]}
          dragDisabled={startScenario()}
          onDragStart={() => setIsDragging(scenarioCommands.length)}
          onDrag={(clientX, clientY) =>
            setDragPosition({
              clientX: clientX,
              clientY: clientY,
            })
          }
          onDragEnd={(clientX, clientY, field) => {
            const dropDiv = document.getElementById(scenarioDropDivId);
            if (dropDiv) {
              const getBound = dropDiv.getBoundingClientRect();
              const divLeft = getBound.left;
              const divTop = getBound.top;

              if (clientX > divLeft && clientY > divTop) {
                const parseCommand: WaitCommand = {
                  case: "wait",
                  value: {
                    carrierState:
                      Response_Line_Carrier_State_State[
                        field as keyof typeof Response_Line_Carrier_State_State
                      ],
                    carrierId: 0,
                    line: 1,
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
                  setScenarioCommands(scenarioCommands.length, parseCommand);
                }
              }
              setDragPosition(null);
              setIsDragging(null);
              setIsDragOver(null);
            }
          }}
        />
      </div>
    </div>
  );
}
