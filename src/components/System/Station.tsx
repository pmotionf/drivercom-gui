import { useContext } from "solid-js";
import { LineContext } from "./Line.tsx";
import { Stack } from "styled-system/jsx";
import { For } from "solid-js/web";
import { createEffect } from "solid-js";
import { createContext } from "solid-js";
import { createStore } from "solid-js/store";
import { AxesInfo } from "./Axes.tsx";
import { JSX } from "solid-js";

export const AxesContext = createContext<AxesInfo>();

export type StationProps = JSX.HTMLAttributes<HTMLDivElement> & {
  id: string;
};

export function Station(props: StationProps) {
  const stationContext = useContext(LineContext);
  if (!stationContext) return;

  return (
    <Stack
      width="29rem"
      height="10rem"
      marginBottom="1rem"
      direction="row"
      gap="0.5rem"
      borderRadius="0.2rem"
      padding="0.5rem"
      paddingBottom="1rem"
      borderWidth="1px"
      backgroundColor="bg.muted"
    >
      <For each={stationContext}>
        {(info) => {
          const [axesInfo, setAxesInfo] = createStore<AxesInfo>();
          createEffect(() => {
            if (info) {
              setAxesInfo(info);
            }
          });
          return (
            <AxesContext.Provider value={axesInfo}>
              {props.children}
            </AxesContext.Provider>
          );
        }}
      </For>
    </Stack>
  );
}
