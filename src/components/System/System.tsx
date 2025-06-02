import { JSX } from "solid-js";
import { Line, lines } from "./Line.tsx";
import { Axis } from "./Axis.tsx";

export type SystemProps = JSX.HTMLAttributes<HTMLDivElement> & {
  lineConfig: lines;
};

export function System(props: SystemProps) {
  return (
    <Line lines={props.lineConfig}>
      <Axis />
    </Line>
  );
}
