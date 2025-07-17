import { JSX } from "solid-js";
import { Line, LineConfig } from "./Line.tsx";
import { Accordion } from "../ui/accordion.tsx";
import { For } from "solid-js/web";
import { Station } from "./Station.tsx";
import { Axis } from "./Axes.tsx";

export type SystemProps = JSX.HTMLAttributes<HTMLDivElement> & {
  lineConfig: LineConfig[];
};

export function System(props: SystemProps) {
  return (
    <Accordion.Root
      multiple
      defaultValue={props.lineConfig.map((line) => line.line.name!)}
      style={{
        width: "100%",
        height: "100%",
      }}
    >
      <For each={props.lineConfig}>
        {(config) => {
          return (
            <Line value={config}>
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
