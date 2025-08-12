import { JSX, useContext, createContext } from "solid-js";
import { For, Show } from "solid-js/web";
import { Accordion } from "../ui/accordion.tsx";
import { ChevronDownIcon } from "lucide-solid";
import { Stack } from "styled-system/jsx/stack";
//@ts-ignore Ignore test in git action
import { mmc } from "../proto/mmc";
import { Text } from "../ui/text.tsx";
import { Tooltip } from "../ui/tooltip.tsx";

export type LineProps = JSX.HTMLAttributes<HTMLDivElement> & {
  line: mmc.core.Response.LineConfig.ILine;
  system?: mmc.info.Response.ISystem;
};

export const LineContext = createContext<{
  stationIndex: number;
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
    axisErrors: mmc.info.Response.System.Axis.IError[],
    driverError: mmc.info.Response.System.Driver.IError[],
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
      >
        <Accordion.ItemIndicator class="cancel">
          <ChevronDownIcon />
        </Accordion.ItemIndicator>
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
          <div
            style={{
              width: "0.5rem",
              height: "0.5rem",
              "background-color": "red",
              "border-radius": "1rem",
            }}
          />
        </Show>
        <Tooltip.Root positioning={{ placement: "bottom-start" }}>
          <Tooltip.Trigger style={{ width: "100%", "text-align": "left" }}>
            <Text>{props.line.name}</Text>
          </Tooltip.Trigger>
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
            <Tooltip.Positioner>
              <Tooltip.Content>
                <For
                  each={showErrorStatus(
                    props.system!.axisErrors!,
                    props.system!.driverErrors!,
                  )}
                >
                  {(error) => (
                    <Stack direction="row" width="100%">
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
          </Show>
        </Tooltip.Root>
      </Accordion.ItemTrigger>
      <Accordion.ItemContent
        padding="0.5rem"
        paddingLeft="1rem"
        paddingRight="1rem"
      >
        <Stack
          width="100%"
          height="100%"
          direction="row"
          overflowX="auto"
          gap="1rem"
        >
          <For each={Array.from({ length: props.line.axes! / 3 }, (_, i) => i)}>
            {(stationIndex) => {
              return (
                <LineContext.Provider
                  value={{
                    stationIndex: stationIndex,
                  }}
                >
                  {props.children}
                </LineContext.Provider>
              );
            }}
          </For>
        </Stack>
      </Accordion.ItemContent>
    </Accordion.Item>
  );
}
