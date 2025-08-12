import { createEffect, JSX, on, useContext, createContext } from "solid-js";
import { For, Show } from "solid-js/web";
import { Accordion } from "../ui/accordion.tsx";
import { ChevronDownIcon } from "lucide-solid";
import { Stack } from "styled-system/jsx/stack";
//@ts-ignore Ignore test in git action
import { mmc } from "../proto/mmc";
import { createStore, Store } from "solid-js/store";

export type LineProps = JSX.HTMLAttributes<HTMLDivElement> & {
  line: mmc.core.Response.LineConfig.ILine;
  system?: mmc.info.Response.ISystem;
};

export const LineContext = createContext<{
  stationIndex: number;
  system: Store<mmc.info.Response.ISystem>;
}>();

export function useLineContext() {
  return useContext(LineContext);
}

export function Line(props: LineProps) {
  const systemStore = createStore(
    props.system ? props.system : ({} as mmc.info.Response.ISystem),
  );

  createEffect(
    on(
      () => props.system?.axisInfos,
      () => {
        if (props.system && props.system.axisInfos) {
          systemStore[1]("axisInfos", props.system.axisInfos);
        }
      },
      { defer: true },
    ),
  );

  createEffect(
    on(
      () => props.system?.axisErrors,
      () => {
        if (props.system && props.system.axisErrors) {
          systemStore[1]("axisErrors", props.system.axisErrors);
        }
      },
      { defer: true },
    ),
  );

  createEffect(
    on(
      () => props.system?.carrierInfos,
      () => {
        if (props.system && props.system.carrierInfos) {
          systemStore[1]("carrierInfos", props.system.carrierInfos);
        }
      },
      { defer: true },
    ),
  );

  return (
    <Accordion.Item
      value={props.line.name!}
      backgroundColor="bg.canvas"
      borderBottomWidth="1px"
    >
      <Accordion.ItemTrigger
        padding="0.6rem"
        paddingLeft="1rem"
        paddingRight="1rem"
      >
        {props.line.name}
        <Accordion.ItemIndicator class="cancel">
          <ChevronDownIcon />
        </Accordion.ItemIndicator>
      </Accordion.ItemTrigger>
      <Accordion.ItemContent
        padding="0.5rem"
        paddingLeft="1rem"
        paddingRight="1rem"
      >
        <Stack
          width="100%"
          height="100%"
          direction="row"
          overflowX="auto"
          gap="1rem"
        >
          <Show when={props.system && props.system.axisInfos}>
            <For
              each={Array.from({ length: props.line.axes! / 3 }, (_, i) => i)}
            >
              {(stationIndex) => (
                <LineContext.Provider
                  value={{ stationIndex: stationIndex, system: systemStore[0] }}
                >
                  {props.children}
                </LineContext.Provider>
              )}
            </For>
          </Show>
        </Stack>
      </Accordion.ItemContent>
    </Accordion.Item>
  );
}
