import { useContext, createContext, JSX, Show } from "solid-js";
import { useLineContext } from "./Line.tsx";
import { Stack } from "styled-system/jsx";
import { For } from "solid-js/web";
import { Badge } from "../ui/badge.tsx";
import { Text } from "../ui/text.tsx";
import { Tooltip } from "../ui/tooltip.tsx";
import { mmc } from "../proto/mmc";

export const AxesContext = createContext<{
  id: string;
}>();

export const useAxesContext = () => {
  return useContext(AxesContext);
};

export type StationProps = JSX.HTMLAttributes<HTMLDivElement> & {
  driverInfo: mmc.info.Response.System.Driver.IInfo[];
  driverError: mmc.info.Response.System.Driver.IError[];
};

export function Station(props: StationProps) {
  const lineCtx = useLineContext()!;
  if (!lineCtx) return;
  const stationId = crypto.randomUUID();

  const driverInfo = () => {
    return props.driverInfo[lineCtx.stationIndex];
  };
  const driverError = () => {
    return props.driverError[lineCtx.stationIndex];
  };

  return (
    <div
      id={stationId}
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
              Object.keys(driverError()).length > 1 ? "red" : "bg.canvas"
            }
            color={
              Object.keys(driverError()).length > 1 ? "#ffffff" : "fg.default"
            }
          >
            <Text fontWeight="bold">Driver {lineCtx.stationIndex + 1}</Text>
          </Badge>
        </Tooltip.Trigger>
        <Tooltip.Positioner>
          <Tooltip.Content width="100%">
            <Show when={Object.keys(driverInfo()).length > 1}>
              <Text> Info </Text>
              <For each={Object.entries(driverInfo())}>
                {([key, value]) => {
                  if (key !== "id")
                    return (
                      <div style={{ display: "flex", width: "100%" }}>
                        <Text fontWeight="medium" width="70%">
                          {key}
                        </Text>
                        <Text fontWeight="medium" width="30%">
                          {value ? "true" : "false"}
                        </Text>
                      </div>
                    );
                }}
              </For>
            </Show>
            <Show when={Object.keys(driverError()).length > 1}>
              <Text marginTop="0.5rem"> Error </Text>
              <For each={Object.entries(driverError())}>
                {([key, value]) => {
                  if (key !== "id" && value)
                    return (
                      <div
                        style={{
                          display: "flex",
                          width: "100%",
                        }}
                      >
                        <Text
                          fontWeight="medium"
                          style={{
                            "text-overflow": "hidden",
                            "white-space": "nowrap",
                            overflow: "hidden",
                          }}
                        >
                          {typeof value === "boolean"
                            ? key
                            : `${key}: ${Object.entries(value)
                                .filter((entry) => entry[1] === true)
                                .map(([key]) => key)}`}
                        </Text>
                      </div>
                    );
                }}
              </For>
            </Show>
          </Tooltip.Content>
        </Tooltip.Positioner>
      </Tooltip.Root>

      <Stack direction="row" gap="0.5rem" marginTop="0.5rem">
        <For
          each={Array.from(
            { length: 3 },
            (_, i) => lineCtx.stationIndex * 3 + i,
          )}
        >
          {(axisIndex) => {
            const axisId = axisIndex + 1;
            return (
              <AxesContext.Provider
                value={{
                  id: `${stationId}:${axisId}`,
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
