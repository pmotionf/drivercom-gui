import { css } from "styled-system/css";
import * as Checkbox from "../ui/checkbox";
import { Text } from "../ui/text";
import { Show } from "solid-js";
import { FlipSensorExample } from "~/pages/Configuration/ConfigForm/FlipSensorExample";
import { SwapSensorExample } from "~/pages/Configuration/ConfigForm/SwapSensorExample";

export type FormCheckBoxProps = {
  id: string;
  label: string;
  isFocus?: boolean;
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
      id={props.id}
      style={{
        display: "flex",
        width: "100%",
        "align-items": "center",
        height: "max-content",
      }}
    >
      <Checkbox.Root
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
        <Checkbox.HiddenInput />
        <Checkbox.Control borderColor={"gray.7"}>
          <Checkbox.Indicator />
        </Checkbox.Control>
        <div>
          <Text
            fontWeight="medium"
            userSelect="none"
            width="min-content"
            display="flex"
            flexDirection="row"
            alignItems="center"
            gap="0.4rem"
          >
            <Show when={props.originalValue !== props.checked}>
              <div
                class={css({
                  background: "accent.9",
                  width: "0.5rem",
                  height: "0.5rem",
                  borderRadius: "1rem",
                  marginTop: "0.1rem",
                })}
              />
            </Show>
            <div
              class={css({
                background: props.isFocus ? "accent.7" : "transparent",
              })}
            >
              {key.replaceAll(" ", "_")}
            </div>
          </Text>
          <Show
            when={
              props.desc &&
              typeof props.desc["description" as keyof typeof props.desc] ===
                "string"
            }
          >
            <Text
              textStyle="sm"
              fontWeight="light"
              color="fg.default"
              alignItems="center"
            >
              {props.desc!["description" as keyof typeof props.desc]}
              <Show when={key.toLowerCase() === "flip"}>
                <FlipSensorExample />
              </Show>
              <Show when={key.toLowerCase() === "swap"}>
                <SwapSensorExample />
              </Show>
            </Text>
          </Show>
        </div>
      </Checkbox.Root>
    </div>
  );
};
