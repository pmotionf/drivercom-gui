import { createMemo, createSignal, For, Show } from "solid-js";
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
import { ScenarioScriptBlock } from "./ScenarioPage/ScnarioScriptBlock";
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
    const { lineId, carrierId, carrierState, timeout } = commandValue.value;
    const startTime = Date.now();
    let isSuccess: boolean = false;

    while (!isSuccess) {
      await new Promise((resolve) => setTimeout(resolve, 1));
      const carrierInfo = getCarrierInfo(lineId, carrierId);
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

  createMemo(() => {
    if (startScenario()) {
      runScenarioCommand(scenarioCommands);
    }
  });

  const runScenarioCommand = async (scenarioCommands: ScenarioCommand[]) => {
    if (scenarioCommands.length < 1) return;
    for await (const [commandIndex, command] of scenarioCommands.entries()) {
      setCurrentRunningCommand(commandIndex);
      console.log(commandIndex);
      if (command.case === "mmcCommand") {
        try {
          await props.commandWebsocket.runCommand({
            $typeName: "mmc.Request",
            body: { case: "command", value: command.value.command },
          });
        } catch {
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
        } catch (e) {
          console.error(e);
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
  const [currentCommandDetails, setCurrentCommandDetails] = createSignal<
    number | null
  >(null);

  return (
    <div
      style={{
        width: "100%",
        height: `100%`,
        display: "grid",
        "grid-template-columns": `${sideBarWidth} minmax(0, 1fr) 20rem`,
        "grid-template-rows": `3rem minmax(0, 1fr)`,
      }}
    >
      <div
        style={{
          "grid-row": "2",
          "grid-column": "3",
          "border-width": "1px",
          padding: "0.2rem",
        }}
      >
        <Text>{"Details"}</Text>
        <Show when={typeof currentCommandDetails() === "number"}>
          {`${JSON.stringify(scenarioCommands[currentCommandDetails() ?? 0])}`}
        </Show>
      </div>
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
        <Text>{"Velocity"}</Text>
        <div
          class={css({
            height: "2rem",
            width: "4rem",
            padding: "0.2rem 0.5rem 0.2rem 0.5rem",
            background: "gray.2",
            outline: "none",
            borderRadius: "0.2rem",
            borderWidth: "1px",
            display: "flex",
            gap: "0",
          })}
        >
          <input
            maxlength={"3"}
            style={{ width: "2rem", height: "100%", outline: "none" }}
            value={scenarioVeloctiy()}
            onChange={(e) => setScenarioVelocity(Number(e.target.value))}
          />
          <Text color={"gray.10"}>{"%"}</Text>
        </div>

        <Text>{"Acceleration"}</Text>
        <div
          class={css({
            height: "2rem",
            width: "4rem",
            padding: "0.2rem 0.5rem 0.2rem 0.5rem",
            background: "gray.2",
            outline: "none",
            borderRadius: "0.2rem",
            borderWidth: "1px",
            display: "flex",
            gap: "0",
          })}
        >
          <input
            maxlength={"3"}
            style={{ width: "2rem", height: "100%", outline: "none" }}
            value={scenarioVeloctiy()}
            onChange={(e) => setScenarioAcceleration(Number(e.target.value))}
          />
          <Text color={"gray.10"}>{"%"}</Text>
        </div>
        <div style={{ "border-right-width": "1px", height: "2rem" }} />
        <Button
          size="xs"
          disabled={startScenario()}
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
          {"Start"}
        </Button>
        <Button
          size="xs"
          variant="outline"
          disabled={!startScenario()}
          onClick={() => {
            setStartScenario((prev) => !prev);
          }}
        >
          {"Stop"}
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
          width: "100%",
        }}
      >
        <For each={scenarioCommands}>
          {(scenarioCommand, index) => {
            return (
              <Show when={commandRender()}>
                <ScenarioScriptBlock
                  command={scenarioCommand}
                  lineConfig={props.lineConfig}
                  onClick={() => {
                    setCurrentCommandDetails(index());
                  }}
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
                    console.log("click");
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
