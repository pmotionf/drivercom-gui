import { useContext, createContext, JSX, Show } from "solid-js";
import { For } from "solid-js/web";
import { Badge } from "~/components/ui/badge.tsx";
import { Text } from "~/components/ui/text.tsx";
import { Tooltip } from "~/components/ui/tooltip.tsx";
import {
  Response_Line_Driver_Error,
  Response_Line_Driver_State,
} from "~/proto/mmc/info_pb";
import { Stack } from "styled-system/jsx/stack";
import {
  IconAlertTriangle,
  IconPlayerPauseFilled,
} from "@tabler/icons-solidjs";
import { css } from "styled-system/css/css";

export const AxesContext = createContext<{
  id: string;
}>();

export const useAxesContext = () => {
  return useContext(AxesContext);
};

export type DriverProps = JSX.HTMLAttributes<HTMLDivElement> & {
  id: string;
  driverInfo: Response_Line_Driver_State;
  driverError: Response_Line_Driver_Error;
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
      <div
        style={{
          display: "flex",
        }}
      >
        <Tooltip
          content={
            <Show when={findField(props.driverInfo).length > 0}>
              <Text> Info </Text>
              <For each={findField(props.driverInfo)}>
                {(field) => {
                  return <Text fontWeight="medium">{field}</Text>;
                }}
              </For>
            </Show>
          }
          positioning={{ placement: "bottom-start" }}
        >
          <Badge
            background={
              props.driverInfo.connected ? "accent.customGreen" : "bg.canvas"
            }
            paddingLeft={"0.4rem"}
            paddingRight={"0.4rem"}
            gap={"0.2rem"}
          >
            <Show when={props.driverInfo.paused}>
              <IconPlayerPauseFilled class={css({ color: "fg.default" })} />
            </Show>
            <Show when={props.driverInfo.stopped}>
              <IconAlertTriangle class={css({ color: "fg.default" })} />
            </Show>
            <Text fontWeight="bold">Driver {props.id}</Text>
          </Badge>
        </Tooltip>

        <Show when={findField(props.driverError).length > 0}>
          <Tooltip
            content={
              <>
                <Text>Error</Text>
                <For each={findField(props.driverError)}>
                  {(errorField) => {
                    return <Text fontWeight="medium">{errorField}</Text>;
                  }}
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
                "margin-left": "0.5em",
              }}
            />
          </Tooltip>
        </Show>
      </div>
      {props.children}
    </div>
  );
}
