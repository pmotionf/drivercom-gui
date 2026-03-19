import {
  For,
  createSignal,
  JSX,
  type Setter,
  type Accessor,
  Show,
} from "solid-js";
import { Text } from "./ui/text.tsx";
import { FormCheckBox } from "./Form/FormCheckBox.tsx";
import { FormNumberInput } from "./Form/FormNumberInput.tsx";
import { FormCollapsibleObject } from "./Form/FormCollapsibleObject.tsx";
import { ListCollection } from "@ark-ui/solid";
import { Select } from "./ui/select.tsx";
import { createStore } from "solid-js/store";
import { Tooltip } from "./ui/tooltip.tsx";
import { IconHelp } from "@tabler/icons-solidjs";

export type LoggingAccordionStates = Map<
  string,
  [Accessor<string[]>, Setter<string[]>]
>;

export type FormProps = JSX.HTMLAttributes<HTMLDivElement> & {
  id: string;
  value: object;
  format?: object;
  description?: object;
  originalFile?: object;
  changeUnits?: boolean;
  onItemChange?: () => void;
  accordionStates: LoggingAccordionStates;
  logStartConditions?: ListCollection;
  logStartCombinators?: ListCollection;
};

export function Form(props: FormProps) {
  const [object, setObject] = createStore(props.value);

  const [prevCheckBoxIndex, setPrevCheckBoxIndex] = createSignal<number | null>(
    null,
  );

  const checkBoxShiftClick = (
    prevIndex: number,
    nextIndex: number,
    form: object,
  ) => {
    const startNumber = prevIndex > nextIndex ? nextIndex : prevIndex + 1;
    const endNumber = prevIndex < nextIndex ? nextIndex + 1 : prevIndex;
    const values = Object.values(form);
    const parseValues = values.slice(startNumber, endNumber);
    if (parseValues.includes(values[prevIndex])) return;

    const keys = Object.keys(form).slice(startNumber, endNumber);
    keys.forEach((key) => {
      setObject(
        key as keyof typeof object,
        // @ts-ignore : TSC unable to handle generic object type
        // in store
        values[prevIndex],
      );
    });
  };

  const checkDesc = (key: string) => {
    if (!props.description) return false;
    const descKeys = Array.from(Object.keys(props.description));
    if (descKeys.includes(key)) {
      return true;
    } else return false;
  };

  return (
    <div>
      <For each={Object.entries(props.format ? props.format : object)}>
        {(entry, index) => {
          const key = entry[0];
          const format = entry[1];

          const hasDesc = checkDesc(`__${key}`);
          const description = hasDesc
            ? (props.description![
                `__${key}` as keyof typeof props.description
              ] as object)
            : undefined;
          if (
            description &&
            description["hidden" as keyof typeof description] === true
          ) {
            return;
          }

          if (typeof format === "object") {
            if (checkDesc(key)) {
              const desc =
                props.description![key as keyof typeof props.description];
              if (typeof desc === "object") {
                const entry = Object.entries(desc);
                const onlyDesc = entry.filter((entry) =>
                  entry[0].startsWith("__"),
                );
                if (onlyDesc.length > 0) {
                  const descValues = onlyDesc
                    .filter((desc) =>
                      Object.keys(format).includes(desc[0].replace(`__`, "")),
                    )
                    .map((desc) => desc[1]);
                  const findHidden = descValues
                    .map((desc) => {
                      if (
                        typeof desc == "object" &&
                        desc &&
                        "hidden" in desc &&
                        typeof desc.hidden === "boolean"
                      ) {
                        return desc.hidden;
                      } else {
                        return false;
                      }
                    })
                    .filter((hidden) => hidden);

                  if (
                    findHidden.length === descValues.length &&
                    findHidden.length > 0
                  ) {
                    return;
                  }
                }
              }
            }

            return (
              <FormCollapsibleObject
                id={props.id}
                key={
                  isNaN(Number(key))
                    ? key
                    : `${props.id.split(".").pop()} ${Number(key) + 1}`
                }
                description={
                  checkDesc(key)
                    ? props.description![key as keyof typeof props.description]
                    : undefined
                }
                originalFile={
                  props.originalFile && key in props.originalFile
                    ? props.originalFile![
                        key as keyof typeof props.originalFile
                      ]
                    : undefined
                }
                changeUnits={props.changeUnits}
                triggerDescription={description}
                format={props.format ? format : undefined}
                value={object[key as keyof typeof object]}
                accordionStates={props.accordionStates}
                logStartCombinators={props.logStartCombinators}
                logStartConditions={props.logStartConditions}
              />
            );
          }
          if (typeof format === "boolean") {
            const label = !isNaN(Number(key))
              ? `${props.id.split(`.`).pop()} ${Number(key) + 1}`
              : key;
            return (
              <div style={{ "margin-bottom": "0.5em" }}>
                <FormCheckBox
                  id={`${props.id}.${key}`}
                  label={label}
                  desc={description}
                  originalValue={
                    props.originalFile
                      ? props.originalFile[
                          key as keyof typeof props.originalFile
                        ]
                      : undefined
                  }
                  checked={object[key as keyof typeof object]}
                  onCheckedChange={(checked) =>
                    setObject(
                      key as keyof typeof object,
                      // @ts-ignore: TSC unable to handle generic object type
                      // in store
                      checked,
                    )
                  }
                  onClick={() => {
                    setPrevCheckBoxIndex(index());
                  }}
                  onShiftClick={() => {
                    if (typeof prevCheckBoxIndex() === "number") {
                      checkBoxShiftClick(prevCheckBoxIndex()!, index(), object);
                      setPrevCheckBoxIndex(null);
                    }
                  }}
                />
              </div>
            );
          }
          if (typeof format === "number") {
            if (key === "_") return;
            const label = !isNaN(Number(key))
              ? `${props.id.split(`.`).pop()} ${Number(key) + 1}`
              : key;

            return (
              <FormNumberInput
                id={`${props.id}.${key}`}
                label={label}
                desc={description}
                originalValue={
                  props.originalFile
                    ? props.originalFile![
                        key as keyof typeof props.originalFile
                      ]
                    : undefined
                }
                changeUnits={props.changeUnits}
                inputValue={object[key as keyof typeof object]}
                onInputChange={(value) => {
                  setObject(
                    key as keyof typeof object,
                    // @ts-ignore: TSC unable to handle generic object type
                    // in store
                    value,
                  );
                  props.onItemChange?.();
                }}
              />
            );
          }

          if (
            typeof format == "string" &&
            props.logStartConditions &&
            props.logStartCombinators
          ) {
            const description = props.description
              ? props.description[`__${key}` as keyof typeof props.description]
              : undefined;
            return (
              <>
                <div
                  style={{
                    width: "100%",
                    display: "flex",
                    "align-items": "center",
                  }}
                >
                  <Text
                    marginTop="0.5rem"
                    marginLeft="0.2rem"
                    userSelect="none"
                    marginBottom="0.5rem"
                    marginRight="0.5rem"
                  >
                    {`${key[0].toUpperCase()}${key.slice(1, key.length)}`}
                  </Text>
                  <Show when={description}>
                    <Tooltip.Root>
                      <Tooltip.Trigger>
                        <IconHelp size="1em" opacity={0.5} />
                      </Tooltip.Trigger>
                      <Tooltip.Positioner>
                        <Tooltip.Content>
                          {
                            description![
                              "description" as keyof typeof description
                            ]
                          }
                        </Tooltip.Content>
                      </Tooltip.Positioner>
                    </Tooltip.Root>
                  </Show>
                </div>

                <Select.Root
                  positioning={{ sameWidth: true }}
                  width="2xs"
                  collection={
                    key === "kind"
                      ? props.logStartConditions
                      : props.logStartCombinators
                  }
                  defaultValue={[format.toString()]}
                  onValueChange={(v) => {
                    setObject(key as keyof typeof object, v.items[0].label);
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
                        each={
                          key === "kind"
                            ? props.logStartConditions.items
                            : props.logStartCombinators.items
                        }
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
    </div>
  );
}
