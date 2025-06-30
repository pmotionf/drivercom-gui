import { JSX } from "solid-js";
import { For } from "solid-js/web";
import { Accordion } from "../ui/accordion.tsx";
import { ChevronDownIcon } from "lucide-solid";
import { createContext } from "solid-js";
import { useContext } from "solid-js";
import { AxesInfo } from "./Axes.tsx";
import { Stack } from "styled-system/jsx/stack";
import { Show } from "solid-js/web";

export type LineProps = JSX.HTMLAttributes<HTMLDivElement> & {
  value: LineConfig;
};

export const LineContext = createContext<{ axes: AxesInfo[]; id: number }>();

export const useLineContext = () => useContext(LineContext);

export type LineConfig = {
  axes: number;
  name: string;
  axesInfo?: AxesInfo[];
};

export function Line(props: LineProps) {
  return (
    <Accordion.Item value={props.value.name}>
      <Accordion.ItemTrigger
        padding="0.6rem"
        paddingLeft="1rem"
        paddingRight="1rem"
      >
        {props.value.name}
        <Accordion.ItemIndicator>
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
          <Show when={props.value.axesInfo}>
            <For
              each={Array.from({ length: props.value.axes / 3 }, (_, i) =>
                props.value.axesInfo!.slice(i * 3, i * 3 + 3))}
            >
              {(axis, index) => {
                return (
                  <LineContext.Provider value={{ axes: axis, id: index() }}>
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
