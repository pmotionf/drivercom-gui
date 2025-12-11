import { IconHelp } from "@tabler/icons-solidjs";
import { Checkbox } from "../ui/checkbox";
import { Text } from "../ui/text";
import { Tooltip } from "../ui/tooltip";
import { Show } from "solid-js";

export type FormCheckBoxProps = {
  id: string;
  label: string;
  desc?: object;
  originalValue?: boolean;
  checked: boolean;
  onCheckedChange?: (checked: boolean) => void;
  onClick?: () => void;
  onShiftClick?: () => void;
};

export const FormCheckBox = (props: FormCheckBoxProps) => {
  const key = props.label;
  if (props.desc && props.desc["hidden" as keyof typeof props.desc] === true)
    return;

  return (
    <div style={{ display: "flex", width: "100%", "margin-top": "1em" }}>
      <Checkbox
        id={props.id}
        checked={props.checked}
        onCheckedChange={(e) => {
          props.onCheckedChange?.(e.checked === true ? true : false);
        }}
        onClick={(e) => {
          if (!e.shiftKey) {
            props.onClick?.();
          } else {
            props.onShiftClick?.();
          }
        }}
        marginRight="0.5em"
      >
        <Text fontWeight="medium" userSelect="none">
          {key}
        </Text>
      </Checkbox>
      <Show
        when={
          props.desc &&
          typeof props.desc["description" as keyof typeof props.desc] ===
            "string"
        }
      >
        <Tooltip.Root>
          <Tooltip.Trigger>
            <IconHelp size="1em" opacity={0.5} />
          </Tooltip.Trigger>
          <Tooltip.Positioner>
            <Tooltip.Content>
              {props.desc!["description" as keyof typeof props.desc]}
            </Tooltip.Content>
          </Tooltip.Positioner>
        </Tooltip.Root>
      </Show>
    </div>
  );
};
