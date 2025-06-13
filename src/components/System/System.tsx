import { JSX } from "solid-js";
import { Line, LineConfig } from "./Line.tsx";
import { Station } from "./Station.tsx";
import { Axis } from "./Axes.tsx";
import { Accordion } from "../ui/accordion.tsx";
import { For } from "solid-js/web";

export type SystemProps = JSX.HTMLAttributes<HTMLDivElement> & {
  lineConfig: LineConfig[];
};

export function System(props: SystemProps) {
  return (
    <Accordion.Root
      multiple
      defaultValue={props.lineConfig.map((line) => line.name)}
      style={{
        width: "100%",
        height: "100%",
      }}
    >
      <For each={props.lineConfig}>
        {(line) => {
          return (
            <Line value={line}>
              <Station>
                <Axis />
              </Station>
            </Line>
          );
        }}
      </For>
    </Accordion.Root>
  );
}
