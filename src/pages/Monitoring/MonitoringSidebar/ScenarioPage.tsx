import {
  createEffect,
  createMemo,
  createSignal,
  For,
  JSX,
  on,
  Show,
} from "solid-js";
import * as Tabs from "~/components/ui/tabs.tsx";
import { Text } from "~/components/ui/text";
import { createDraggable } from "@neodrag/solid";
import { createStore } from "solid-js/store";
import {
  Request_Direction,
  type Request as CommandRequest,
} from "~/proto/mmc/command_pb";
import { Input } from "~/components/ui/input";
import { IconButton } from "~/components/ui/icon-button";
import { IconX } from "@tabler/icons-solidjs";
import { css } from "styled-system/css";
import { Button } from "~/components/ui/button";
import { MmcCommandWebsocket } from "~/services/MmcCommandWebsocket";
import { Response_Line_Carrier_State_State } from "~/proto/mmc/info_pb";
import { Control } from "~/proto/mmc/control_pb";

const mmcCommandField = [
  "initialize",
  "deinitialize",
  "move",
  "push",
  "pull",
] as const;
type SettingField = (typeof mmcCommandField)[number];

type WaitCommand = {
  case: "wait";
  value: { carrierState: Response_Line_Carrier_State_State };
};
type MmcCommand = { case: "mmcCommand"; value: { command: CommandRequest } };
type ScenarioCommand = MmcCommand | WaitCommand;

