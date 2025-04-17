import {
  type Accessor,
  createEffect,
  createSignal,
  For,
  JSX,
  type Setter,
  Show,
  splitProps,
} from "solid-js";
import { createStore } from "solid-js/store";

import { Accordion } from "~/components/ui/accordion";
import { Checkbox } from "~/components/ui/checkbox";
import { Input } from "~/components/ui/input";

import { Stack } from "styled-system/jsx";
import { Text } from "./ui/text";
import { Editable } from "./ui/editable";
import { IconButton } from "./ui/icon-button";
import {
  IconChevronDown,
  IconLink,
  IconLinkOff,
  IconX,
} from "@tabler/icons-solidjs";
import { Tooltip } from "./ui/tooltip";

export type ConfigFormProps = JSX.HTMLAttributes<HTMLFormElement> & {
  label: string;
  onLabelChange?: (label: string) => void;
  config: object;
  onCancel?: () => void;
};

type AccordionStatuses = Map<string, [Accessor<string[]>, Setter<string[]>]>;

type LinkedStatuses = Map<
  string,
  [Accessor<[boolean, number]>, Setter<[boolean, number]>]
>;

export function ConfigForm(props: ConfigFormProps) {
  const [config, setConfig] = createStore(props.config);
  const [prevConfig, setPrevConfig] = createSignal<object>(
    JSON.parse(JSON.stringify(config)),
  );

  const accordionStatuses: AccordionStatuses = new Map();
  const linkedStatuses: LinkedStatuses = new Map();

  createEffect(() => {
    const coil = config["coil" as keyof typeof config];
    const rs = coil["rs" as keyof typeof coil];
    const axes: object[] = config["axes" as keyof typeof config];

    const prevConfigValue = prevConfig();
    const prevConfigCoil =
      prevConfigValue["coil" as keyof typeof prevConfigValue];

    if (rs !== prevConfigCoil["rs" as keyof typeof prevConfigCoil]) {
      const updatedCurrentIAxesArray = updateAxesArrayCurrentI(
        rs,
        axes,
        Array.from({ length: axes.length }, () => true),
      );
      setConfig({ ...config, axes: updatedCurrentIAxesArray });
      setPrevConfig(JSON.parse(JSON.stringify(config)));
    }
  });

  createEffect(() => {
    const coil = config["coil" as keyof typeof config];
    const ls = coil["ls" as keyof typeof coil];

    const axes: object[] = config["axes" as keyof typeof config];
    const prevConfigValue = prevConfig();
    const prevConfigCoil =
      prevConfigValue["coil" as keyof typeof prevConfigValue];

    if (ls !== prevConfigCoil["ls" as keyof typeof prevConfigCoil]) {
      const updatedCurrentPAxesArray = updateAxesArrayCurrentP(
        ls,
        axes,
        Array.from({ length: axes.length }, () => true),
      );
      setConfig({ ...config, axes: updatedCurrentPAxesArray });
      setPrevConfig(JSON.parse(JSON.stringify(config)));
    }
  });

  createEffect(() => {
    const axes: object[] = config["axes" as keyof typeof config];
    const prevConfigValue = prevConfig();
    const prevConfigAxes: object[] =
      prevConfigValue["axes" as keyof typeof prevConfigValue];
    const isCurrentDenominatorChange = checkAxesCurrentDenominatorChange(
      axes,
      prevConfigAxes,
    );

    if (isCurrentDenominatorChange.includes(true)) {
      const coil = config["coil" as keyof typeof config];
      const rs = coil["rs" as keyof typeof coil];
      const ls = coil["ls" as keyof typeof coil];

      const kf = coil["kf" as keyof typeof coil];
      const magnet = config["magnet" as keyof typeof config];
      const pitch = magnet["pitch" as keyof typeof magnet];

      const carrier = config["carrier" as keyof typeof config];
      const mass = carrier["mass" as keyof typeof carrier];

      const updatedCurrentPAxesArray = updateAxesArrayCurrentP(
        ls,
        axes,
        isCurrentDenominatorChange,
      );
      const updatedCurrentIAxesArray = updateAxesArrayCurrentI(
        rs,
        updatedCurrentPAxesArray,
        isCurrentDenominatorChange,
      );
      const updatedVelocityPAxesArray = updateAxesArrayVelocityP(
        pitch,
        mass,
        kf,
        updatedCurrentIAxesArray,
        isCurrentDenominatorChange,
      );
      const updatedPositionPAxesArray = updateAxesArrayPosition(
        updatedVelocityPAxesArray,
        isCurrentDenominatorChange,
      );
      setConfig({ ...config, axes: updatedPositionPAxesArray });
      setPrevConfig(JSON.parse(JSON.stringify(config)));
    }
  });

  createEffect(() => {
    const coil = config["coil" as keyof typeof config];
    const kf = coil["kf" as keyof typeof coil];
    const axes: object[] = config["axes" as keyof typeof config];

    const prevConfigValue = prevConfig();
    const prevConfigCoil =
      prevConfigValue["coil" as keyof typeof prevConfigValue];

    if (kf !== prevConfigCoil["kf" as keyof typeof prevConfigCoil]) {
      const magnet = config["magnet" as keyof typeof config];
      const pitch = magnet["pitch" as keyof typeof magnet];

      const carrier = config["carrier" as keyof typeof config];
      const mass = carrier["mass" as keyof typeof carrier];
      const updatedVelocityPAxesArray = updateAxesArrayVelocityP(
        pitch,
        mass,
        kf,
        axes,
        Array.from({ length: axes.length }, () => true),
      );
      const updatedVelocityIAxesArray = updateAxesArrayVelocityI(
        updatedVelocityPAxesArray,
        Array.from({ length: axes.length }, () => true),
      );
      setConfig({ ...config, axes: updatedVelocityIAxesArray });
      setPrevConfig(JSON.parse(JSON.stringify(config)));
    }
  });

  createEffect(() => {
    const axes: object[] = config["axes" as keyof typeof config];
    const prevConfigValue = prevConfig();
    const prevConfigAxes: object[] =
      prevConfigValue["axes" as keyof typeof prevConfigValue];

    const isVelocityPChange = checkAxesVelocityPChange(prevConfigAxes, axes);

    if (isVelocityPChange.includes(true)) {
      // Infinite loop occur
      /* const updatedVelocityIAxesArray = updateAxesArrayVelocityI(
        axes,
        isVelocityPChange,
      );
      setConfig({
        ...config,
        axes: updatedVelocityIAxesArray,
      });
      setPrevConfig(JSON.parse(JSON.stringify(config)));*/
    }
  });

  createEffect(() => {
    const magnet = config["magnet" as keyof typeof config];
    const pitch = magnet["pitch" as keyof typeof magnet];
    const axes: object[] = config["axes" as keyof typeof config];

    const prevConfigValue = prevConfig();
    const prevConfigMagnet =
      prevConfigValue["magnet" as keyof typeof prevConfigValue];

    if (pitch !== prevConfigMagnet["pitch" as keyof typeof prevConfigMagnet]) {
      const coil = config["coil" as keyof typeof config];
      const kf = coil["kf" as keyof typeof coil];

      const carrier = config["carrier" as keyof typeof config];
      const mass = carrier["mass" as keyof typeof carrier];

      const updatedVelocityPAxesArray = updateAxesArrayVelocityP(
        pitch,
        mass,
        kf,
        axes,
        Array.from({ length: axes.length }, () => true),
      );
      const updatedVelocityIAxesArray = updateAxesArrayVelocityI(
        updatedVelocityPAxesArray,
        Array.from({ length: axes.length }, () => true),
      );
      setConfig({ ...config, axes: updatedVelocityIAxesArray });
      setPrevConfig(JSON.parse(JSON.stringify(config)));

      console.log("pitch");
    }
  });

  createEffect(() => {
    const carrier = config["carrier" as keyof typeof config];
    const mass = carrier["mass" as keyof typeof carrier];

    const axes: object[] = config["axes" as keyof typeof config];

    const prevConfigValue = prevConfig();
    const prevConfigCarrier =
      prevConfigValue["carrier" as keyof typeof prevConfigValue];

    if (mass !== prevConfigCarrier["mass" as keyof typeof prevConfigCarrier]) {
      const coil = config["coil" as keyof typeof config];
      const kf = coil["kf" as keyof typeof coil];

      const magnet = config["magnet" as keyof typeof config];
      const pitch = magnet["pitch" as keyof typeof magnet];

      const updatedVelocityPAxesArray = updateAxesArrayVelocityP(
        pitch,
        mass,
        kf,
        axes,
        Array.from({ length: axes.length }, () => true),
      );
      const updatedVelocityIAxesArray = updateAxesArrayVelocityI(
        updatedVelocityPAxesArray,
        Array.from({ length: axes.length }, () => true),
      );
      setConfig({ ...config, axes: updatedVelocityIAxesArray });
      setPrevConfig(JSON.parse(JSON.stringify(config)));
      console.log("carrier");
    }
  });

  createEffect(() => {
    const axes: object[] = config["axes" as keyof typeof config];
    const prevConfigValue = prevConfig();
    const prevConfigAxes: object[] =
      prevConfigValue["axes" as keyof typeof prevConfigValue];
    const isVelocityDenominatorChange = checkAxesVelocityDenominatorChange(
      prevConfigAxes,
      axes,
    );

    if (isVelocityDenominatorChange.includes(true)) {
      const coil = config["coil" as keyof typeof config];
      const kf = coil["kf" as keyof typeof coil];
      const magnet = config["magnet" as keyof typeof config];
      const pitch = magnet["pitch" as keyof typeof magnet];

      const carrier = config["carrier" as keyof typeof config];
      const mass = carrier["mass" as keyof typeof carrier];

      const updatedVelocityPAxesArray = updateAxesArrayVelocityP(
        pitch,
        mass,
        kf,
        axes,
        isVelocityDenominatorChange,
      );
      const updatedVelocityIAxesArray = updateAxesArrayVelocityI(
        updatedVelocityPAxesArray,
        isVelocityDenominatorChange,
      );
      const updatedPositionPAxesArray = updateAxesArrayPosition(
        updatedVelocityIAxesArray,
        isVelocityDenominatorChange,
      );
      setConfig({ ...config, axes: updatedPositionPAxesArray });
      setPrevConfig(JSON.parse(JSON.stringify(config)));
    }
  });

  createEffect(() => {
    const axes: object[] = config["axes" as keyof typeof config];
    const prevConfigValue = prevConfig();
    const prevConfigAxes: object[] =
      prevConfigValue["axes" as keyof typeof prevConfigValue];
    const isVelocityDenominatorPIChange = checkAxesVelocityDenominatorPIChange(
      prevConfigAxes,
      axes,
    );

    if (isVelocityDenominatorPIChange.includes(true)) {
      const updatedVelocityIAxesArray = updateAxesArrayVelocityI(
        axes,
        isVelocityDenominatorPIChange,
      );
      setConfig({ ...config, axes: updatedVelocityIAxesArray });
      setPrevConfig(JSON.parse(JSON.stringify(config)));
    }
  });

  createEffect(() => {
    const axes: object[] = config["axes" as keyof typeof config];
    const prevConfigValue = prevConfig();
    const prevConfigAxes: object[] =
      prevConfigValue["axes" as keyof typeof prevConfigValue];
    const isPositionDenominatorChange = checkAxesPositionDenominatorChange(
      prevConfigAxes,
      axes,
    );

    if (isPositionDenominatorChange.includes(true)) {
      const updatedPositionPAxesArray = updateAxesArrayPosition(
        axes,
        isPositionDenominatorChange,
      );
      setConfig({ ...config, axes: updatedPositionPAxesArray });
      setPrevConfig(JSON.parse(JSON.stringify(config)));
    }
  });

  const checkAxesCurrentDenominatorChange = (
    axes: object[],
    prevAxes: object[],
  ): boolean[] => {
    const isCurrentDenominatorChange: boolean[] = [];
    axes.forEach((axis, index) => {
      const axisGain = axis["gain" as keyof typeof axis];
      const prevAxis = prevAxes[index];
      const prevAxisGain = prevAxis["gain" as keyof typeof prevAxis];

      const axisCurrent = axisGain["current" as keyof typeof axisGain];
      const prevAxisCurrent =
        prevAxisGain["current" as keyof typeof prevAxisGain];

      if (
        axisCurrent["denominator" as keyof typeof axisCurrent] !==
          prevAxisCurrent["denominator" as keyof typeof prevAxisCurrent]
      ) {
        isCurrentDenominatorChange.push(true);
      } else {
        isCurrentDenominatorChange.push(false);
      }
    });
    return isCurrentDenominatorChange;
  };

  const checkAxesVelocityDenominatorChange = (
    axes: object[],
    prevAxes: object[],
  ): boolean[] => {
    const isVelocityDenominatorChange: boolean[] = [];
    axes.forEach((axis, index) => {
      const axisGain = axis["gain" as keyof typeof axis];
      const prevAxis = prevAxes[index];
      const prevAxisGain = prevAxis["gain" as keyof typeof prevAxis];

      const axisVelocity = axisGain["velocity" as keyof typeof axisGain];
      const prevAxisVelocity =
        prevAxisGain["velocity" as keyof typeof prevAxisGain];

      if (
        axisVelocity["denominator" as keyof typeof axisVelocity] !==
          prevAxisVelocity["denominator" as keyof typeof prevAxisVelocity]
      ) {
        isVelocityDenominatorChange.push(true);
      } else {
        isVelocityDenominatorChange.push(false);
      }
    });
    return isVelocityDenominatorChange;
  };

  const checkAxesVelocityDenominatorPIChange = (
    axes: object[],
    prevAxes: object[],
  ): boolean[] => {
    const isVelocityDenominatorPIChange: boolean[] = [];
    axes.forEach((axis, index) => {
      const axisGain = axis["gain" as keyof typeof axis];
      const prevAxis = prevAxes[index];
      const prevAxisGain = prevAxis["gain" as keyof typeof prevAxis];

      const axisVelocity = axisGain["velocity" as keyof typeof axisGain];
      const prevAxisVelocity =
        prevAxisGain["velocity" as keyof typeof prevAxisGain];

      if (
        axisVelocity["denominator_pi" as keyof typeof axisVelocity] !==
          prevAxisVelocity["denominator_pi" as keyof typeof prevAxisVelocity]
      ) {
        isVelocityDenominatorPIChange.push(true);
      } else {
        isVelocityDenominatorPIChange.push(false);
      }
    });
    return isVelocityDenominatorPIChange;
  };

  const checkAxesVelocityPChange = (
    axes: object[],
    prevAxes: object[],
  ): boolean[] => {
    const isVelocityPChange: boolean[] = [];
    axes.forEach((axis, index) => {
      const axisGain = axis["gain" as keyof typeof axis];
      const prevAxis = prevAxes[index];
      const prevAxisGain = prevAxis["gain" as keyof typeof prevAxis];

      const axisVelocity = axisGain["velocity" as keyof typeof axisGain];
      const prevAxisVelocity =
        prevAxisGain["velocity" as keyof typeof prevAxisGain];

      if (
        axisVelocity["p" as keyof typeof axisVelocity] !==
          prevAxisVelocity["p" as keyof typeof prevAxisVelocity]
      ) {
        isVelocityPChange.push(true);
      } else {
        isVelocityPChange.push(false);
      }
    });
    return isVelocityPChange;
  };

  const checkAxesPositionDenominatorChange = (
    axes: object[],
    prevAxes: object[],
  ): boolean[] => {
    const isPositionDenominatorChange: boolean[] = [];
    axes.forEach((axis, index) => {
      const axisGain = axis["gain" as keyof typeof axis];
      const prevAxis = prevAxes[index];
      const prevAxisGain = prevAxis["gain" as keyof typeof prevAxis];

      const axisPosition = axisGain["position" as keyof typeof axisGain];
      const prevAxisPosition =
        prevAxisGain["position" as keyof typeof prevAxisGain];

      if (
        axisPosition["denominator" as keyof typeof axisPosition] !==
          prevAxisPosition["denominator" as keyof typeof prevAxisPosition]
      ) {
        isPositionDenominatorChange.push(true);
      } else {
        isPositionDenominatorChange.push(false);
      }
    });
    return isPositionDenominatorChange;
  };

  function calcCurrentP(denominator: number, ls: number) {
    const wcc = 2.0 * Math.PI * (15000.0 / denominator);
    const p = wcc * ls;
    return p;
  }

  function calcCurrentI(denominator: number, rs: number) {
    const wcc = 2.0 * Math.PI * (15000.0 / denominator);
    const i = wcc * rs;
    return i;
  }

  function calcVelocityP(
    denominator: number,
    currentDenominator: number,
    pitch: number,
    mass: number,
    kf: number,
  ): number {
    const wcc = 2.0 * Math.PI * (15000.0 / currentDenominator);
    const radius = pitch / (2.0 * Math.PI);
    const inertia = (mass / 100) * radius * radius;
    const torque_constant = kf * radius;

    const wsc = wcc / denominator;
    const p = (inertia * wsc) / torque_constant;

    return p;
  }

  function calcVelocityI(
    denominator: number,
    denominator_pi: number,
    currentDenominator: number,
    p: number,
  ): number {
    const wcc = 2.0 * Math.PI * (15000.0 / currentDenominator);
    const wsc = wcc / denominator;
    const wpi = wsc / denominator_pi;

    const i = p * wpi;

    return i;
  }

  function calcPositionP(
    currentDenominator: number,
    velocityDenominator: number,
    positionDenominator: number,
  ) {
    const wcc = 2.0 * Math.PI * (15000.0 / currentDenominator);
    const wsc = wcc / velocityDenominator;

    const wpc = wsc / positionDenominator;
    const p = wpc;
    return p;
  }

  function updateAxesArrayCurrentI(
    rs: number,
    axes: object[],
    isAxesChange: boolean[],
  ): object[] {
    const updateAxes = axes.map((axis, index) => {
      if (!isAxesChange[index]) return axis;
      const gain: object = axis["gain" as keyof typeof axis];
      const current = gain["current" as keyof typeof gain];
      const denominator = current["denominator" as keyof typeof current];
      const p = current["p" as keyof typeof current];

      const i = calcCurrentI(denominator, rs);

      return {
        gain: {
          ...gain,
          current: {
            p: p,
            i: isNaN(i) ? "NaN" : i,
            denominator: denominator,
          },
        },
      };
    });
    return updateAxes;
  }

  function updateAxesArrayCurrentP(
    ls: number,
    axes: object[],
    isAxesChange: boolean[],
  ): object[] {
    const updateAxes = axes.map((axis, index) => {
      if (!isAxesChange[index]) return axis;
      const gain: object = axis["gain" as keyof typeof axis];
      const current = gain["current" as keyof typeof gain];
      const denominator = current["denominator" as keyof typeof current];
      const i = current["i" as keyof typeof current];

      const p = calcCurrentP(denominator, ls);
      return {
        gain: {
          ...gain,
          current: {
            p: isNaN(p) ? "NaN" : p,
            i: i,
            denominator: denominator,
          },
        },
      };
    });
    return updateAxes;
  }

  function updateAxesArrayVelocityP(
    pitch: number,
    mass: number,
    kf: number,
    axes: object[],
    isAxesChange: boolean[],
  ): object[] {
    const updateAxes = axes.map((axis, index) => {
      if (!isAxesChange[index]) return axis;
      const gain: object = axis["gain" as keyof typeof axis];
      const velocity = gain["velocity" as keyof typeof gain];

      const denominator = velocity["denominator" as keyof typeof velocity];
      const denominator_pi =
        velocity["denominator_pi" as keyof typeof velocity];
      const i = velocity["i" as keyof typeof velocity];

      const current = gain["current" as keyof typeof gain];
      const currentDenominator = current["denominator" as keyof typeof current];

      const p = calcVelocityP(denominator, currentDenominator, pitch, mass, kf);

      return {
        gain: {
          ...gain,
          velocity: {
            p: isNaN(p) ? "NaN" : p,
            i: i,
            denominator: denominator,
            denominator_pi: denominator_pi,
          },
        },
      };
    });
    return updateAxes;
  }

  function updateAxesArrayVelocityI(
    axes: object[],
    isAxesChange: boolean[],
  ): object[] {
    const updateAxes = axes.map((axis, index) => {
      if (!isAxesChange[index]) return axis;
      const gain: object = axis["gain" as keyof typeof axis];

      const velocity = gain["velocity" as keyof typeof gain];
      const denominator = velocity["denominator" as keyof typeof velocity];
      const denominator_pi =
        velocity["denominator_pi" as keyof typeof velocity];
      const p = velocity["p" as keyof typeof velocity];

      const current = gain["current" as keyof typeof gain];
      const currentDenominator = current["denominator" as keyof typeof current];

      const i = calcVelocityI(
        denominator,
        denominator_pi,
        currentDenominator,
        p,
      );
      return {
        gain: {
          ...gain,
          velocity: {
            p: p,
            i: isNaN(i) ? "NaN" : i,
            denominator: denominator,
            denominator_pi: denominator_pi,
          },
        },
      };
    });
    return updateAxes;
  }

  function updateAxesArrayPosition(
    axes: object[],
    isAxesChange: boolean[],
  ): object[] {
    const updateAxes = axes.map((axis, index) => {
      if (!isAxesChange[index]) return axis;
      const gain: object = axis["gain" as keyof typeof axis];

      const current = gain["current" as keyof typeof gain];
      const currentDenominator = current["denominator" as keyof typeof current];

      const velocity = gain["velocity" as keyof typeof gain];
      const velocityDenominator =
        velocity["denominator" as keyof typeof velocity];

      const position = gain["position" as keyof typeof gain];
      const positionDenominator =
        position["denominator" as keyof typeof position];

      const p = calcPositionP(
        currentDenominator,
        velocityDenominator,
        positionDenominator,
      );

      return {
        gain: {
          ...gain,
          position: {
            p: isNaN(p) ? "NaN" : p,
            denominator: positionDenominator,
          },
        },
      };
    });

    return updateAxes;
  }

  return (
    <div style={{ width: "100%", "margin-bottom": "3rem" }}>
      <Editable.Root
        placeholder="File name"
        defaultValue={props.label ? props.label : "New File"}
        activationMode="dblclick"
        onValueCommit={(e) => {
          props.onLabelChange?.(e.value);
        }}
        fontWeight="bold"
        fontSize="2xl"
      >
        <Editable.Area>
          <Editable.Input width="90%" />
          <Editable.Preview
            width="90%"
            style={{
              "text-overflow": "ellipsis",
              display: "block",
              overflow: "hidden",
              "text-align": "left",
            }}
          />
        </Editable.Area>
      </Editable.Root>
      <IconButton
        onClick={() => props.onCancel?.()}
        variant="ghost"
        borderRadius="1rem"
        width="1rem"
        style={{ position: "absolute", top: "1.5rem", right: "1.5rem" }}
        padding="0"
      >
        <IconX />
      </IconButton>
      <div style={{ "margin-top": "4rem", "margin-bottom": "2rem" }}>
        <ConfigObject
          object={config}
          id_prefix={props.label}
          accordionStatuses={accordionStatuses}
          linkedStatuses={linkedStatuses}
        />
      </div>
    </div>
  );
}

