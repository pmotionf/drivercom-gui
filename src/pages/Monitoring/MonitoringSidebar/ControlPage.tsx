import { Setter } from "solid-js";
import * as Switch from "~/components/ui/switch";
import { Text } from "~/components/ui/text";

export type ControlPageProps = {
  isAutoMode: boolean;
  changeAutoMode: Setter<boolean>;
};

export const ControlPage = (props: ControlPageProps) => {
  return (
    <div
      style={{
        padding: "0rem 0rem 1rem 0rem",
        "row-gap": "0.5rem",
        display: "flex",
        "flex-direction": "column",
      }}
    >
      <Switch.Root
        checked={props.isAutoMode}
        onCheckedChange={(e) => props.changeAutoMode?.(e.checked)}
      >
        <Switch.Control>
          <Switch.Thumb />
        </Switch.Control>
        <Switch.Label textStyle="sm" fontWeight="bold">
          {"Clear Errors Automatically"}{" "}
        </Switch.Label>
        <Switch.HiddenInput />
      </Switch.Root>
      <Text textStyle="sm">{"Clear non-critical errors automatically."}</Text>
    </div>
  );
};
