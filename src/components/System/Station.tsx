import { useContext } from "solid-js";
import { LineContext } from "./Line.tsx";
import { Stack } from "styled-system/jsx";
import { For } from "solid-js/web";
import { createContext } from "solid-js";
import { JSX } from "solid-js";
//@ts-ignore Ignore test in git action
import { mmc } from "../proto/mmc.js";

export const AxesContext = createContext<{
  id: string;
  axes: mmc.info.Response.System.Axis.IInfo;
  axesErrors: mmc.info.Response.System.Axis.IError;
  carrierInfo?: mmc.info.Response.System.Carrier.IInfo;
}>();

export type StationProps = JSX.HTMLAttributes<HTMLDivElement>;

export function Station(props: StationProps) {
  const stationContext = useContext(LineContext);
  if (!stationContext) return;

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
      <For each={stationContext.axes}>
        {(info, axesIndex) => {
          const axisId = stationContext.id * 3 + axesIndex() + 1;
          let currentCarrier:
            | mmc.info.Response.System.Carrier.IInfo
            | undefined = undefined;

          if (
            stationContext.carrierInfo &&
            stationContext.carrierInfo.length > 0
          ) {
            const findCarrier = stationContext.carrierInfo.filter(
              (carrier) => carrier.axis!.main === axisId,
            );
            if (findCarrier.length === 1) {
              currentCarrier = findCarrier[0];
            }
          }
          return (
            <AxesContext.Provider
              value={{
                axes: info,
                id: `${stationId}:${axisId}`,
                carrierInfo: currentCarrier,
                axesErrors: stationContext.axesErrors[axesIndex()],
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