type ConfigObjectProps = JSX.HTMLAttributes<HTMLDivElement> & {
  id_prefix: string;
  object: object;
  onItemChange?: () => void;
  accordionStatuses: AccordionStatuses;
  linkedStatuses: LinkedStatuses;
};

function ConfigObject(props: ConfigObjectProps) {
  const [object, setObject] = createStore(props.object);

  return (
    <div>
      <For each={Object.entries(object)}>
        {(entry) => {
          const key = entry[0];
          const value = entry[1];
          if (value.constructor === Array) {
            if (!props.accordionStatuses.has(key)) {
              props.accordionStatuses.set(key, createSignal<string[]>([]));
            }
            if (!props.linkedStatuses.has(key)) {
              props.linkedStatuses.set(
                key,
                createSignal<[boolean, number]>([false, 0]),
              );
            }
            return (
              <>
                <Stack
                  style={{
                    "border-width": "1px",
                    "padding-right": "1rem",
                    "padding-left": "1rem",
                    "margin-top": "1rem",
                    "border-radius": "0.5rem",
                    "margin-bottom": "0.5rem",
                    "padding-bottom": "0.5rem",
                  }}
                >
                  <ConfigList
                    label={key}
                    items={value}
                    onItemChange={() => props.onItemChange?.()}
                    id_prefix={props.id_prefix}
                    accordionStatuses={props.accordionStatuses}
                    linkedStatuses={props.linkedStatuses}
                  />
                </Stack>
              </>
            );
          }
          if (typeof value === "object") {
            return (
              <fieldset
                style={{
                  "border-width": "1px",
                  padding: "1rem",
                  "padding-top": "0",
                  "margin-bottom": "1rem",
                  "border-radius": "0.5rem",
                  "margin-top": "1rem",
                }}
              >
                <legend>
                  <Text fontWeight="bold" opacity="70%">
                    {`${key[0].toUpperCase()}${
                      Array.from(
                        key.slice(1, key.length),
                      )
                        .map((char, index) => {
                          if (key[index] === "_") {
                            return char.toUpperCase();
                          }
                          return char;
                        })
                        .toString()
                        .replaceAll(",", "")
                    }`}
                  </Text>
                </legend>
                <ConfigObject
                  object={value}
                  id_prefix={props.id_prefix + key}
                  style={{ "padding-left": "1rem" }}
                  onItemChange={() => {
                    props.onItemChange?.();
                  }}
                  accordionStatuses={props.accordionStatuses}
                  linkedStatuses={props.linkedStatuses}
                />
              </fieldset>
            );
          }
          if (typeof value === "boolean") {
            return (
              <Checkbox
                id={props.id_prefix + key}
                checked={object[key as keyof typeof object]}
                onCheckedChange={(e) => {
                  setObject(
                    key as keyof typeof object,
                    // @ts-ignore: TSC unable to handle generic object type
                    // in store
                    e.checked,
                  );
                }}
                marginTop="1rem"
              >
                <Text fontWeight="light" userSelect="none">
                  {key}
                </Text>
              </Checkbox>
            );
          }
          if (typeof value === "number" || value === "NaN") {
            return (
              <Stack
                direction="row"
                width="100%"
                marginTop="1rem"
                marginBottom="0.5rem"
              >
                <Text width="50%" marginTop="0.4rem" fontWeight="light">
                  {key}
                </Text>
                <Input
                  width="50%"
                  placeholder={key}
                  value={object[key as keyof typeof object]}
                  onChange={(e) => {
                    if (isNaN(Number(e.target.value))) {
                      if (e.target.value.toLowerCase() !== "nan") {
                        e.target.value = String(
                          object[key as keyof typeof object],
                        );
                        return;
                      }
                    }
                    setObject(
                      key as keyof typeof object,
                      // @ts-ignore: TSC unable to handle generic object type
                      // in store
                      Number(e.target.value),
                    );
                    props.onItemChange?.();
                  }}
                />
              </Stack>
            );
          }
        }}
      </For>
    </div>
  );
}

