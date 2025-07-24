import { JSX } from "solid-js";
import { For } from "solid-js/web";
import { Accordion } from "../ui/accordion.tsx";
import { ChevronDownIcon } from "lucide-solid";
import { createContext } from "solid-js";
import { useContext } from "solid-js";
import { Stack } from "styled-system/jsx/stack";
import { Show } from "solid-js/web";
//@ts-ignore Ignore test in git action
import { mmc } from "../proto/mmc";

export type LineProps = JSX.HTMLAttributes<HTMLDivElement> & {
  value: LineConfig;
};

export const LineContext = createContext<{
  axes: mmc.info.Response.Axes.IAxis[];
  id: number;
  carrierInfo?: Map<number, mmc.info.Response.ICarrier>;
}>();

export const useLineContext = () => useContext(LineContext);

export type LineConfig = {
  line: mmc.core.Response.LineConfig.ILine;
  axisInfo?: mmc.info.Response.Axes.IAxis[];
  carrierInfo?: Map<number, mmc.info.Response.ICarrier>;
};

export function Line(props: LineProps) {
  return (
    <Accordion.Item
      value={props.value.line.name!}
      backgroundColor="bg.canvas"
      borderBottomWidth="1px"
    >
      <Accordion.ItemTrigger
        padding="0.6rem"
        paddingLeft="1rem"
        paddingRight="1rem"
      >
        {props.value.line.name}
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
          <Show when={props.value.axisInfo!}>
            <For
              each={Array.from({ length: props.value.line.axes! / 3 }, (_, i) =>
                props.value.axisInfo!.slice(i * 3, i * 3 + 3),
              )}
            >
              {(axis, index) => {
                return (
                  <LineContext.Provider
                    value={{
                      axes: axis,
                      id: index(),
                      carrierInfo: props.value.carrierInfo,
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
