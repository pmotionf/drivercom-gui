import { JSX, useContext, createContext } from "solid-js";
import { For, Show } from "solid-js/web";
import { Accordion } from "../ui/accordion.tsx";
import { ChevronDownIcon } from "lucide-solid";
import { Stack } from "styled-system/jsx/stack";
import { Text } from "../ui/text.tsx";
import { Tooltip } from "../ui/tooltip.tsx";
import { TrackType, LineType } from "~/pages/Monitoring/ServerHandler.ts";
import {
  Response_Track_Axis_Error,
  Response_Track_Driver_Error,
} from "../proto/mmc/info_pb.ts";
import {
  LineControlButton,
  LineCommandParameters,
} from "./LineControlButton.tsx";
import { SendingCommand } from "./System.tsx";

export type LineProps = JSX.HTMLAttributes<HTMLDivElement> & {
  line: LineType;
  system?: TrackType;
  disableCommandButton: boolean;
  disableCalibrateButton: boolean;
  disableSetZeroButton: boolean;
  sendingCommand: SendingCommand;
  onLineCommands?: (save: LineCommandParameters) => void;
};

export const LineContext = createContext<{
  driverIndex: number;
}>();

export function useLineContext() {
  const context = useContext(LineContext);
  return context;
}

export function Line(props: LineProps) {
  const findErrorField = (error: object): string[] => {
    const entry = Object.entries(error);
    const errorFields: string[] = [];
    entry.forEach(([fieldName, value]) => {
      if (typeof value === "boolean") {
        if (value === true) {
          errorFields.push(
            fieldName[0].toUpperCase() + fieldName.slice(1, fieldName.length),
          );
        }
      } else if (typeof value === "object") {
        const msg = findErrorField(value);
        if (msg.length > 0) {
          errorFields.push(
            `${fieldName[0].toUpperCase() + fieldName.slice(1, fieldName.length)}: ${msg.toString()}`,
          );
        }
      }
    });
    return errorFields;
  };

  const showErrorStatus = (
    axisErrors: Response_Track_Axis_Error[],
    driverError: Response_Track_Driver_Error[],
  ): { field: string; error: string[] }[] => {
    const errorStates: { field: string; error: string[] }[] = [];
    driverError.forEach((error) => {
      const errorMessage = findErrorField(error);
      if (errorMessage.length > 0) {
        errorStates.push({ field: `Driver ${error.id}`, error: errorMessage });
      }
    });
    axisErrors.forEach((error) => {
      const errMsg = findErrorField(error);
      if (errMsg.length > 0) {
        errorStates.push({ field: `Axis ${error.id}`, error: errMsg });
      }
    });
    return errorStates;
  };

  const disableBtn = () => props.disableCommandButton;
  const isSendingCommand = () => props.sendingCommand;
  const disableCalibrateButton = () => props.disableCalibrateButton;
  const disableSetZeroButton = () => props.disableSetZeroButton;

  return (
    <Accordion.Item
      value={props.line.name!}
      backgroundColor="bg.canvas"
      borderBottomWidth="1px"
    >
      <Accordion.ItemTrigger
        padding="0.6rem"
        paddingLeft="1rem"
        paddingRight="1rem"
        justifyContent="left"
      >
        <Accordion.ItemIndicator class="cancel">
          <ChevronDownIcon />
        </Accordion.ItemIndicator>
        <Tooltip.Root positioning={{ placement: "bottom-start" }}>
          <Tooltip.Trigger width="min-content">
            <Text>{props.line.name}</Text>
          </Tooltip.Trigger>
          <Tooltip.Positioner>
            <Tooltip.Content width="100%" minWidth={"15em"}>
              <For
                each={Object.entries(props.line).filter(
                  (entry) => entry[0] !== "name" && entry[0] !== "id",
                )}
              >
                {([key, value]) => {
                  return (
                    <div
                      style={{
                        width: `100%`,
                        display: "flex",
                      }}
                    >
                      <Text width="60%">
                        {Array.from(key)
                          .map((char, i) => {
                            if (i === 0) {
                              return char.toUpperCase();
                            }
                            if (/^[A-Z]*$/.test(char)) {
                              return `_${char}`;
                            }
                            return char;
                          })
                          .join("")
                          .replaceAll("_", " ")}
                      </Text>
                      <Text
                        width="40%"
                        fontWeight={"medium"}
                        style={{
                          overflow: "hidden",
                          "white-space": "nowrap",
                          display: "block",
                          "text-overflow": "ellipsis",
                        }}
                      >
                        {typeof value === "number" && !Number.isInteger(value)
                          ? `${Number(value.toFixed(5))}m`
                          : value}
                      </Text>
                    </div>
                  );
                }}
              </For>
            </Tooltip.Content>
          </Tooltip.Positioner>
        </Tooltip.Root>

        <Show
          when={
            (props.system &&
              props.system.axisErrors &&
              findErrorField(props.system.axisErrors).length > 0) ||
            (props.system &&
              props.system.driverErrors &&
              findErrorField(props.system.driverErrors).length > 0)
          }
        >
          <Tooltip.Root positioning={{ placement: "bottom-start" }}>
            <Tooltip.Trigger
              style={{ width: "min-content", "text-align": "left" }}
            >
              <Stack
                backgroundColor="red.9"
                style={{
                  width: "0.5rem",
                  height: "0.5rem",
                  "border-radius": "1rem",
                  "margin-top": "0.3rem",
                }}
              />
            </Tooltip.Trigger>
            <Tooltip.Positioner>
              <Tooltip.Content>
                <For
                  each={showErrorStatus(
                    props.system!.axisErrors!,
                    props.system!.driverErrors!,
                  )}
                >
                  {(error) => (
                    <Stack direction="row" width="100%" minWidth={"16em"}>
                      <Text overflow="hidden" width="30%">
                        {error.field}
                      </Text>
                      <div style={{ width: "70%" }}>
                        <For each={error.error}>
                          {(err) => (
                            <Text width="100%" fontWeight={"medium"}>
                              {err}
                            </Text>
                          )}
                        </For>
                      </div>
                    </Stack>
                  )}
                </For>
              </Tooltip.Content>
            </Tooltip.Positioner>
          </Tooltip.Root>
        </Show>
        <LineControlButton
          lineName={props.line.name}
          disableCommandButton={disableBtn()}
          disableCalibrateButton={disableCalibrateButton()}
          disableSetZeroButton={disableSetZeroButton()}
          sendingCommand={isSendingCommand()}
          onLineCommand={(saveProps) => props.onLineCommands?.(saveProps)}
          variant={"ghost"}
          size="xs"
        />
      </Accordion.ItemTrigger>
      <Accordion.ItemContent
        padding="0.5rem"
        paddingLeft="1rem"
        paddingRight="1rem"
      >
        {props.children}
      </Accordion.ItemContent>
    </Accordion.Item>
  );
}
