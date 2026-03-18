import {
  Accessor,
  createEffect,
  createSignal,
  JSX,
  on,
  Setter,
  Show,
} from "solid-js";
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
import JSON5 from "json5";
import { trackStore } from "@solid-primitives/deep";
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
  focusedTab?: string;
  onFocustTabChange?: (tabId: string) => void;
  accordionStatuses: AccordionStates;
  linkedStatuses: LinkStates;
  gainLockStatuses: GainLockStates;
  formOverflowY: Map<string, number>;
};

export function ConfigForm(props: ConfigFormProps) {
  const [config, setConfig] = createStore<ConfigType>(props.config);

  const dynamic: ("center" | "between")[] = ["center", "between"];
  // Calculate gain automatically.
  dynamic.forEach((dynPos) => {
    // Current P
    createEffect(
      on(
        [
          () => config.axis[dynPos].gain.current.denominator,
          () => config.coil.ls,
        ],
        () => {
          if (
            props.linkedStatuses.get("gain")![0]()[0] &&
            props.linkedStatuses.get("gain")![0]()[1] !== dynPos
          )
            return;
          if (
            props.gainLockStatuses.get(
              `${props.id}.tune.axis.${dynPos}.gain.current.p`,
            )![0]()
          )
            return;
          const p = calcCurrentP(
            config.axis[dynPos].gain.current.denominator,
            config.coil.ls,
          );
          setConfig("axis", dynPos, "gain", "current", "p", p);
        },
        { defer: true },
      ),
    );

    // Current I
    createEffect(
      on(
        [
          () => config.axis[dynPos].gain.current.denominator,
          () => config.coil.rs,
        ],
        () => {
          if (
            props.linkedStatuses.get("gain")![0]()[0] &&
            props.linkedStatuses.get("gain")![0]()[1] !== dynPos
          )
            return;
          if (
            props.gainLockStatuses.get(
              `${props.id}.tune.axis.${dynPos}.gain.current.i`,
            )![0]()
          )
            return;

          const i = calcCurrentI(
            config.axis[dynPos].gain.current.denominator,
            config.coil.rs,
          );
          setConfig("axis", dynPos, "gain", "current", "i", i);
        },
        { defer: true },
      ),
    );

    // Velocity P
    createEffect(
      on(
        [
          () => config.axis[dynPos].gain.velocity.denominator,
          () => config.axis[dynPos].gain.current.p,
          () => config.coil[dynPos].kf,
          () => config.carrier.mass,
          () => config.magnet.pitch,
        ],
        () => {
          if (
            props.linkedStatuses.get("gain")![0]()[0] &&
            props.linkedStatuses.get("gain")![0]()[1] !== dynPos
          )
            return;
          if (
            props.gainLockStatuses.get(
              `${props.id}.tune.axis.${dynPos}.gain.velocity.p`,
            )![0]()
          )
            return;

          const wcc = calcWcc(
            config.axis[dynPos].gain.current.p,
            config.coil.ls,
          );
          const p = calcVelocityP(
            config.axis[dynPos].gain.velocity.denominator,
            wcc,
            config.magnet.pitch,
            config.carrier.mass,
            config.coil[dynPos].kf,
          );
          setConfig("axis", dynPos, "gain", "velocity", "p", p);
        },
        { defer: true },
      ),
    );

    // Velocity I
    createEffect(
      on(
        [
          () => config.axis[dynPos].gain.velocity.denominator,
          () => config.axis[dynPos].gain.velocity.denominator_pi,
          () => config.axis[dynPos].gain.current.denominator,
          () => config.axis[dynPos].gain.velocity.p,
        ],
        () => {
          if (
            props.linkedStatuses.get("gain")![0]()[0] &&
            props.linkedStatuses.get("gain")![0]()[1] !== dynPos
          )
            return;
          if (
            props.gainLockStatuses.get(
              `${props.id}.tune.axis.${dynPos}.gain.velocity.i`,
            )![0]()
          )
            return;
          const i = calcVelocityI(
            config.axis[dynPos].gain.velocity.denominator,
            config.axis[dynPos].gain.velocity.denominator_pi,
            config.axis[dynPos].gain.current.denominator,
            config.axis[dynPos].gain.velocity.p,
          );
          setConfig("axis", dynPos, "gain", "velocity", "i", i);
        },
        { defer: true },
      ),
    );

    // Position P
    createEffect(
      on(
        [
          () => config.axis[dynPos].gain.position.denominator,
          () => config.axis[dynPos].gain.velocity.p,
        ],
        () => {
          if (
            props.linkedStatuses.get("gain")![0]()[0] &&
            props.linkedStatuses.get("gain")![0]()[1] !== dynPos
          )
            return;
          if (
            props.gainLockStatuses.get(
              `${props.id}.tune.axis.${dynPos}.gain.position.p`,
            )![0]()
          )
            return;

          const wsc = calcWsc(
            config.axis[dynPos].gain.velocity.p,
            config.magnet.pitch,
            config.carrier.mass,
            config.coil[dynPos].kf,
          );
          const p = calcPositionP(
            wsc,
            config.axis[dynPos].gain.position.denominator,
          );
          setConfig("axis", dynPos, "gain", "position", "p", p);
        },
        { defer: true },
      ),
    );

    // Link Coil
    createEffect(
      on(
        [() => config.coil[dynPos].kf],
        () => {
          const linkKey = Object.keys(config.coil[dynPos]).join(",");
          if (
            !props.linkedStatuses.get(linkKey)![0]()[0] ||
            props.linkedStatuses.get(linkKey)![0]()[1] !== dynPos
          )
            return;
          const oppositeDynPos = dynPos === "center" ? "between" : "center";
          setConfig("coil", oppositeDynPos, "kf", config.coil[dynPos].kf);
        },
        { defer: true },
      ),
    );

    // Link Gain
    createEffect(
      on(
        [() => trackStore(config.axis[dynPos])],
        () => {
          const linkKey = Object.keys(config.axis[dynPos]).join(",");
          if (
            !props.linkedStatuses.get(linkKey)![0]()[0] ||
            props.linkedStatuses.get(linkKey)![0]()[1] !== dynPos
          )
            return;
          const oppositeDynPos = dynPos === "center" ? "between" : "center";
          const copyObject = JSON5.parse(JSON5.stringify(config.axis[dynPos]));
          setConfig("axis", oppositeDynPos, copyObject);
          setRender(false);
          setTimeout(() => {
            setRender(true);
          }, 0);
        },
        { defer: true },
      ),
    );
  });

  const hallSensorIds = Array.from(
    { length: props.config.hall_sensors.length },
    (_, i) => i,
  );
  hallSensorIds.forEach((hallSensorId) => {
    createEffect(
      on(
        () => trackStore(config.hall_sensors[hallSensorId]),
        () => {
          const linkKey = Object.keys(config.hall_sensors[hallSensorId]).join(
            ",",
          );
          if (!props.linkedStatuses.has(linkKey)) return;
          if (
            !props.linkedStatuses.get(linkKey)![0]()[0] ||
            props.linkedStatuses.get(linkKey)![0]()[1] !==
              hallSensorId.toString()
          )
            return;

          const parseHallSensorIds = hallSensorIds.filter(
            (id) => id !== hallSensorId,
          );
          const copyObject = JSON5.parse(
            JSON5.stringify(config.hall_sensors[hallSensorId]),
          );
          parseHallSensorIds.forEach((hall_id) =>
            setConfig("hall_sensors", hall_id, copyObject),
          );
          setRender(false);
          setTimeout(() => {
            setRender(true);
          }, 0);
        },
        { defer: true },
      ),
    );
  });

  const [render, setRender] = createSignal<boolean>(true);
  return (
    <div style={{ width: "100%", height: `100%` }}>
      <Show when={render()}>
        <Show when={props.focusedTab === `${props.id}.tune`}>
          <ConfigFormTabPage
            id={`${props.id}.tune`}
            format={configTabForm().tune}
            config={config}
            originalFile={props.originalFile}
            description={props.description}
            unitChange={props.changeUnits}
            accordionStatuses={props.accordionStatuses}
            gainLockStatuses={props.gainLockStatuses}
            linkedStatuses={props.linkedStatuses}
            formOverflowY={props.formOverflowY}
          />
        </Show>
        <Show when={props.focusedTab === `${props.id}.calibration`}>
          <ConfigFormTabPage
            id={`${props.id}.calibration`}
            format={configTabForm().calibration}
            config={config}
            originalFile={props.originalFile}
            description={props.description}
            unitChange={props.changeUnits}
            accordionStatuses={props.accordionStatuses}
            linkedStatuses={props.linkedStatuses}
            formOverflowY={props.formOverflowY}
          />
        </Show>
        <Show when={props.focusedTab === `${props.id}.system`}>
          <ConfigFormTabPage
            id={`${props.id}.system`}
            format={configTabForm().system}
            config={config}
            originalFile={props.originalFile}
            description={props.description}
            unitChange={props.changeUnits}
            accordionStatuses={props.accordionStatuses}
            linkedStatuses={props.linkedStatuses}
            formOverflowY={props.formOverflowY}
          />
        </Show>
      </Show>
    </div>
  );
}
