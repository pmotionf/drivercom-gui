import { Accordion } from "../ui/accordion";
import { Text } from "../ui/text";
import { Stack } from "styled-system/jsx";
import { IconButton } from "../ui/icon-button";
import { Show } from "solid-js";
import { Form, FormProps } from "../Form";
import { createSignal } from "solid-js";
import { IconLock, IconLockOff, IconChevronDown } from "@tabler/icons-solidjs";

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
                onClick={() => {
                  const lockStatus = props.gainLockStatuses!.get(
                    `${key}.gain`,
                  )![0]();
                  const mapKeys = Array.from(
                    props.gainLockStatuses!.keys(),
                  ).filter((mapKey) => mapKey.includes(`${key}.gain`));
                  mapKeys.forEach((mapKey) => {
                    props.gainLockStatuses!.get(mapKey)![1](!lockStatus);
                  });
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

        <Accordion.ItemContent borderWidth={"0"} padding="0 1rem 0 1rem">
          <Form
            object={value}
            id={`${props.id}.${key}`}
            style={{ "padding-left": "1rem" }}
            onItemChange={() => {
              props.onItemChange?.();
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
