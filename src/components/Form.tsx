import { For, createSignal, JSX, type Setter, type Accessor } from "solid-js";
import { Stack } from "styled-system/jsx";
import { Text } from "./ui/text.tsx";
import { FormCheckBox } from "./Form/FormCheckBox.tsx";
import { FormNumberInput } from "./Form/FormNumberInput.tsx";
import { FormCollapsibleObject } from "./Form/FormCollapsibleObject.tsx";
import { FormList } from "./Form/FormList.tsx";
import { ListCollection } from "@ark-ui/solid";
import { Select } from "./ui/select.tsx";
import { createStore } from "solid-js/store";
import { LinkStates, GainLockStates } from "./ConfigForm.tsx";

export type AccordionStates = Map<
  string,
  [Accessor<string[]>, Setter<string[]>]
>;

export type FormProps = JSX.HTMLAttributes<HTMLDivElement> & {
  id: string;
  object: object;
  onItemChange?: () => void;
  accordionStates: AccordionStates;
  linkStates?: LinkStates;
  gainLockStatuses?: GainLockStates;
  gainKinds?: string[];
  gainKey?: string;
  logStartConditions?: ListCollection;
  logStartCombinators?: ListCollection;
};

export function Form(props: FormProps) {
  const [object, setObject] = createStore(props.object);

  const [prevCheckBoxIndex, setPrevCheckBoxIndex] = createSignal<number | null>(
    null,
  );

  const checkBoxShiftClick = (index: number) => {
    if (prevCheckBoxIndex() === null) return;
    const startNumber = Math.min(prevCheckBoxIndex()!, index);
    const endNumber = Math.max(prevCheckBoxIndex()!, index);

    const keys = Object.keys(object).slice(startNumber, endNumber + 1);
    keys.forEach((key) => {
      setObject(
        key as keyof typeof object,
        // @ts-ignore : TSC unable to handle generic object type
        // in store
        true,
      );
    });
  };

  return (
    <div>
      <For each={Object.entries(object)}>
        {(entry, index) => {
          const key = entry[0];
          const value = entry[1];
          if (
            value.constructor === Array &&
            props.gainLockStatuses &&
            props.linkStates &&
            props.gainKinds
          ) {
            if (!props.accordionStates.has(key)) {
              props.accordionStates.set(key, createSignal<string[]>([]));
            }
            if (props.linkStates && !props.linkStates.has(key)) {
              props.linkStates.set(
                key,
                createSignal<[boolean, number]>([false, 0]),
              );
            }
            return (
              <>
                <Stack
                  style={{
                    "border-width": "1px",
                    "padding-right": "1rem",
                    "padding-left": "1rem",
                    "margin-top": "1rem",
                    "border-radius": "0.5rem",
                    "margin-bottom": "0.5rem",
                    "padding-bottom": "0.5rem",
                  }}
                >
                  <FormList
                    label={key}
                    items={value}
                    onItemChange={() => props.onItemChange?.()}
                    id_prefix={props.id}
                    accordionStatuses={props.accordionStates}
                    linkedStatuses={props.linkStates}
                    gainLockStatuses={props.gainLockStatuses}
                    gainKinds={props.gainKinds}
                  />
                </Stack>
              </>
            );
          }
          if (typeof value === "object") {
            let gainkey = props.gainKey ? props.gainKey : "";
            if (gainkey.length !== 0) {
              gainkey = `${props.gainKey}.${key}`;
            }

            if (props.gainKinds) {
              const index = props.gainKinds.indexOf(key.toLowerCase());

              if (index !== -1) {
                gainkey = `${props.gainKinds[index]}`;
                if (
                  !props.gainLockStatuses!.has(gainkey) &&
                  Object.keys(value).includes("gain")
                ) {
                  props.gainLockStatuses!.set(
                    `${gainkey}.gain`,
                    createSignal<boolean>(false),
                  );
                }
              }
            }

            if (
              Object.values(value).length > 1 ||
              Object.values(value).some((val) => typeof val === "object")
            ) {
              return (
                <FormCollapsibleObject
                  id={props.id}
                  key={key}
                  object={value}
                  gainKey={gainkey}
                  gainKinds={props.gainKinds ? props.gainKinds : undefined}
                  accordionStates={props.accordionStates}
                  linkStates={props.linkStates ? props.linkStates : undefined}
                  gainLockStatuses={
                    props.gainLockStatuses ? props.gainLockStatuses : undefined
                  }
                  logStartCombinators={
                    props.logStartCombinators
                      ? props.logStartCombinators
                      : undefined
                  }
                  logStartConditions={
                    props.logStartConditions
                      ? props.logStartConditions
                      : undefined
                  }
                  onItemChange={() => props.onItemChange?.()}
                />
              );
            } else {
              return (
                <>
                  <div
                    style={{
                      "border-width": "1px",
                      padding: "0.5rem 1rem 0.5rem 1rem",
                      "margin-top": "0.5rem",
                      "border-radius": "0.5em",
                    }}
                  >
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
                      gainKey={gainkey}
                      logStartCombinators={props.logStartCombinators}
                      logStartConditions={props.logStartConditions}
                    />
                  </div>
                </>
              );
            }
          }
          if (typeof value === "boolean") {
            const label = !isNaN(Number(key))
              ? `${props.id.split(`.`).pop()} ${Number(key) + 1}`
              : key;
            return (
              <FormCheckBox
                id={`${props.id}.${key}`}
                label={label}
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
                  if (value as keyof typeof object) {
                    setPrevCheckBoxIndex(null);
                    return;
                  }
                  setPrevCheckBoxIndex(index());
                }}
                onShiftClick={() => {
                  checkBoxShiftClick(index());
                }}
              />
            );
          }
          if (
            typeof value === "number" ||
            (typeof value === "string" && value === "NaN") ||
            (typeof value === "string" && value === "Infinity") ||
            (typeof value === "string" && value === "-Infinity")
          ) {
            if (key === "_") return;
            const label = !isNaN(Number(key))
              ? `${props.id.split(`.`).pop()} ${Number(key) + 1}`
              : key;
            let lockStatusKey = "";
            const lockStatus = props.gainLockStatuses!;
            if (
              props.gainKey &&
              props.gainKey.length !== 0 &&
              props.gainKinds &&
              !props.gainKinds.includes(props.gainKey)
            ) {
              if (key.toLowerCase() === "p" || key.toLowerCase() === "i") {
                lockStatusKey = `${props.gainKey}.${key}`;
                if (!lockStatus.has(lockStatusKey)) {
                  lockStatus.set(lockStatusKey, createSignal<boolean>(false));
                }
              }
            }

            return (
              <FormNumberInput
                id={`${props.id}.${key}`}
                label={label}
                lockStatus={lockStatus}
                lockStatusKey={
                  lockStatusKey.length > 0 ? lockStatusKey : undefined
                }
                inputValue={Number(object[key as keyof typeof object])}
                onInputChange={(val) => {
                  setObject(
                    key as keyof typeof object,
                    // @ts-ignore: TSC unable to handle generic object type
                    // in store
                    isFinite(val) ? val : `${val}`,
                  );
                  props.onItemChange?.();
                }}
              />
            );
          }

          if (
            typeof value == "string" &&
            props.logStartConditions &&
            props.logStartCombinators
          ) {
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
                  collection={
                    key === "kind"
                      ? props.logStartConditions
                      : props.logStartCombinators
                  }
                  defaultValue={[value.toString()]}
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
