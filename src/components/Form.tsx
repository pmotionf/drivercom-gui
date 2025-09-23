import { Accessor, For, Setter, createSignal } from "solid-js";
import { Stack } from "styled-system/jsx";

type AccordionStore = Map<string, [Accessor<string[]>, Setter<string[]>]>;

type LinkedStore = Map<
  string,
  [Accessor<[boolean, number]>, Setter<[boolean, number]>]
>;

export type FormProps = {
  id: string;
  label: string;
  form: object;
  accordionStore: AccordionStore;
};

const Form = (props: FormProps) => {
  const accordionStore: AccordionStore = new Map();
  const linkedStore: LinkedStore = new Map();

  return (
    <For each={Object.entries(props.form)}>
      {([key, value]) => {
        if (value.constructor === Array) {
          if (!accordionStore.has(key)) {
            accordionStore.set(key, createSignal<string[]>([]));
          }

          if (!linkedStore.has(key)) {
            linkedStore.set(key, createSignal<[boolean, number]>([false, 0]));
          }

          return (
            <>
              <Stack></Stack>
            </>
          );
        }
      }}
    </For>
  );
};

type FormListProps = {
  id: string;
  items: object[];
  id_prefix: string;
  accordionStore: [Accessor<string[]>, Setter<string[]>];
};

const FormList = (props: FormListProps) => {};
