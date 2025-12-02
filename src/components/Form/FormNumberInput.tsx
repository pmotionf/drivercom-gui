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
                lockStatus.get(lockStatusKey!)![1](
                  !lockStatus.get(lockStatusKey!)![0](),
                );

                const split = lockStatusKey!.split(".");
                const includingKeys = `${split[0]}.${split[1]}.`;
                const mapValues = Array.from(lockStatus.entries())
                  .filter((entries) => entries[0].includes(includingKeys))
                  .map((entries) => entries[1][0]());
                const parseValues = [...new Set(mapValues)];
                if (parseValues.length !== 1) {
                  lockStatus.get(includingKeys.slice(0, -1))![1](true);
                } else {
                  lockStatus.get(includingKeys.slice(0, -1))![1](
                    parseValues[0],
                  );
                }

                if (props.linkStatus && lockStatus.get(lockStatusKey!)![0]()) {
                  const [getLinkState, setLinkState] = props.linkStatus!.get(
                    props.id.split(".")[1]!,
                  )!;
                  if (getLinkState()[0]) {
                    setLinkState([false, getLinkState()[1]]);
                  }
                }
              }}
            >
              <Show
                when={lockStatus && lockStatus.get(lockStatusKey!)![0]()}
                fallback={<IconLockOff />}
              >
                <IconLock />
              </Show>
            </IconButton>
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
