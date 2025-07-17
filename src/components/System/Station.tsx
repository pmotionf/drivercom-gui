import { useContext } from "solid-js";
import { LineContext } from "./Line.tsx";
import { Stack } from "styled-system/jsx";
import { For } from "solid-js/web";
import { createContext } from "solid-js";
import { JSX } from "solid-js";
//@ts-ignore Ignore test in git action
import { mmc } from "../proto/mmc.js";

export const AxesContext = createContext<{
  axes: mmc.info.Response.Axes.IAxis;
  id: string;
  carrierInfo?: mmc.info.Response.ICarrier;
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
          let carrier: mmc.info.Response.ICarrier | undefined = undefined;
          if (info.carrierId) {
            const carrierCtx = stationContext.carrierInfo!.get(info.carrierId);
            if (carrierCtx) {
              carrier = carrierCtx;
            }
          }
          return (
            <AxesContext.Provider
              value={{
                axes: info,
                id: `${stationId}:${stationContext.id * 3 + axesIndex() + 1}`,
                carrierInfo: carrier,
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
