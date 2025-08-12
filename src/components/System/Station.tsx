import { useContext, createContext, JSX } from "solid-js";
import { useLineContext } from "./Line.tsx";
import { Stack } from "styled-system/jsx";
import { For } from "solid-js/web";

export const AxesContext = createContext<{
  id: string;
}>();

export const useAxesContext = () => {
  return useContext(AxesContext);
};

export type StationProps = JSX.HTMLAttributes<HTMLDivElement>;

export function Station(props: StationProps) {
  const lineCtx = useLineContext()!;
  if (!lineCtx) return;
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
        each={Array.from({ length: 3 }, (_, i) => lineCtx.stationIndex * 3 + i)}
      >
        {(axisIndex) => {
          const axisId = axisIndex + 1;
          return (
            <AxesContext.Provider
              value={{
                id: `${stationId}:${axisId}`,
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