export function ScenarioPage(props: { commandWebsocket: MmcCommandWebsocket }) {
  const scenarioDropDivId = "scenario_drop_space";
  const [scenarioCommands, setScenarioCommands] = createStore<
    ScenarioCommand[]
  >([]);
  const [scenarioVeloctiy, setScenarioVelocity] = createSignal<number>(1200);
  const [scenarioAcceleration, setScenarioAcceleration] =
    createSignal<number>(7800);

  const commandRequestValue = (field: SettingField): CommandRequest | null => {
    if (field == "initialize") {
      const newRequest: CommandRequest = {
        $typeName: "mmc.command.Request",
        body: {
          case: "initialize",
          value: {
            $typeName: "mmc.command.Request.Initialize",
            line: 0,
            axis: 0,
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
            line: 0,
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
            line: 0,
            axis: 0,
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
            line: 0,
            axis: 0,
            carrier: 0,
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
            line: 0,
            carrier: 0,
            acceleration: scenarioAcceleration(),
            velocity: scenarioVeloctiy(),
            target: {
              case: "axis",
              value: 1,
            },
            control: Control.POSITION,
            disableCas: false,
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
  const tabList = ["Move", "Wait"];

  return (
    <div style={{ width: "100%", height: "100%", display: "flex" }}>
      <Tabs.Root
        orientation="vertical"
        variant={"subtle"}
        style={{ height: "100%", width: "30%" }}
      >
        <Tabs.List>
          <For each={tabList}>
            {(trigger) => {
              return <Tabs.Trigger value={trigger}> {trigger}</Tabs.Trigger>;
            }}
          </For>
        </Tabs.List>

        <Show when={tabRender()} fallback={<></>}>
          <Tabs.Content value={tabList[0]} userSelect="none">
            <div>
              <For each={mmcCommandField}>
                {(field) => {
                  return (
                    <div
                      class={css({
                        padding: "0.5rem",
                        borderWidth: "1px",
                        zIndex: 100,
                        position: "relative",
                        background: "gray.1",
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
                      <Text style={{ "user-select": "none" }}>{field}</Text>
                    </div>
                  );
                }}
              </For>
            </div>
          </Tabs.Content>
          <Tabs.Content value={tabList[1]}>
            <div></div>
          </Tabs.Content>
        </Show>
      </Tabs.Root>
      <div
        id={scenarioDropDivId}
        style={{
          "border-width": "1px",
          width: "70%",
          height: "100%",
          display: "flex",
          "align-items": "center",
          "flex-direction": "column",
          "overflow-y": "scroll",
        }}
      >
        <For each={scenarioCommands}>
          {(scenarioCommand, index) => {
            if (scenarioCommand.case === "mmcCommand")
              return (
                <Show when={commandRender()}>
                  <ScenarioCommand
                    command={scenarioCommand.value.command}
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
              for await (const command of scenarioCommands) {
                if (command.case === "mmcCommand") {
                  try {
                    await props.commandWebsocket.runCommand(
                      command.value.command,
                    );
                  } catch (err) {
                    console.error(err);
                    break;
                  }
                }
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

function ScenarioCommand(
  props: JSX.HTMLAttributes<HTMLDivElement> & {
    command: CommandRequest;
    onCommandDelete?: () => void;
    onDragStart?: () => void;
    onCommandDrag?: (clientX: number | null, clientY: number | null) => void;
    onDragEnd?: () => void;
    isCommandDragging?: boolean;
    dragPosition?: { clientX: number; clientY: number };
    onDragEnter?: () => void;
    onDragLeave?: () => void;
  },
) {
  //@ts-ignore This draggable is needed to use neo-drag.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { draggable: dragOptions } = createDraggable();
  const itemPadding = "1rem";
  const [showOverlay, setShowOverlay] = createSignal<boolean>(false);
  const [dragStarted, setDragStarted] = createSignal<boolean>(false);
  let commandRef: HTMLDivElement | undefined;
  const [obj, setObj] = createStore<CommandRequest>(props.command);

  createEffect(
    on(
      () => props.dragPosition,
      () => {
        if (dragStarted()) return;
        if (!props.dragPosition) {
          setShowOverlay(false);
          return;
        }
        if (!commandRef) return;

        const clientX = props.dragPosition.clientX;
        const clientY = props.dragPosition.clientY;

        const clientRect = commandRef.getBoundingClientRect();
        const top = clientRect.top;
        const bottom = clientRect.bottom;
        const left = clientRect.left;
        const right = clientRect.right;

        if (left < clientX && clientX < right) {
          if (top < clientY && clientY < bottom) {
            setShowOverlay(true);
            return;
          }
        }
        setShowOverlay(false);
      },
    ),
  );

  createMemo(() => {
    const dragEnter = showOverlay();
    if (dragEnter) {
      props.onDragEnter?.();
    } else {
      props.onDragLeave?.();
    }
  });

  return (
    <div
      ref={commandRef}
      class={css({
        display: "flex",
        width: "30rem",
        borderWidth: "1px",
        padding: `${itemPadding}`,
        alignItems: "center",
        background: "gray.1",
        zIndex: dragStarted() ? 10 : 1,
      })}
      use:dragOptions={{
        onDragStart: () => {
          setDragStarted(true);
          props.onDragStart?.();
        },
        onDrag: (e) => {
          props.onCommandDrag?.(e.event.clientX, e.event.clientY);
        },
        onDragEnd: () => {
          props.onDragEnd?.();
          setDragStarted(false);
          props.onCommandDrag?.(null, null);
        },
      }}
    >
      <Text fontWeight="bold" marginRight={"0.5rem"}>
        {obj.body.case}
      </Text>
      <Show when={obj.body.value}>
        <For
          each={Object.keys(obj.body.value!).filter(
            (key) => key !== "$typeName",
          )}
        >
          {(key) => {
            return (
              <ScenarioValue
                key={key}
                value={obj.body.value![key as keyof typeof obj.body.value]}
                onValueChange={(value) =>
                  setObj(
                    "body",
                    "value",
                    key as keyof typeof obj.body.value,
                    //@ts-ignore type is checked
                    value,
                  )
                }
              />
            );
          }}
        </For>
      </Show>
      <IconButton
        position="absolute"
        right={itemPadding}
        onClick={() => props.onCommandDelete?.()}
      >
        <IconX />
      </IconButton>
      <div
        id={"overlay"}
        class={css({
          position: "absolute",
          top: "0",
          left: "0",
          width: "100%",
          height: "100%",
          background: "gray.9",
          opacity: showOverlay() ? 0.5 : 0,
          pointerEvents: "none",
          transition: "opacity ease-in-out 0.2s",
        })}
      />
    </div>
  );
}

function ScenarioValue(props: {
  key: string;
  value: string | number | object;
  onValueChange?: (value: string | number | object) => void;
}) {
  const key = props.key;
  const value = props.value;
  if (typeof value === "string" || typeof value === "number") {
    return (
      <div style={{ display: "flex", "align-items": "center" }}>
        <Text>{key}</Text>
        <Input
          width="2rem"
          value={value}
          onChange={(e) => {
            const newValue =
              typeof value === "string"
                ? e.target.value
                : Number(e.target.value);
            props.onValueChange?.(newValue);
          }}
        />
      </div>
    );
  } else {
    const [obj, setObj] = createStore(value);
    return (
      <For each={Object.keys(obj).filter((key) => key !== "$typeName")}>
        {(key) => {
          return (
            <ScenarioValue
              key={key}
              value={obj[key as keyof typeof obj]}
              onValueChange={(value) => {
                setObj(
                  key as keyof typeof obj,
                  //@ts-ignore
                  value,
                );
              }}
            />
          );
        }}
      </For>
    );
  }
}
