import { createEffect, on, useContext, createContext, JSX } from "solid-js";
import { useLineContext } from "./Line.tsx";
import { Stack } from "styled-system/jsx";
import { For } from "solid-js/web";
//@ts-ignore Ignore test in git action
import { mmc } from "../proto/mmc";
import { Store, createStore } from "solid-js/store";

export const AxesContext = createContext<{
  id: string;
  axisInfo: Store<mmc.info.Response.System.Axis.IInfo>;
  axisError: Store<mmc.info.Response.System.Axis.IError>;
  carrierInfo: Store<mmc.info.Response.System.Carrier.IInfo>;
}>();

export const useAxesContext = () => {
  return useContext(AxesContext);
};

export type StationProps = JSX.HTMLAttributes<HTMLDivElement>;

export function Station(props: StationProps) {
  const stationCtx = useLineContext()!;
  if (!stationCtx) return;

  const stationId = crypto.randomUUID();

  return (
    <Stack
      id={stationId}
      marginBottom="1rem"
      direction="row"
      gap="0.5rem"
      borderRadius="0.2rem"
      padding="0.5rem"
      borderWidth="1px"
    >
      <For
        each={Array.from(
          { length: 3 },
          (_, i) => stationCtx.stationIndex * 3 + i,
        )}
      >
        {(axisIndex) => {
          const axisId = axisIndex + 1;

          const [axisInfo, setAxisInfo] = createStore(
            {} as mmc.info.Response.System.Axis.IInfo,
          );
          createEffect(
            on(
              () => stationCtx.system.axisInfos![axisIndex],
              () => {
                if (stationCtx.system.axisInfos![axisIndex]) {
                  const newAxis = stationCtx.system.axisInfos![axisIndex];
                  if (axisInfo.carrierId !== newAxis.carrierId) {
                    setAxisInfo("carrierId", newAxis.carrierId);
                  }

                  if (axisInfo.hallAlarm !== newAxis.hallAlarm) {
                    setAxisInfo("hallAlarm", newAxis.hallAlarm);
                  }

                  if (axisInfo.waitingPull !== newAxis.waitingPull) {
                    setAxisInfo("waitingPull", newAxis.waitingPull);
                  }

                  if (axisInfo.waitingPush !== newAxis.waitingPush) {
                    setAxisInfo("waitingPush", newAxis.waitingPush);
                  }

                  if (axisInfo.motorEnabled !== newAxis.motorEnabled) {
                    setAxisInfo("motorEnabled", newAxis.motorEnabled);
                  }
                }
              },
              { defer: true },
            ),
          );

          const [axisError, setAxisError] = createStore(
            {} as mmc.info.Response.System.Axis.IError,
          );
          createEffect(
            on(
              () => stationCtx.system.axisErrors![axisIndex],
              () => {
                if (stationCtx.system.axisErrors![axisIndex]) {
                  const newError = stationCtx.system.axisErrors![axisIndex];
                  if (axisError.overcurrent !== newError.overcurrent) {
                    setAxisError("overcurrent", newError.overcurrent);
                  }
                }
              },
              { defer: true },
            ),
          );

          const [carrierInfo, setCarrierInfo] =
            createStore<mmc.info.Response.System.Carrier.IInfo>(
              {} as mmc.info.Response.System.Carrier.IInfo,
            );
          createEffect(
            on(
              () => stationCtx.system.carrierInfos,
              () => {
                if (
                  stationCtx.system.carrierInfos &&
                  stationCtx.system.carrierInfos!.length > 0
                ) {
                  const parseCarrierInfo =
                    stationCtx.system.carrierInfos!.filter(
                      //@ts-ignore Ignore test in git action
                      (info) => info.axis!.main === axisId,
                    );
                  if (parseCarrierInfo.length === 1) {
                    setCarrierInfo(parseCarrierInfo[0]);
                  } else {
                    setCarrierInfo(
                      {} as mmc.info.Response.System.Carrier.IInfo,
                    );
                  }
                } else {
                  setCarrierInfo({} as mmc.info.Response.System.Carrier.IInfo);
                }
              },
              { defer: true },
            ),
          );
          return (
            <AxesContext.Provider
              value={{
                id: `${stationId}:${axisId}`,
                axisInfo: axisInfo,
                axisError: axisError,
                carrierInfo: carrierInfo,
              }}
            >
              {props.children}
            </AxesContext.Provider>
          );
        }}
      </For>
    </Stack>
  );
}
