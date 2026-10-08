import { Accessor, createEffect, JSX, on, Setter, Show } from "solid-js";
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
  focusedTab?: string;
  onFocustTabChange?: (tabId: string) => void;
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

  return (
    <div style={{ width: "100%", height: `100%` }}>
      <Show when={props.focusedTab === `${props.id}.tune`}>
        <ConfigFormTabPage
          id={`${props.id}.tune`}
          format={configTabForm().tune}
          config={config}
          originalFile={props.originalFile}
          description={props.description}
          unitChange={props.changeUnits}
          accordionStatuses={props.accordionStatuses}
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
          formOverflowY={props.formOverflowY}
        />
      </Show>
    </div>
  );
}
