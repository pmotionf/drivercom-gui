import { Accordion } from "../ui/accordion";
import { Text } from "../ui/text";
import { Stack } from "styled-system/jsx";
import { Show } from "solid-js";
import { Form, FormProps } from "../Form";
import { createSignal } from "solid-js";
import { IconChevronDown } from "@tabler/icons-solidjs";

export type FormCollapsibleObjectProps = FormProps & {
  key: string;
  triggerDescription?: object;
};

export const FormCollapsibleObject = (props: FormCollapsibleObjectProps) => {
  const itemId = props.id + props.key;
  if (!props.accordionStates.has(itemId)) {
    props.accordionStates.set(itemId, createSignal<string[]>([itemId]));
  }
  const [accordionValue, setAccordionValue] =
    props.accordionStates.get(itemId)!;

  const key = props.key;
  const value = props.value;

  return (
    <Accordion.Root
      borderWidth="0"
      value={accordionValue()}
      onValueChange={(details) => {
        setAccordionValue(details.value);
      }}
      multiple
    >
      <Accordion.Item value={itemId}>
        <Accordion.ItemTrigger borderBottomWidth={"1px"}>
          <Stack gap="0" alignItems={"center"}>
            <Text fontWeight="bold" color="fg.default" size="sm" width="100%">
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
            <Show when={props.triggerDescription}>
              <Text size="xs" fontWeight="light" color="fg.muted">
                {
                  props.triggerDescription![
                    "description" as keyof typeof props.triggerDescription
                  ]
                }
              </Text>
            </Show>
          </Stack>
          <Accordion.ItemIndicator>
            <IconChevronDown />
          </Accordion.ItemIndicator>
        </Accordion.ItemTrigger>

        <Accordion.ItemContent
          borderWidth={"0px 1px 1px 1px"}
          padding="0 0.5rem 0.5rem 0.5rem"
          borderRadius={"0.2em"}
        >
          <Form
            value={value}
            id={`${props.id}.${key}`}
            style={{ "padding-left": "1rem" }}
            format={props.format}
            description={props.description}
            originalFile={props.originalFile}
            changeUnits={props.changeUnits}
            onItemChange={() => {
              props.onItemChange?.();
            }}
            accordionStates={props.accordionStates}
            logStartCombinators={props.logStartCombinators}
            logStartConditions={props.logStartConditions}
          />
        </Accordion.ItemContent>
      </Accordion.Item>
    </Accordion.Root>
  );
};
