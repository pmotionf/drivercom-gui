import { JSX } from "solid-js";
import { Line, Lines } from "./Line.tsx";
import { Station } from "./Station.tsx";

export type SystemProps = JSX.HTMLAttributes<HTMLDivElement> & {
  lineConfig: Line[];
};

export function System(props: SystemProps) {
  return (
    <Lines lines={props.lineConfig}>
      <Station />
    </Lines>
  );
}
