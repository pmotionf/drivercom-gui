import { trackStore } from "@solid-primitives/deep";
import {
  Accessor,
  For,
  Setter,
  Show,
  createSignal,
  on,
  createEffect,
} from "solid-js";
import { createStore } from "solid-js/store";
import { Stack } from "styled-system/jsx";
import { Accordion } from "./ui/accordion";
import { Tooltip } from "./ui/tooltip";
import { IconChevronDown, IconLink, IconLinkOff } from "@tabler/icons-solidjs";
import { IconButton } from "./ui/icon-button";
import { Text } from "./ui/text";

type AccordionStore = Map<string, [Accessor<string[]>, Setter<string[]>]>;

type LinkedStore = Map<
  string,
  [Accessor<[boolean, number]>, Setter<[boolean, number]>]
>;

export type FormProps = {
  id: string;
  label: string;
  form: object;
};

export const Form = (props: FormProps) => {
  const accordionStore: AccordionStore = new Map();
  const linkedStore: LinkedStore = new Map();

  return (
    <For each={Object.entries(props.form)}>
      {(entry) => {
        const [key, value] = entry;
        if (value.constructor === Array) {
          if (!accordionStore.has(key)) {
            accordionStore.set(key, createSignal<string[]>([]));
          }

          if (!linkedStore.has(key)) {
            linkedStore.set(key, createSignal<[boolean, number]>([false, 0]));
          }

          const accordion = accordionStore.get(key)!;
          const link = linkedStore.get(key)!;

          return (
            <Stack>
              <FormList
                id={props.id}
                id_prefix={props.id + key}
                label={key}
                items={value}
                accordionStore={accordion}
                linkedStore={link}
              />
            </Stack>
          );
        }

        if (typeof value === "object") {
          if (
            Object.values(value).length > 0 ||
            Object.values(value).some((val) => typeof val === "object")
          ) {
            const itemId = props.id + key;
            if (accordionStore.has(itemId)) {
              accordionStore.set(itemId, createSignal<string[]>([itemId]));
            }
            const [accordionValue, setAccordionValue] =
              accordionStore.get(itemId)!;

            return (
              <Accordion.Root
                borderWidth="0"
                value={accordionValue()}
                onValueChange={(details) => {
                  setAccordionValue(details.value);
                }}
                multiple
              >
                <Accordion.Item
                  value={itemId}
                  borderWidth="1px"
                  paddingTop="0.5rem"
                  paddingBottom="0.5rem"
                  marginTop="0.5rem"
                  borderRadius="0.5em"
                >
                  <Accordion.ItemTrigger fontSize="md" padding="0 1rem 0 1rem">
                    <Stack direction="row">
                      <Text fontWeight="bold" color="fg.subtle">
                        {`${key[0].toUpperCase()}${Array.from(
                          key.slice(1, key.length),
                        )
                          .map((char, index) => {
                            if (key[index] === "_") {
                              return char.toUpperCase();
                            }
                            return char;
                          })
                          .toString()
                          .replaceAll(",", "")}`}
                      </Text>
                      {/*
                      <Show
                        when={
                          props.gainLockStatuses.has(`${key}.gain`) &&
                          Object.keys(value).includes("gain")
                        }
                      >
                        <IconButton
                          size="sm"
                          width="1rem"
                          height="min-content"
                          paddingTop="0.2rem"
                          paddingBottom="0.2rem"
                          variant="ghost"
                          opacity={
                            props.gainLockStatuses.get(`${key}.gain`)![0]()
                              ? "1"
                              : "0.5"
                          }
                          onClick={() => {
                            const lockStatus = props.gainLockStatuses.get(
                              `${key}.gain`,
                            )![0]();
                            const mapKeys = Array.from(
                              props.gainLockStatuses.keys(),
                            ).filter((mapKey) =>
                              mapKey.includes(`${key}.gain`),
                            );
                            mapKeys.forEach((mapKey) => {
                              props.gainLockStatuses.get(mapKey)![1](
                                !lockStatus,
                              );
                            });
                          }}
                        >

                          <Show
                            when={props.gainLockStatuses.get(
                              `${key}.gain`,
                            )![0]()}
                            fallback={<IconLockOff />}
                          >
                            <IconLock />
                          </Show>

                        </IconButton>
                      </Show>
                      */}
                    </Stack>
                    <Accordion.ItemIndicator>
                      <IconChevronDown />
                    </Accordion.ItemIndicator>
                  </Accordion.ItemTrigger>

                  <Accordion.ItemContent
                    borderWidth={"0"}
                    padding="0 1rem 0 1rem"
                  >
                    <Form
                      id={props.id + key}
                      label={props.id + key}
                      form={value}
                    />
                  </Accordion.ItemContent>
                </Accordion.Item>
              </Accordion.Root>
            );
          } else {
          }
        }
      }}
    </For>
  );
};

type FormListProps = {
  id: string;
  label: string;
  items: object[];
  id_prefix: string;
  accordionStore: [Accessor<string[]>, Setter<string[]>];
  linkedStore: [Accessor<[boolean, number]>, Setter<[boolean, number]>];
};

const FormList = (props: FormListProps) => {
  const [items, setItems] = createStore<object[]>(props.items);
  const [recentEditedItem, setRecentEditedItem] = createSignal<string>("");
  const [accordionValue, setAccordionValue] = props.accordionStore;

  const [link, setLink] = props.linkedStore;
  const changedItemIndex = link()[1];
  if (changedItemIndex !== undefined) {
    setRecentEditedItem(JSON.stringify(items[changedItemIndex]));
  }

  createEffect(
    on(
      () => trackStore(items),
      () => {
        if (link()[1]) {
          const index = link()[1];
          setRecentEditedItem(JSON.stringify(items[index]));
        }
      },
    ),
  );

  createEffect(
    on(
      [() => recentEditedItem(), () => link()[0]],
      () => {
        if (!Array.isArray(items)) return;
        if (link()[0]) {
          items.forEach((_, index) => {
            const item = JSON.parse(recentEditedItem().replaceAll("null", "0"));
            if (index === link()[1]) {
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
      borderWidth="0"
      multiple
      value={accordionValue()}
      onValueChange={(details) => setAccordionValue(details.value)}
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
                        const linked = link()[0];

                        setLink([!linked, index()]);
                        setRecentEditedItem(JSON.stringify(item));
                      }}
                      marginTop="0.5rem"
                    >
                      <Show when={link()[0]} fallback={<IconLinkOff />}>
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
                  id={props.id_prefix + title}
                  label={props.id_prefix + title}
                  form={item}
                />
              </Accordion.ItemContent>
            </Accordion.Item>
          );
        }}
      </For>
    </Accordion.Root>
  );
};
