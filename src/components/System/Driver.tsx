import { useContext, createContext, JSX, Show } from "solid-js";
import { useLineContext } from "./Line.tsx";
import { Stack } from "styled-system/jsx";
import { For } from "solid-js/web";
import { Badge } from "../ui/badge.tsx";
import { Text } from "../ui/text.tsx";
import { Tooltip } from "../ui/tooltip.tsx";
//@ts-ignore Ignore git action
import { mmc } from "../proto/mmc";

export const AxesContext = createContext<{
  id: string;
}>();

export const useAxesContext = () => {
  return useContext(AxesContext);
};

export type DriverProps = JSX.HTMLAttributes<HTMLDivElement> & {
  driverInfo: mmc.info.Response.System.Driver.IInfo[];
  driverError: mmc.info.Response.System.Driver.IError[];
};

export function Driver(props: DriverProps) {
  const lineCtx = useLineContext()!;
  if (!lineCtx) return;
  const driverId = crypto.randomUUID();

  const driverInfo = () => {
    return props.driverInfo[lineCtx.driverIndex];
  };
  const driverError = () => {
    return props.driverError[lineCtx.driverIndex];
  };

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
      <Tooltip.Root positioning={{ placement: "bottom-start" }}>
        <Tooltip.Trigger>
          <Badge
            background={
              findField(driverError()).length > 0
                ? "accent.customRed"
                : "bg.canvas"
            }
          >
            <Text fontWeight="bold">Driver {lineCtx.driverIndex + 1}</Text>
          </Badge>
        </Tooltip.Trigger>
        <Show
          when={
            findField(driverInfo()).length > 0 ||
            findField(driverError()).length > 0
          }
        >
          <Tooltip.Positioner>
            <Tooltip.Content width="100%" minWidth="10rem">
              <Show when={findField(driverInfo()).length > 0}>
                <Text> Info </Text>
                <For each={findField(driverInfo())}>
                  {(field) => {
                    return <Text fontWeight="medium">{field}</Text>;
                  }}
                </For>
              </Show>
              <Show when={findField(driverError()).length >= 1}>
                <Text
                  marginTop={
                    findField(driverInfo()).length > 0 ? "0.5rem" : "0"
                  }
                >
                  Error
                </Text>
                <For each={findField(driverError())}>
                  {(errorField) => {
                    return <Text fontWeight="medium">{errorField}</Text>;
                  }}
                </For>
              </Show>
            </Tooltip.Content>
          </Tooltip.Positioner>
        </Show>
      </Tooltip.Root>

      <Stack direction="row" gap="0.5rem" marginTop="0.5rem">
        <For
          each={Array.from(
            { length: 3 },
            (_, i) => lineCtx.driverIndex * 3 + i,
          )}
        >
          {(axisIndex) => {
            const axisId = axisIndex + 1;
            return (
              <AxesContext.Provider
                value={{
                  id: `${driverId}:${axisId}`,
                }}
              >
                {props.children}
              </AxesContext.Provider>
            );
          }}
        </For>
      </Stack>
    </div>
  );
}
