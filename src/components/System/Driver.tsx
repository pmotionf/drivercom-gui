import { useContext, createContext, JSX, Show } from "solid-js";
import { For } from "solid-js/web";
import { Badge } from "../ui/badge.tsx";
import { Text } from "../ui/text.tsx";
import { Tooltip } from "../ui/tooltip.tsx";
import {
  Response_Track_Driver_Error,
  Response_Track_Driver_State,
} from "../proto/mmc/info_pb.ts";
import { Stack } from "styled-system/jsx/stack";

export const AxesContext = createContext<{
  id: string;
}>();

export const useAxesContext = () => {
  return useContext(AxesContext);
};

export type DriverProps = JSX.HTMLAttributes<HTMLDivElement> & {
  id: string;
  driverInfo: Response_Track_Driver_State;
  driverError: Response_Track_Driver_Error;
};

export function Driver(props: DriverProps) {
  const driverId = crypto.randomUUID();

  const findField = (driverError: object): string[] => {
    const entry = Object.entries(driverError);
    const errorField: string[] = [];
    entry.forEach(([key, value]) => {
      if (typeof value === "boolean") {
        if (value === true) {
          errorField.push(`${key[0].toUpperCase()}${key.slice(1, key.length)}`);
        }
      } else if (typeof value === "object") {
        const field = findField(value);
        if (field.length > 0) {
          errorField.push(
            `${key[0].toUpperCase()}${key.slice(1, key.length)}: ${field.toString()}`,
          );
        }
      }
    });
    return errorField;
  };

  return (
    <div
      id={driverId}
      style={{
        "border-width": "1px",
        "border-radius": "0.2rem",
        padding: "0.5rem",
      }}
    >
      <div style={{ display: "flex", "align-items": "center" }}>
        <Tooltip.Root positioning={{ placement: "bottom-start" }}>
          <Tooltip.Trigger>
            <Badge
              background={
                props.driverInfo.connected ? "accent.customGreen" : "bg.canvas"
              }
            >
              <Text fontWeight="bold">Driver {props.id}</Text>
            </Badge>
          </Tooltip.Trigger>
          <Show when={findField(props.driverInfo).length > 0}>
            <Tooltip.Positioner>
              <Tooltip.Content width="100%" minWidth="10rem">
                <Text> Info </Text>
                <For each={findField(props.driverInfo)}>
                  {(field) => {
                    return <Text fontWeight="medium">{field}</Text>;
                  }}
                </For>
              </Tooltip.Content>
            </Tooltip.Positioner>
          </Show>
        </Tooltip.Root>

        <Show when={findField(props.driverError).length > 0}>
          <Tooltip.Root positioning={{ placement: "bottom-start" }}>
            <Tooltip.Trigger>
              <Stack
                backgroundColor="red.9"
                style={{
                  width: "0.5rem",
                  height: "0.5rem",
                  "border-radius": "1rem",
                  "margin-left": "0.5em",
                }}
              />
            </Tooltip.Trigger>

            <Tooltip.Positioner>
              <Tooltip.Content width="100%" minWidth="10rem">
                <Text>Error</Text>
                <For each={findField(props.driverError)}>
                  {(errorField) => {
                    return <Text fontWeight="medium">{errorField}</Text>;
                  }}
                </For>
              </Tooltip.Content>
            </Tooltip.Positioner>
          </Tooltip.Root>
        </Show>
      </div>
      {props.children}
    </div>
  );
}
