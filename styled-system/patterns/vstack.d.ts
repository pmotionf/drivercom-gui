/* eslint-disable */
import type { ConditionalValue, SystemStyleObject } from "../types/index";
import type { Properties } from "../types/csstype";
import type { SystemProperties } from "../types/style-props";
import type { DistributiveOmit } from "../types/system-types";
import type { Tokens } from "../tokens/index";

export interface VstackProperties {
  justify?: SystemProperties["justifyContent"];
  gap?: SystemProperties["gap"];
}

interface VstackStyles
  extends
    VstackProperties,
    DistributiveOmit<SystemStyleObject, keyof VstackProperties> {}

interface VstackPatternFn {
  (styles?: VstackStyles): string;
  raw: (styles?: VstackStyles) => SystemStyleObject;
}

export declare const vstack: VstackPatternFn;
