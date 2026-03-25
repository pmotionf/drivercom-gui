import { Checkbox } from "../ui/checkbox";
import { Text } from "../ui/text";
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
    <div
      style={{
        display: "flex",
        width: "100%",
        "margin-top": "1em",
        "align-items": "center",
        height: "max-content",
      }}
    >
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
        alignItems={"center"}
      >
        <div>
          <Text
            fontWeight="medium"
            userSelect="none"
            paddingLeft="0.1em"
            paddingRight="0.1em"
            borderColor="accent.7"
            borderBottomWidth={
              props.originalValue !== props.checked ? "2px" : "0px"
            }
            width="min-content"
          >
            {key.replaceAll(" ", "_")}
          </Text>
          <Show
            when={
              props.desc &&
              typeof props.desc["description" as keyof typeof props.desc] ===
                "string"
            }
          >
            <Text size="xs" fontWeight="light" color="fg.muted">
              {props.desc!["description" as keyof typeof props.desc]}
            </Text>
          </Show>
        </div>
      </Checkbox>
    </div>
  );
};