type ConfigListProps = Accordion.RootProps & {
  id_prefix: string;
  label: string;
  items: object[];
  onItemChange?: () => void;
  accordionStatuses: AccordionStatuses;
  linkedStatuses: LinkedStatuses;
};

function ConfigList(props: ConfigListProps) {
  const [, rest] = splitProps(props, ["items"]);

  const [items, setItems] = createStore<object[]>(props.items);

  // Store a deep copy string of the most recently edited item object. This is
  // necessary over storing e.g. the item index, as the signal that sets other
  // items to be a copy cannot depend on the `items` store itself. Depending
  // directly on the `items` store will cause an infinite effects loop.
  const [recentEditedItem, setRecentEditedItem] = createSignal<string>("");

  const changedItemIndex = props.linkedStatuses.get(props.label)?.[0]()[1];
  if (changedItemIndex !== undefined) {
    setRecentEditedItem(JSON.stringify(items[changedItemIndex]));
  }

  createEffect(() => {
    if (props.linkedStatuses.get(props.label)?.[0]()[0]) {
      if (recentEditedItem().length === 0) return;
      setItems(
        Array.from(
          { length: items.length },
          () => JSON.parse(recentEditedItem()),
        ),
      );
    }
  });

  // Converts label to have uppercase letters at the start of each word.
  const prettifiedLabel = Array.from(props.label)
    .map((char, i) => {
      if (i === 0) return char.toUpperCase();
      else if (props.label[i - 1] === "_") return char.toUpperCase();
      else return char;
    })
    .toString()
    .replaceAll(",", "");

  return (
    <Accordion.Root
      multiple
      {...rest}
      style={{ "border-bottom": "0", "border-top": "0" }}
      value={props.accordionStatuses.get(props.label)?.[0]()}
      onValueChange={(e) => {
        props.accordionStatuses.get(props.label)?.[1](e.value);
      }}
    >
      <For each={props.items}>
        {(item, index) => {
          const title = props.label + " " + (index() + 1).toString();
          return (
            <Accordion.Item value={title}>
              <Stack direction="row">
                <Tooltip.Root>
                  <Tooltip.Trigger>
                    <IconButton
                      variant="ghost"
                      onClick={() => {
                        const linked = props.linkedStatuses.get(
                          props.label,
                        )?.[0]()[0];

                        props.linkedStatuses.get(props.label)?.[1]([
                          !linked,
                          index(),
                        ]);

                        if (!props.linkedStatuses.get(props.label)?.[0]()) {
                          return;
                        }
                        setRecentEditedItem(JSON.stringify(item));
                      }}
                      marginTop="0.5rem"
                    >
                      <Show
                        when={props.linkedStatuses.get(props.label)?.[0]()[0]}
                        fallback={<IconLinkOff />}
                      >
                        <IconLink />
                      </Show>
                    </IconButton>
                  </Tooltip.Trigger>

                  <Tooltip.Positioner>
                    <Tooltip.Content backgroundColor="bg.default">
                      <Text color="fg.default">
                        Link {`${prettifiedLabel}`}
                      </Text>
                    </Tooltip.Content>
                  </Tooltip.Positioner>
                </Tooltip.Root>
                <Accordion.ItemTrigger>
                  <Text fontWeight="bold" size="md" opacity="70%">
                    {`${title[0].toUpperCase()}${
                      Array.from(
                        title.slice(1, title.length),
                      )
                        .map((char, index) => {
                          if (title[index] === "_") {
                            return char.toUpperCase();
                          }
                          return char;
                        })
                        .toString()
                        .replaceAll(",", "")
                    }`}
                  </Text>
                  <Accordion.ItemIndicator>
                    <IconChevronDown />
                  </Accordion.ItemIndicator>
                </Accordion.ItemTrigger>
              </Stack>
              <Accordion.ItemContent padding="0">
                <ConfigObject
                  object={item}
                  id_prefix={props.id_prefix + title}
                  onItemChange={() => {
                    setRecentEditedItem(JSON.stringify(item));
                    props.onItemChange?.();
                    const linked = props.linkedStatuses.get(
                      props.label,
                    )?.[0]()[0];
                    if (linked) {
                      props.linkedStatuses.get(props.label)?.[1]([
                        linked,
                        index(),
                      ]);
                    }
                  }}
                  accordionStatuses={props.accordionStatuses}
                  linkedStatuses={props.linkedStatuses}
                />
              </Accordion.ItemContent>
            </Accordion.Item>
          );
        }}
      </For>
    </Accordion.Root>
  );
}
