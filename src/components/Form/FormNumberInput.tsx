import { Stack } from "styled-system/jsx";
import { Text } from "../ui/text";
import {
  GainLockStates,
  LinkStates,
} from "../../pages/Configuration/ConfigForm/ConfigForm";
import { Show } from "solid-js";
import {
  IconExclamationCircle,
  IconLock,
  IconLockOff,
} from "@tabler/icons-solidjs";
import { IconButton } from "../ui/icon-button";
import { Tooltip } from "../ui/tooltip";
import { getComputedCSSVariableValue } from "~/utils/GetComputedCssVariableValue";

export type FormNumberInputProps = {
  id: string;
  label: string;
  desc?: object;
  originalValue?: number;
  changeUnits?: boolean;
  lockStatus?: GainLockStates;
  lockStatusKey?: string;
  linkStatus?: LinkStates;
  inputValue: number;
  onInputChange?: (input: number) => void;
};

export const FormNumberInput = (props: FormNumberInputProps) => {
  if (props.desc && props.desc["hidden" as keyof typeof props.desc] === true)
    return;
  let divRef: HTMLDivElement | undefined;
  const lockStatus = props.lockStatus;
  const lockStatusKey = props.lockStatusKey;

  const parseUnit = (unit: string) => {
    const splitSuper = unit.split("^");
    if (splitSuper.length > 1) {
      return (
        <>
          {splitSuper[0]}
          <sup>{splitSuper[1]}</sup>
        </>
      );
    }

    const splitSub = unit.split("_");
    if (splitSub.length > 1) {
      return (
        <>
          {splitSub[0]}
          <sub>{splitSub[1]}</sub>
        </>
      );
    }

    return <>{unit}</>;
  };

  const changeUnitShort = (unitShort: string, isMillimeter: boolean) => {
    const parseUnit = unitShort.toLowerCase();
    if (isMillimeter) {
      if (parseUnit === "m") {
        return "mm";
      } else if (parseUnit === "dag") {
        return "kg";
      } else if (parseUnit === "m/s") {
        return "mm/s";
      } else if (parseUnit === "m/s²") {
        return "mm/s²";
      } else {
        return unitShort;
      }
    } else {
      if (parseUnit === "mm") {
        return "m";
      } else {
        return unitShort;
      }
    }
  };

  const changeUnitLong = (unitLong: string, isMillimeter: boolean) => {
    const parseUnit = unitLong.toLowerCase();
    if (isMillimeter) {
      if (parseUnit === "meter") {
        return "Millimeter";
      } else if (parseUnit === "decagram") {
        return "Killogram";
      } else if (parseUnit === "meters per second") {
        return "Millimeters Per Second";
      } else if (parseUnit === "meters per second squared") {
        return "Millimeters per Second squared";
      } else {
        return unitLong;
      }
    } else {
      if (parseUnit === "millimeter") {
        return "meter";
      } else {
        return unitLong;
      }
    }
  };

  const changeValue = (
    unitShort: string,
    value: number,
    isMillimeter: boolean,
  ) => {
    const parseUnit = unitShort.toLowerCase();
    if (isMillimeter) {
      if (parseUnit === "m") {
        return value * 1000;
      } else if (parseUnit === "dag") {
        return value * 0.01;
      } else if (parseUnit === "m/s") {
        return value * 1000;
      } else if (parseUnit === "m/s²") {
        return value * 1000;
      } else {
        return value;
      }
    } else {
      if (parseUnit === "mm") {
        return value * 0.001;
      } else {
        return value;
      }
    }
  };

  const setChangedValue = (
    unitShort: string,
    value: number,
    isMillimeter: boolean,
  ) => {
    const parseUnit = unitShort.toLowerCase();
    if (isMillimeter) {
      if (parseUnit === "m") {
        return value * 0.001;
      } else if (parseUnit === "dag") {
        return value * 100;
      } else if (parseUnit === "m/s") {
        return value * 0.001;
      } else if (parseUnit === "m/s²") {
        return value * 0.001;
      } else {
        return value;
      }
    } else {
      if (parseUnit === "mm") {
        return value * 100;
      } else {
        return value;
      }
    }
  };

  const inputValue = () => props.inputValue;

  return (
    <div
      style={{
        "margin-top": "1rem",
        "margin-bottom": "0.5rem",
        width: "100%",
      }}
    >
      <Stack direction="row" alignItems="center">
        <div style={{ width: "15rem", display: "flex" }}>
          <div style={{ width: `calc(100% - 0.5rem)` }}>
            <Text
              marginTop="0.4em"
              fontWeight="medium"
              borderColor="accent.7"
              height="1.5em"
              borderBottomWidth={
                props.originalValue !== inputValue() ? "2px" : "0px"
              }
              width="min-content"
            >
              {props.label.replaceAll(" ", "_")}
            </Text>
            <Show
              when={
                props.desc &&
                "description" in props.desc &&
                typeof props.desc["description" as keyof typeof props.desc] ===
                  "string"
              }
            >
              <Text textStyle="xs" fontWeight="light" color="fg.muted">
                {props.desc!["description" as keyof typeof props.desc]}
              </Text>
            </Show>
          </div>

          <Show
            when={lockStatus && lockStatusKey && lockStatus.has(lockStatusKey)}
          >
            <Tooltip content = "Lock auto calculation">
              <IconButton
                type="button"
                variant="plain"
                size="sm"
                borderRadius="3rem"
                height="min-content"
                paddingTop="0.2rem"
                paddingBottom="0.2rem"
                opacity={lockStatus!.get(lockStatusKey!)![0]() ? "1" : "0.5"}
                onClick={() => {
                  if (!lockStatus) return;
                  lockStatus.get(lockStatusKey!)![1]((prev) => !prev);

                  const gainKey = lockStatusKey!
                    .split(".")
                    .slice(0, -2)
                    .join(".");
                  const isCenter = props.id.includes("center");
                  const oppositeDynPos = isCenter ? "between" : "center";
                  const currentDynPos = isCenter ? "center" : "between";

                  if (props.lockStatus!.has(gainKey)) {
                    const updateValue = Array.from(
                      props.lockStatus!.entries(),
                    )
                      .filter(
                        (entry) =>
                          entry[0] !== gainKey &&
                          entry[0].includes(currentDynPos),
                      )
                      .some((entry) => entry[1][0]() === true);
                    props.lockStatus!.get(gainKey)![1](updateValue);
                  }

                  if (!props.linkStatus) return;
                  const link = props.linkStatus.get("gain")![0]();
                  if (link[0]) {
                    const endkey = lockStatusKey!.replace(
                      currentDynPos,
                      oppositeDynPos,
                    );
                    if (props.lockStatus!.has(endkey)) {
                      props.lockStatus!.get(endkey)![1]((prev) => !prev);
                    }

                    const oppositeGainKey = endkey
                      .split(".")
                      .slice(0, -2)
                      .join(".");
                    if (props.lockStatus!.has(oppositeGainKey)) {
                      const updateValue = Array.from(
                        props.lockStatus!.entries(),
                      )
                        .filter(
                          (entry) =>
                            entry[0] !== oppositeGainKey &&
                            entry[0].includes(oppositeDynPos),
                        )
                        .some((entry) => entry[1][0]() === true);
                      props.lockStatus!.get(oppositeGainKey)![1](updateValue);
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
            </Tooltip>
          </Show>
        </div>
        <div
          style={{
            width: `calc(100% - 15rem)`,
            display: "flex",
            "flex-direction": "row-reverse",
          }}
        >
          <Stack
            ref={divRef}
            style={{
              width: "100%",
              padding: "0.4rem",
              "border-radius": "0.2rem",
              "border-width": "1px",
              gap: "0",
            }}
            borderColor={
              Number.isFinite(Number(inputValue())) ? "bg.disabled" : "red"
            }
            direction="row"
          >
            <input
              style={{
                width:
                  props.desc && "unit_short" in props.desc
                    ? `calc(100% - 1em)`
                    : "100%",
                outline: "none",
                opacity:
                  lockStatus && lockStatusKey && lockStatus.has(lockStatusKey)
                    ? lockStatus.get(lockStatusKey)![0]()
                      ? "0.4"
                      : "1"
                    : "1",
                "white-space": "nowrap",
                "text-overflow": "ellipsis",
                display: "block",
                overflow: "hidden",
                "text-align": "right",
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
              value={
                props.desc &&
                props.desc["unit_short" as keyof typeof props.desc]
                  ? changeValue(
                      props.desc[
                        "unit_short" as keyof typeof props.desc
                      ] as string,
                      inputValue(),
                      props.changeUnits ?? false,
                    )
                  : inputValue()
              }
              onChange={(e) => {
                let inputValue = Number(e.target.value);
                if (
                  props.desc &&
                  "unit_short" in props.desc &&
                  props.changeUnits !== undefined
                ) {
                  inputValue = setChangedValue(
                    props.desc[
                      "unit_short" as keyof typeof props.desc
                    ] as string,
                    inputValue,
                    props.changeUnits,
                  );
                }
                props.onInputChange?.(inputValue);
              }}
            />
            <Show
              when={
                props.desc &&
                props.desc!["unit_short" as keyof typeof props.desc]
              }
            >
              <Tooltip content = {changeUnitLong(
                props.desc![
                  "unit_long" as keyof typeof props.desc
                ] as string,
                props.changeUnits ?? false,
              )}>
                <Text opacity="0.5" marginLeft="0.2em">
                  {parseUnit(
                    changeUnitShort(
                      props.desc![
                        "unit_short" as keyof typeof props.desc
                      ] as string,
                      props.changeUnits ?? false,
                    ),
                  )}
                </Text>
              </Tooltip>
            </Show>
            <Show when={!Number.isFinite(props.inputValue)}>
              <IconExclamationCircle
                color="red"
                data-name="config_field_error"
              />
            </Show>
          </Stack>
        </div>
      </Stack>
      <Show when={!Number.isFinite(props.inputValue)}>
        <Text textStyle="sm" color="red" marginLeft={"50%"} paddingLeft="0.5em">
          {`Invalid ${typeof props.inputValue}.`}
        </Text>
      </Show>
    </div>
  );
};
