import { createSignal, For, JSX, Show } from "solid-js";
import { Stack } from "styled-system/jsx";
import { Checkbox } from "~/components/ui/checkbox";
import { Text } from "~/components/ui/text";
import { Input } from "~/components/ui/input";
import { logStartCombinatorList, logStartConditionList } from "~/GlobalState";
import { createStore } from "solid-js/store";
import { createListCollection, Select } from "~/components/ui/select";
import { ListCollection } from "@ark-ui/solid/collection";

export type LoggingFormProps = JSX.HTMLAttributes<Element> & {
  formData: object;
};

export function LoggingForm(props: LoggingFormProps) {
  const logForm = props.formData;

  // Log config start condition list for select component
  const parseStartConditionList = logStartConditionList().map((condition) => {
    return { label: condition, value: condition };
  });
  const logStartConditions: ListCollection = createListCollection({
    items: parseStartConditionList,
  });

  // Log config start combinator list for select component
  const parseCombinatorList = logStartCombinatorList().map((condition) => {
    return { label: condition, value: condition };
  });
  const logStartCombinators = createListCollection({
    items: parseCombinatorList,
  });

  return (
    <div
      style={{
        "overflow-y": "auto",
        "border-top-width": "1px",
        "border-bottom-width": "1px",
        "padding-bottom": "0.5rem",
      }}
    >
      <LogConfigFieldSet
        object={logForm}
        logStartCombinators={logStartCombinators}
        logStartConditions={logStartConditions}
      />
    </div>
  );
}

export type logConfigFieldSetProps = JSX.HTMLAttributes<Element> & {
  object: object;
  sectionName?: string;
  logStartConditions: ListCollection;
  logStartCombinators: ListCollection;
};

export function LogConfigFieldSet(props: logConfigFieldSetProps) {
  const [obj, setObject] = createStore<object>(props.object);

  const [prevCheckBoxIndex, setPrevCheckBoxIndex] = createSignal<number | null>(
    null,
  );

  const checkBoxShiftClick = (index: number) => {
    if (prevCheckBoxIndex() === null) return;
    const startNumber = Math.min(prevCheckBoxIndex()!, index);
    const endNumber = Math.max(prevCheckBoxIndex()!, index);

    const keys = Object.keys(obj).slice(startNumber, endNumber + 1);
    keys.forEach((key) => {
      setObject(
        key as keyof typeof obj,
        // @ts-ignore : TSC unable to handle generic object type
        // in store
        true,
      );
    });
  };

  return (
    <For each={Object.entries(obj)}>
      {(entry, index) => {
        const key = entry[0];
        const value = entry[1];
        const keyArray = Array.from(key);
        const upperCaseKey = keyArray
          .map((char, i) => {
            if (i === 0) return char.toUpperCase();
            else if (keyArray[i - 1] === "_") return char.toUpperCase();
            else return char;
          })
          .toString()
          .replaceAll(",", "");

        if (typeof value == "object") {
          return (
            <>
              <fieldset
                style={{
                  "border-width": "1px",
                  padding: "0.5rem",
                  "border-radius": "0.5rem",

                  "margin-bottom": "0.5rem",
                }}
              >
                <legend>
                  <Text
                    fontWeight="bold"
                    opacity="50%"
                    size="lg"
                    userSelect="none"
                  >
                    {upperCaseKey}
                  </Text>
                </legend>
                <LogConfigFieldSet
                  object={value}
                  sectionName={key}
                  logStartCombinators={props.logStartCombinators}
                  logStartConditions={props.logStartConditions}
                />
              </fieldset>
            </>
          );
        }
        if (typeof value == "boolean") {
          return (
            <Checkbox
              checked={obj[key as keyof typeof obj]}
              onCheckedChange={(e) => {
                setObject(
                  key as keyof typeof obj,
                  // @ts-ignore : TSC unable to handle generic object type
                  // in store
                  e.checked,
                );
              }}
              onClick={(e) => {
                if (value as keyof typeof obj) {
                  setPrevCheckBoxIndex(null);
                  return;
                }
                !e.shiftKey
                  ? setPrevCheckBoxIndex(index())
                  : checkBoxShiftClick(index());
              }}
              style={{
                "margin-top": "0.2rem",
              }}
            >
              <Text fontWeight="light" userSelect="none">
                {!isNaN(Number(key))
                  ? `${props.sectionName} ${Number(key) + 1}`
                  : key}
              </Text>
            </Checkbox>
          );
        }
        if (typeof value === "number") {
          if (key === "_") return;
          return (
            <>
              <Stack
                direction="row"
                style={{
                  "margin-top": "0.5rem",
                }}
              >
                <Text
                  marginTop="0.3rem"
                  width="50%"
                  fontWeight="light"
                  userSelect="none"
                  marginLeft="0.5rem"
                >
                  <Show when={props.sectionName} fallback={upperCaseKey}>
                    {`${props.sectionName![0].toUpperCase()}${
                      props.sectionName!.slice(
                        1,
                        props.sectionName!.length,
                      )
                    } ${Number(key[0]) + 1}`}
                  </Show>
                </Text>
                <Input
                  value={Number(value)}
                  type="number"
                  onChange={(e) => {
                    setObject(
                      key as keyof typeof obj,
                      // @ts-ignore : TSC unable to handle generic object type
                      // in store
                      Number(e.target.value),
                    );
                  }}
                />
              </Stack>
            </>
          );
        }
        if (typeof value == "string") {
          return (
            <>
              <Text
                marginTop="0.5rem"
                marginLeft="0.2rem"
                userSelect="none"
                marginBottom="0.5rem"
              >
                {`${key[0].toUpperCase()}${key.slice(1, key.length)}`}
              </Text>
              <Select.Root
                positioning={{ sameWidth: true }}
                width="2xs"
                collection={key === "kind"
                  ? props.logStartConditions
                  : props.logStartCombinators}
                defaultValue={[value.toString()]}
                onValueChange={(v) => {
                  setObject(key as keyof typeof obj, v.items[0].label);
                }}
              >
                <Select.Control>
                  <Select.Trigger>
                    <Select.ValueText placeholder={`Select ${key}`} />
                  </Select.Trigger>
                </Select.Control>
                <Select.Positioner>
                  <Select.Content>
                    <For
                      each={key === "kind"
                        ? props.logStartConditions.items
                        : props.logStartCombinators.items}
                    >
                      {(item) => (
                        <Select.Item item={item}>
                          <Select.ItemText>{item.label}</Select.ItemText>
                          <Select.ItemIndicator></Select.ItemIndicator>
                        </Select.Item>
                      )}
                    </For>
                  </Select.Content>
                </Select.Positioner>
              </Select.Root>
            </>
          );
        }
      }}
    </For>
  );
}
