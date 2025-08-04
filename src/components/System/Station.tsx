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
          return (
            <AxesContext.Provider
              value={{
                axes: info,
                id: `${stationId}:${stationContext.id * 3 + axesIndex() + 1}`,
                carrierInfo: stationContext.carrierInfo
                  ? stationContext.carrierInfo.filter(
                      (carrier) =>
                        carrier.axis ===
                        stationContext.id * 3 + axesIndex() + 1,
                    )[0]
                  : {},
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
