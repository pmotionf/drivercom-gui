import { JSX, useContext, createContext } from "solid-js";
import { For, Show } from "solid-js/web";
import * as Accordion from "~/components/ui/accordion.tsx";
import { ChevronDownIcon } from "lucide-solid";
import { Stack } from "styled-system/jsx/stack";
import { Text } from "~/components/ui/text.tsx";
import { Tooltip } from "~/components/ui/tooltip.tsx";

import {
  Response_Line_Axis_Error,
  Response_Line_Driver_Error,
} from "~/proto/mmc/info_pb.ts";
import {
  LineControlButton,
  LineCommandParameters,
} from "./LineControlButton.tsx";
import { SendingCommand } from "./System.tsx";
import { Line as LineType, LineConfig } from "../Monitoring.tsx";

export type LineProps = JSX.HTMLAttributes<HTMLDivElement> & {
  line: LineConfig;
  system?: LineType;
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
    axisErrors: Response_Line_Axis_Error[],
    driverError: Response_Line_Driver_Error[],
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

  const isSendingCommand = () => props.sendingCommand;
  const disableCalibrateButton = () => props.disableCalibrateButton;
  const disableSetZeroButton = () => props.disableSetZeroButton;

  return (
    <Accordion.Item value={props.line.name!} borderBottomWidth="1px">
      <Accordion.ItemTrigger
        padding="0.6rem"
        paddingLeft="1rem"
        paddingRight="1rem"
        justifyContent="left"
      >
        <Accordion.ItemIndicator class="cancel">
          <ChevronDownIcon />
        </Accordion.ItemIndicator>
        <Tooltip
          content={
            <>
              <For
                each={Object.entries(props.line).filter(
                  (entry) => entry[0] !== "name" && entry[0] !== "id",
                )}
              >
                {([key, value]) => {
                  if (typeof value === "number" || typeof value === "string")
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
                          {value}
                        </Text>
                      </div>
                    );
                }}
              </For>
            </>
          }
          positioning={{ placement: "bottom-start" }}
        >
          <Text>{props.line.name}</Text>
        </Tooltip>

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
          <Tooltip
            content={
              <>
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
              </>
            }
            positioning={{ placement: "bottom-start" }}
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
          </Tooltip>
        </Show>
        <LineControlButton
          lineName={props.line.name}
          acceleration={props.line.acceleration}
          speed={props.line.speed}
          disableCalibrateButton={disableCalibrateButton()}
          disableSetZeroButton={disableSetZeroButton()}
          sendingCommand={isSendingCommand()}
          onLineCommand={(saveProps) => props.onLineCommands?.(saveProps)}
          variant={"plain"}
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
