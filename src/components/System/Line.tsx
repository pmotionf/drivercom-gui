import { JSX } from "solid-js";
import { For } from "solid-js/web";
import { Accordion } from "../ui/accordion.tsx";
import { ChevronDownIcon } from "lucide-solid";
import { createContext } from "solid-js";
import { Stack } from "styled-system/jsx/stack";
import { Show } from "solid-js/web";
//@ts-ignore Ignore test in git action
import { mmc } from "../proto/mmc";

export type LineProps = JSX.HTMLAttributes<HTMLDivElement> & {
  value: mmc.core.Response.LineConfig.ILine;
  system?: mmc.info.Response.ISystem;
};

export const LineContext = createContext<{
  id: number;
  axes: mmc.info.Response.System.Axis.IInfo[];
  axesErrors: mmc.info.Response.System.Axis.IError[];
  carrierInfo?: mmc.info.Response.System.Carrier.IInfo[];
  driver?: mmc.info.Response.System.Driver.IInfo;
  driverError?: mmc.info.Response.System.Driver.IError;
}>();

export function Line(props: LineProps) {
  return (
    <Accordion.Item
      value={props.value.name!}
      backgroundColor="bg.canvas"
      borderBottomWidth="1px"
    >
      <Accordion.ItemTrigger
        padding="0.6rem"
        paddingLeft="1rem"
        paddingRight="1rem"
      >
        {props.value.name}
        <Accordion.ItemIndicator class="cancel">
          <ChevronDownIcon />
        </Accordion.ItemIndicator>
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
          <Show when={props.system && props.system.axisInfos}>
            <For
              each={Array.from({ length: props.value.axes! / 3 }, (_, i) =>
                props.system!.axisInfos!.slice(i * 3, i * 3 + 3),
              )}
            >
              {(axis, index) => {
                const axisError = props.system!.axisErrors!.slice(
                  index() * 3,
                  index() * 3 + 3,
                );
                return (
                  <LineContext.Provider
                    value={{
                      id: index(),
                      axes: axis,
                      axesErrors: axisError,
                      carrierInfo: props.system!.carrierInfos!,
                      driver: props.system!.driverInfos![index()],
                      driverError: props.system!.driverErrors![index()],
                    }}
                  >
                    {props.children}
                  </LineContext.Provider>
                );
              }}
            </For>
          </Show>
        </Stack>
      </Accordion.ItemContent>
    </Accordion.Item>
  );
}
