import { Stack } from "styled-system/jsx";
import { Text } from "../ui/text";
import { GainLockStates, LinkStates } from "../ConfigForm";
import { Show } from "solid-js";
import {
  IconExclamationCircle,
  IconLock,
  IconLockOff,
} from "@tabler/icons-solidjs";
import { IconButton } from "../ui/icon-button";
import { Tooltip } from "../ui/tooltip";

export type FormNumberInputProps = {
  id: string;
  label: string;
  lockStatus?: GainLockStates;
  lockStatusKey?: string;
  linkStatus?: LinkStates;
  inputValue: number;
  onInputChange?: (input: number) => void;
};

export const FormNumberInput = (props: FormNumberInputProps) => {
  let divRef: HTMLDivElement | undefined;
  const lockStatus = props.lockStatus;
  const lockStatusKey = props.lockStatusKey;

  function getComputedCSSVariableValue(variable: string) {
    let value = getComputedStyle(document.documentElement).getPropertyValue(
      variable,
    );

    while (value.startsWith("var(")) {
      // Extract the name of the referenced variable
      const referencedVarName = value.slice(4, value.length - 1);
      value = getComputedStyle(document.documentElement).getPropertyValue(
        referencedVarName,
      );
    }

    return value.trim();
  }

  return (
    <Stack direction="row" width="100%" marginTop="1rem" marginBottom="0.5rem">
      <Text width="50%" marginTop="0.4rem" fontWeight="light">
        {props.label}
      </Text>
      <div style={{ width: "50%" }}>
        <Stack
          ref={divRef}
          style={{
            width: "100%",
            padding: "0.4rem",
            "padding-right": "0.2rem",
            "border-radius": "0.5rem",
            "border-width": "1px",
            gap: "0",
          }}
          borderColor={
            Number.isFinite(Number(props.inputValue)) ? "bg.disabled" : "red"
          }
          direction="row"
        >
          <input
            style={{
              width:
                lockStatus && lockStatusKey && lockStatus.has(lockStatusKey)
                  ? `calc(100% - 2rem)`
                  : "100%",
              outline: "none",
              opacity:
                lockStatus && lockStatusKey && lockStatus.has(lockStatusKey)
                  ? lockStatus.get(lockStatusKey)![0]()
                    ? "0.4"
                    : "1"
                  : "1",
            }}
            disabled={
              lockStatus && lockStatusKey && lockStatus.has(lockStatusKey)
                ? lockStatus.get(lockStatusKey)![0]()
                : false
            }
            onFocusIn={() => {
              divRef!.style.borderWidth = "2px";
              divRef!.style.borderColor = getComputedCSSVariableValue(
                "--colors-accent-default",
              );
            }}
            onFocusOut={(e) => {
              divRef!.style.borderWidth = "1px";
              divRef!.style.borderColor = !Number.isFinite(
                Number(e.target.value),
              )
                ? "red"
                : getComputedCSSVariableValue("--colors-bg-disabled");
            }}
            placeholder={props.label}
            value={props.inputValue}
            onChange={(e) => {
              props.onInputChange?.(Number(e.target.value));
            }}
          />

          <Show when={!Number.isFinite(props.inputValue)}>
            <IconExclamationCircle color="red" data-name="config_field_error" />
          </Show>
          <Show
            when={lockStatus && lockStatusKey && lockStatus.has(lockStatusKey)}
          >
            <Tooltip.Root>
              <Tooltip.Trigger width="min-content">
                <IconButton
                  type="button"
                  variant="ghost"
                  size="sm"
                  borderRadius="3rem"
                  height="min-content"
                  paddingTop="0.2rem"
                  paddingBottom="0.2rem"
                  opacity={lockStatus!.get(lockStatusKey!)![0]() ? "1" : "0.5"}
                  onClick={() => {
                    if (!lockStatus) return;
                    const newStatus = !lockStatus.get(lockStatusKey!)![0]();
                    lockStatus.get(lockStatusKey!)![1](newStatus);
                  }}
                >
                  <Show
                    when={lockStatus && lockStatus.get(lockStatusKey!)![0]()}
                    fallback={<IconLockOff />}
                  >
                    <IconLock />
                  </Show>
                </IconButton>
              </Tooltip.Trigger>
              <Tooltip.Positioner>
                <Tooltip.Content>{"Lock auto calculation"}</Tooltip.Content>
              </Tooltip.Positioner>
            </Tooltip.Root>
          </Show>
        </Stack>
        <Show when={!Number.isFinite(props.inputValue)}>
          <Text size="sm" color="red">
            {`Invalid ${typeof props.inputValue}.`}
          </Text>
        </Show>
      </div>
    </Stack>
  );
};
