import { Accordion } from "../ui/accordion";
import { LinkedStatuses, GainLockStatuses } from "../ConfigForm";
import { AccordionStatuses, Form } from "../Form";
import {
  splitProps,
  createSignal,
  on,
  createEffect,
  For,
  Show,
} from "solid-js";
import { Stack } from "styled-system/jsx";
import { Tooltip } from "../ui/tooltip";
import { createStore } from "solid-js/store";
import { IconButton } from "../ui/icon-button";
import { IconLink, IconLinkOff, IconChevronDown } from "@tabler/icons-solidjs";
import { Text } from "../ui/text";

export type FormListProps = Accordion.RootProps & {
  id_prefix: string;
  label: string;
  items: object[];
  onItemChange?: () => void;
  accordionStatuses: AccordionStatuses;
  linkedStatuses: LinkedStatuses;
  gainLockStatuses: GainLockStatuses;
  gainKinds: string[];
};

export function FormList(props: FormListProps) {
  const [, rest] = splitProps(props, ["items"]);

  const [items, setItems] = createStore<object[]>(props.items);

  // Store a deep copy string of the most recently edited item object. This is
  // necessary over storing e.g. the item index, as the signal that sets other
  // items to be a copy cannot depend on the `items` store itself. Depending
  // directly on the `items` store will cause an infinite effects loop.
  const [recentEditedItem, setRecentEditedItem] = createSignal<string>("");

  const changedItemIndex = props.linkedStatuses.get(props.label)?.[0]()[1];
  if (changedItemIndex !== undefined) {
    setRecentEditedItem(JSON.stringify(items[changedItemIndex]));
  }

  createEffect(
    on(
      () => JSON.stringify(items),
      () => {
        if (
          props.linkedStatuses.get(props.label) &&
          props.linkedStatuses.get(props.label)?.[0]()[1]
        ) {
          const index = props.linkedStatuses.get(props.label)![0]()[1];
          setRecentEditedItem(JSON.stringify(items[index]));
        }
      },
      { defer: true },
    ),
  );

  createEffect(
    on(
      [
        () => recentEditedItem(),
        () => props.linkedStatuses.get(props.label)?.[0]()[0],
      ],
      () => {
        if (!Array.isArray(items)) return;
        if (props.linkedStatuses.get(props.label)?.[0]()[0]) {
          items.forEach((_, index) => {
            const item = JSON.parse(recentEditedItem().replaceAll("null", "0"));
            if (index === props.linkedStatuses.get(props.label)?.[0]()[1]) {
              return;
            }
            setItems(index, item);
          });
        }
      },
      { defer: true },
    ),
  );

  // Converts label to have uppercase letters at the start of each word.
  const prettifiedLabel = Array.from(props.label)
    .map((char, i) => {
      if (i === 0) return char.toUpperCase();
      else if (props.label[i - 1] === "_") return char.toUpperCase();
      else return char;
    })
    .toString()
    .replaceAll(",", "");

  return (
    <Accordion.Root
      style={{ "border-width": "0" }}
      multiple
      {...rest}
      value={props.accordionStatuses.get(props.label)?.[0]()}
      onValueChange={(e) => {
        props.accordionStatuses.get(props.label)?.[1](e.value);
      }}
    >
      <For each={props.items}>
        {(item, index) => {
          const title = props.label + " " + (index() + 1).toString();
          return (
            <Accordion.Item value={title}>
              <Stack direction="row">
                <Tooltip.Root>
                  <Tooltip.Trigger>
                    <IconButton
                      variant="ghost"
                      onClick={() => {
                        const linked = props.linkedStatuses.get(
                          props.label,
                        )?.[0]()[0];

                        props.linkedStatuses.get(props.label)?.[1]([
                          !linked,
                          index(),
                        ]);
                        setRecentEditedItem(JSON.stringify(item));
                      }}
                      marginTop="0.5rem"
                    >
                      <Show
                        when={props.linkedStatuses.get(props.label)?.[0]()[0]}
                        fallback={<IconLinkOff />}
                      >
                        <IconLink />
                      </Show>
                    </IconButton>
                  </Tooltip.Trigger>

                  <Tooltip.Positioner>
                    <Tooltip.Content backgroundColor="bg.default">
                      <Text color="fg.default">
                        Link {`${prettifiedLabel}`}
                      </Text>
                    </Tooltip.Content>
                  </Tooltip.Positioner>
                </Tooltip.Root>
                <Accordion.ItemTrigger>
                  <Text fontWeight="bold" size="md" color="fg.subtle">
                    {`${title[0].toUpperCase()}${Array.from(
                      title.slice(1, title.length),
                    )
                      .map((char, index) => {
                        if (title[index] === "_") {
                          return char.toUpperCase();
                        }
                        return char;
                      })
                      .toString()
                      .replaceAll(",", "")}`}
                  </Text>
                  <Accordion.ItemIndicator>
                    <IconChevronDown />
                  </Accordion.ItemIndicator>
                </Accordion.ItemTrigger>
              </Stack>
              <Accordion.ItemContent
                paddingLeft="0.5rem"
                paddingRight={"0.5rem"}
              >
                <Form
                  object={item}
                  id_prefix={props.id_prefix + title}
                  onItemChange={() => {
                    props.onItemChange?.();
                    const linked = props.linkedStatuses.get(
                      props.label,
                    )?.[0]()[0];
                    if (linked) {
                      props.linkedStatuses.get(props.label)?.[1]([
                        linked,
                        index(),
                      ]);
                    }
                  }}
                  accordionStatuses={props.accordionStatuses}
                  linkedStatuses={props.linkedStatuses}
                  gainLockStatuses={props.gainLockStatuses}
                  gainKinds={props.gainKinds}
                />
              </Accordion.ItemContent>
            </Accordion.Item>
          );
        }}
      </For>
    </Accordion.Root>
  );
}
