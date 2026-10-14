import { Accessor, createEffect, createMemo, JSX, on, Setter } from "solid-js";
import { ConfigTuneType } from "src-tauri/generated/config/ConfigTune";
import { ConfigSystemType } from "src-tauri/generated/config/ConfigSystem";
import { ConfigCalibrationType } from "src-tauri/generated/config/ConfigCalibration";
import { configTabForm } from "~/store/GlobalState";
import { createStore } from "solid-js/store";
import { ConfigType } from "src-tauri/generated/config/ConfigType";

import {
  calcCurrentI,
  calcCurrentP,
  calcPositionP,
  calcVelocityI,
  calcVelocityP,
  calcWcc,
  calcWsc,
} from "../../../utils/GainCalculation";
import { ConfigFormTabPage } from "./ConfigFormTabPage";

export type AccordionStates = Map<string, string[]>;

export type LinkStates = Map<
  string,
  [Accessor<[boolean, string]>, Setter<[boolean, string]>]
>;

export type GainLockStates = Map<string, [Accessor<boolean>, Setter<boolean>]>;

export type ConfigFormatType = {
  tune: ConfigTuneType;
  system: ConfigSystemType;
  calibration: ConfigCalibrationType;
};

export type ConfigFormProps = JSX.HTMLAttributes<HTMLFormElement> & {
  id: string;
  config: ConfigType;
  originalFile?: ConfigType;
  description?: object;
  changeUnits?: boolean;
  focusedObjectKey?: string;
  accordionStatuses: AccordionStates;
  linkedStatuses: LinkStates;
  gainLockStatuses: GainLockStates;
  formOverflowY: Map<string, number>;
};

// A custom form component adpated to configuration format.
export function ConfigForm(props: ConfigFormProps) {
  const [config, setConfig] = createStore<ConfigType>(props.config);

  const dynamic = Array.from({ length: config.axes.length }, (_, i) => i);
  // Calculate gain automatically.
  dynamic.forEach((dynPos) => {
    // Current P
    createEffect(
      on(
        [
          () => config.axes[dynPos].gain.current.denominator,
          () => config.axes[dynPos].ls,
        ],
        () => {
          const p = calcCurrentP(
            config.axes[dynPos].gain.current.denominator,
            config.axes[dynPos].ls,
          );
          setConfig("axes", dynPos, "gain", "current", "p", p);
        },
        { defer: true },
      ),
    );

    // Current I
    createEffect(
      on(
        [
          () => config.axes[dynPos].gain.current.denominator,
          () => config.axes[dynPos].rs,
        ],
        () => {
          const i = calcCurrentI(
            config.axes[dynPos].gain.current.denominator,
            config.axes[dynPos].rs,
          );
          setConfig("axes", dynPos, "gain", "current", "i", i);
        },
        { defer: true },
      ),
    );

    // Velocity P
    createEffect(
      on(
        [
          () => config.axes[dynPos].gain.speed.denominator,
          () => config.axes[dynPos].gain.current.p,
          () => config.axes[dynPos].kf,
          () => config.line.slider.mass,
          () => config.line.magnet_pitch,
        ],
        () => {
          const wcc = calcWcc(
            config.axes[dynPos].gain.current.p,
            config.axes[dynPos].ls,
          );
          const p = calcVelocityP(
            config.axes[dynPos].gain.speed.denominator,
            wcc,
            config.line.magnet_pitch,
            config.line.slider.mass,
            config.axes[dynPos].kf,
          );
          setConfig("axes", dynPos, "gain", "speed", "p", p);
        },
        { defer: true },
      ),
    );

    // Velocity I
    createEffect(
      on(
        [
          () => config.axes[dynPos].gain.speed.denominator,
          () => config.axes[dynPos].gain.speed.denominator_pi,
          () => config.axes[dynPos].gain.current.denominator,
          () => config.axes[dynPos].gain.speed.p,
        ],
        () => {
          const i = calcVelocityI(
            config.axes[dynPos].gain.speed.denominator,
            config.axes[dynPos].gain.speed.denominator_pi,
            config.axes[dynPos].gain.current.denominator,
            config.axes[dynPos].gain.speed.p,
          );
          setConfig("axes", dynPos, "gain", "speed", "i", i);
        },
        { defer: true },
      ),
    );

    // Position P
    createEffect(
      on(
        [
          () => config.axes[dynPos].gain.position.denominator,
          () => config.axes[dynPos].gain.speed.p,
        ],
        () => {
          const wsc = calcWsc(
            config.axes[dynPos].gain.speed.p,
            config.line.magnet_pitch,
            config.line.slider.mass,
            config.axes[dynPos].kf,
          );
          const p = calcPositionP(
            wsc,
            config.axes[dynPos].gain.position.denominator,
          );
          setConfig("axes", dynPos, "gain", "position", "p", p);
        },
        { defer: true },
      ),
    );
  });

  const findFormat = (focusId: string, format: object) => {
    if (!focusId.includes("/")) {
      const objectFieldFocusId = focusId.includes("$")
        ? focusId.split("$")[0]
        : focusId;
      if (Object.hasOwn(format, objectFieldFocusId))
        return format[objectFieldFocusId as keyof typeof format];
      else return format;
    } else {
      const filterNoneObjectKey = focusId.includes("$")
        ? focusId.split("$")[0]
        : focusId;
      const objectKeys = filterNoneObjectKey.split("/");
      if (objectKeys.length > 1) {
        let obj: object = format;
        for (let i = 0; i < objectKeys.length; i++) {
          const currentId = objectKeys[i];
          if (!Object.hasOwn(obj, currentId)) {
            continue;
          }
          const value = obj[currentId as keyof typeof obj];
          if (typeof value !== "object") {
            break;
          } else {
            obj = value;
          }
        }
        return obj;
      } else {
        return format;
      }
    }
  };

  // Refresh every time when focused part is different.
  const showConfigurationForm = createMemo(
    on(
      () => props.focusedObjectKey,
      () => (
        <ConfigFormTabPage
          id={`${props.id}`}
          focusFieldKey={
            props.focusedObjectKey && props.focusedObjectKey.includes("$")
              ? props.focusedObjectKey.split("$")[1]
              : undefined
          }
          format={findFormat(props.focusedObjectKey!, configTabForm())}
          config={findFormat(props.focusedObjectKey!, config)}
          originalFile={
            typeof props.originalFile === "object"
              ? findFormat(props.focusedObjectKey!, props.originalFile)
              : props.originalFile
          }
          description={props.description}
          unitChange={props.changeUnits}
          accordionStatuses={props.accordionStatuses}
          formOverflowY={props.formOverflowY}
        />
      ),
    ),
  );

  return (
    <div style={{ width: "100%", height: `100%` }}>
      {showConfigurationForm()}
    </div>
  );
}
