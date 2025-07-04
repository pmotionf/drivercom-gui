import { useContext } from "solid-js";
import { LineContext } from "./Line.tsx";
import { Stack } from "styled-system/jsx";
import { For } from "solid-js/web";
import { createContext } from "solid-js";
import { AxesInfo, CarrierInfo } from "./Axes.tsx";
import { JSX } from "solid-js";

export const AxesContext = createContext<{
  axes: AxesInfo;
  id: string;
  carrierInfo?: CarrierInfo;
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
          return (
            <AxesContext.Provider
              value={{
                axes: info,
                id: `${stationId}:${stationContext.id * 3 + axesIndex() + 1}`,
                carrierInfo:
                  stationContext.carrierInfo &&
                  info.carrierId &&
                  stationContext.carrierInfo.get(info.carrierId!)
                    ? stationContext.carrierInfo.get(info.carrierId!)
                    : undefined,
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
