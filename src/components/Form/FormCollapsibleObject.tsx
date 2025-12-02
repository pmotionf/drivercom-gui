import { Accordion } from "../ui/accordion";
import { Text } from "../ui/text";
import { Stack } from "styled-system/jsx";
import { IconButton } from "../ui/icon-button";
import { onMount, Show } from "solid-js";
import { Form, FormProps } from "../Form";
import { createSignal } from "solid-js";
import {
  IconLock,
  IconLockOff,
  IconChevronDown,
  IconLink,
  IconLinkOff,
} from "@tabler/icons-solidjs";

export type FormCollapsibleObjectProps = FormProps & {
  key: string;
};

export const FormCollapsibleObject = (props: FormCollapsibleObjectProps) => {
  const itemId = props.id + props.key;
  if (!props.accordionStates.has(itemId)) {
    props.accordionStates.set(itemId, createSignal<string[]>([itemId]));
  }
  const [accordionValue, setAccordionValue] =
    props.accordionStates.get(itemId)!;

  const key = props.key;
  const value = props.object;

  onMount(() => {
    if (props.gainLockStatuses && props.gainLockStatuses.get(`${key}.gain`)) {
      const entries = Array.from(props.gainLockStatuses!.entries()).filter(
        (entry) => entry[0].includes(`${key}.gain`),
      );
      if (entries.some((entry) => entry[1][0]())) {
        props.gainLockStatuses!.get(`${key}.gain`)![1](true);
      }
    }
  });

  return (
    <Accordion.Root
      borderWidth="0"
      value={accordionValue()}
      onValueChange={(details) => {
        setAccordionValue(details.value);
      }}
      multiple
    >
      <Accordion.Item value={itemId} padding="0 0.5em 0 0.5em">
        <Accordion.ItemTrigger>
          <Stack direction="row" gap="0" alignItems={"center"}>
            <Text fontWeight="bold" color="fg.subtle" size="sm">
              {`${key[0].toUpperCase()}${Array.from(key.slice(1, key.length))
                .map((char, index) => {
                  if (key[index] === "_") {
                    return char.toUpperCase();
                  }
                  return char;
                })
                .toString()
                .replaceAll(",", "")}`}
            </Text>
            <Show
              when={
                props.linkStates &&
                props.linkStates.has(props.id.split(".")[1]!) &&
                props.id.split(".").length === 2
              }
            >
              <IconButton
                size="sm"
                variant={"ghost"}
                width="1rem"
                height="min-content"
                paddingTop="0.2rem"
                paddingBottom="0.2rem"
                onClick={(e) => {
                  e.stopPropagation();
                  const gainLockValues = Array.from(
                    props.gainLockStatuses!.values(),
                  );
                  if (gainLockValues.some((val) => val)) {
                    const gainLockKeys = Array.from(
                      props.gainLockStatuses!.keys(),
                    );
                    gainLockKeys.forEach((key) => {
                      props.gainLockStatuses!.get(key)![1](false);
                    });
                  }

                  const [getLinkState, setLinkState] = props.linkStates!.get(
                    props.id.split(".")[1]!,
                  )!;
                  setLinkState([!getLinkState()[0], props.key]);
                  props.onItemChange?.();
                }}
              >
                <Show
                  when={props.linkStates!.get(props.id.split(".")[1]!)![0]()[0]}
                  fallback={<IconLinkOff style={{ opacity: "0.5" }} />}
                >
                  <IconLink />
                </Show>
              </IconButton>
            </Show>
            <Show
              when={
                props.gainLockStatuses &&
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
                  props.gainLockStatuses!.get(`${key}.gain`)![0]() ? "1" : "0.5"
                }
                onClick={(e) => {
                  e.stopPropagation();
                  const lockStatus = props.gainLockStatuses!.get(
                    `${key}.gain`,
                  )![0]();
                  const mapKeys = Array.from(
                    props.gainLockStatuses!.keys(),
                  ).filter((mapKey) => mapKey.includes(`${key}.gain`));
                  mapKeys.forEach((mapKey) => {
                    props.gainLockStatuses!.get(mapKey)![1](!lockStatus);
                  });

                  if (!lockStatus) {
                    const [getLinkState, setLinkState] = props.linkStates!.get(
                      props.id.split(".")[1]!,
                    )!;
                    if (getLinkState()[0]) {
                      setLinkState([false, getLinkState()[1]]);
                    }
                  }
                }}
              >
                <Show
                  when={props.gainLockStatuses!.get(`${key}.gain`)![0]()}
                  fallback={<IconLockOff />}
                >
                  <IconLock />
                </Show>
              </IconButton>
            </Show>
          </Stack>
          <Accordion.ItemIndicator>
            <IconChevronDown />
          </Accordion.ItemIndicator>
        </Accordion.ItemTrigger>

        <Accordion.ItemContent
          borderWidth={"1px"}
          padding="0 0.5em 0 0.5em"
          borderRadius={"0.5em"}
          marginBottom="1em"
        >
          <Form
            object={value}
            id={`${props.id}.${key}`}
            style={{ "padding-left": "1rem" }}
            onItemChange={() => {
              props.onItemChange?.();

              const linkKey = props.id.split(".")[1]!;
              if (
                linkKey &&
                props.linkStates &&
                props.linkStates.has(linkKey) &&
                props.id.split(".").length === 2
              ) {
                const [getLinkState, setLinkState] = props.linkStates!.get(
                  props.id.split(".")[1]!,
                )!;
                if (props.linkStates!.get(props.id.split(".")[1]!)![0]()[0]) {
                  setLinkState([getLinkState()[0], props.key]);
                }
              }
            }}
            accordionStates={props.accordionStates}
            linkStates={props.linkStates}
            gainLockStatuses={props.gainLockStatuses}
            gainKinds={props.gainKinds}
            gainKey={props.gainKey}
            logStartCombinators={props.logStartCombinators}
            logStartConditions={props.logStartConditions}
          />
        </Accordion.ItemContent>
      </Accordion.Item>
    </Accordion.Root>
  );
};
