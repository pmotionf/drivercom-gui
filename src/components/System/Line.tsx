import { JSX } from "solid-js";
import { For } from "solid-js/web";
import { Accordion } from "../ui/accordion.tsx";
import { ChevronDownIcon } from "lucide-solid";
import { createContext } from "solid-js";
import { createEffect } from "solid-js";
import { createStore } from "solid-js/store";
import { useContext } from "solid-js";
import { AxesInfo } from "./Axes.tsx";
import { Stack } from "styled-system/jsx/stack";

export type LineProps = JSX.HTMLAttributes<HTMLDivElement> & {
  value: LineConfig;
  id: string;
};

export const LineContext = createContext<AxesInfo[]>();

export const useLineContext = () => useContext(LineContext);

export type LineConfig = {
  axes: number;
  name: string;
  axesInfo?: AxesInfo[];
};

export function Line(props: LineProps) {
  const [line] = createStore(props.value);

  return (
    <Accordion.Item value={line.name}>
      <Accordion.ItemTrigger
        padding="0.6rem"
        paddingLeft="1rem"
        paddingRight="1rem"
      >
        {line.name}
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
          <For each={Array.from({ length: line.axes / 3 }, (_, i) => i)}>
            {(index) => {
              const [axesInfo, setAxesInfo] = createStore<AxesInfo[]>([]);
              createEffect(() => {
                if (
                  line.axesInfo &&
                  line.axesInfo.slice(index * 3, index * 3 + 3)
                ) {
                  const currentAxesInfo = line.axesInfo.slice(
                    index * 3,
                    index * 3 + 3,
                  );
                  setAxesInfo(currentAxesInfo);
                }
              });
              return (
                <LineContext.Provider value={axesInfo}>
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
