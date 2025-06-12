import { JSX } from "solid-js";
import { For } from "solid-js/web";
import { Accordion } from "../ui/accordion.tsx";
import { ChevronDownIcon } from "lucide-solid";
import { createContext } from "solid-js";
import { createEffect } from "solid-js";
import { createStore, Store } from "solid-js/store";
import { on } from "solid-js";
import { useContext } from "solid-js";
import { AxesInfo } from "./Axes.tsx";

export type LineProps = JSX.HTMLAttributes<HTMLDivElement> & {
  lines: Line[];
};

export const LineContext = createContext<Store<Line>>();

export const useLineContext = () => useContext(LineContext);

export type Line = {
  axes: number;
  name: string;
  axesInfo?: AxesInfo[];
};

export function Lines(props: LineProps) {
  const [lineContexts] = createStore(props.lines);

  createEffect(
    on(
      () => JSON.stringify(lineContexts),
      () => {},
    ),
  );

  return (
    <Accordion.Root
      multiple
      defaultValue={props.lines.map((line) => line.name)}
      style={{
        width: "100%",
        height: "100%",
      }}
    >
      <For each={lineContexts}>
        {(line, lineIdx) => {
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
                <LineContext.Provider value={lineContexts[lineIdx()]}>
                  {props.children}
                </LineContext.Provider>
              </Accordion.ItemContent>
            </Accordion.Item>
          );
        }}
      </For>
    </Accordion.Root>
  );
}
