import { Setter } from "solid-js";
import { Switch } from "../ui/switch";
import { Text } from "../ui/text";

export type ControlPageProps = {
  isAutoMode: boolean;
  changeAutoMode: Setter<boolean>;
};

export const ControlPage = (props: ControlPageProps) => {
  return (
    <div
      style={{
        padding: "0rem 1rem 1rem 1rem",
        "row-gap": "0.5rem",
        display: "flex",
        "flex-direction": "column",
      }}
    >
      <Switch
        checked={props.isAutoMode}
        onCheckedChange={(e) => {
          props.changeAutoMode(e.checked);
        }}
      >
        <Text size="sm" fontWeight="bold">
          {"Clear Errors Automatically"}
        </Text>
      </Switch>
      <Text size="sm">{"Clear non-critical errors automatically."}</Text>
    </div>
  );
};
