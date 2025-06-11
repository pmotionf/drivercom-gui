import { JSX } from "solid-js";
import { Line, Lines } from "./Line.tsx";
import { Axis } from "./Axis.tsx";

export type SystemProps = JSX.HTMLAttributes<HTMLDivElement> & {
  lineConfig: Line[];
};

export function System(props: SystemProps) {
  return (
    <Lines lines={props.lineConfig}>
      <Axis />
    </Lines>
  );
}
