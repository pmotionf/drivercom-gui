import { JSX } from "solid-js";
import { For } from "solid-js/web";
import { Accordion } from "../ui/accordion.tsx";
import { ChevronDownIcon } from "lucide-solid";
import { createContext } from "solid-js";

export type LineProps = JSX.HTMLAttributes<HTMLDivElement> & {
  lines: { axes: number; name: string }[];
};

export const LineContext = createContext<{
  axesIds: number[][];
  hallStatus: boolean[];
}>();

export type lines = { axes: number; name: string }[];

export function Line(props: LineProps) {
  const axesArray = (axisLength: number): number[][] => {
    const prevAxes = Array.from({ length: axisLength }, (_, i) => i + 1);

    const newAxes = Array.from(
      { length: axisLength / 3 },
      (_, i) =>
        Array.from({ length: 3 }, (_, index) => prevAxes[i * 3 + index]),
    );
    return newAxes;
  };

  return (
    <Accordion.Root
      multiple
      defaultValue={props.lines.map((line) => line.name)}
      style={{
        width: "100%",
        height: "100%",
      }}
    >
      <For each={props.lines}>
        {(line) => (
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
              <LineContext.Provider
                value={{
                  axesIds: axesArray(line.axes),
                  hallStatus: Array.from({ length: line.axes }, () => false),
                }}
              >
                {props.children}
              </LineContext.Provider>
            </Accordion.ItemContent>
          </Accordion.Item>
        )}
      </For>
    </Accordion.Root>
  );
}
