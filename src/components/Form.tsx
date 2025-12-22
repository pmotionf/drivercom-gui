import { For, createSignal, JSX, type Setter, type Accessor } from "solid-js";
import { Text } from "./ui/text.tsx";
import { FormCheckBox } from "./Form/FormCheckBox.tsx";
import { FormNumberInput } from "./Form/FormNumberInput.tsx";
import { FormCollapsibleObject } from "./Form/FormCollapsibleObject.tsx";
import { ListCollection } from "@ark-ui/solid";
import { Select } from "./ui/select.tsx";
import { createStore } from "solid-js/store";
import { LinkStates, GainLockStates } from "./ConfigForm.tsx";
import JSON5 from "json5";

export type AccordionStates = Map<
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
  accordionStates: AccordionStates;
  linkStates?: LinkStates;
  gainLockStatuses?: GainLockStates;
  gainKinds?: string[];
  gainKey?: string;
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

  const onlyObjects = Object.values(object).filter(
    (val) => typeof val === "object",
  );
  const checkObjectKeys = onlyObjects.map((val) => Object.keys(val).toString());
  const checkDuplicateKeys = [...new Set(checkObjectKeys)];
  if (checkDuplicateKeys.length === 1 && checkObjectKeys.length > 1) {
    const objectKey = props.id.split(".").pop()!;
    if (props.linkStates && !props.linkStates.has(objectKey)) {
      props.linkStates!.set(
        objectKey,
        createSignal<[boolean, string]>([false, ""]),
      );
    }
  }

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

          if (typeof format === "object") {
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
                  Object.keys(format).includes("gain")
                ) {
                  props.gainLockStatuses!.set(
                    `${gainkey}.gain`,
                    createSignal<boolean>(false),
                  );
                }
              }
            }

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

                  if (
                    descValues.some(
                      (val) =>
                        typeof val === "object" &&
                        val &&
                        "hidden" in val &&
                        val.hidden === true,
                    )
                  ) {
                    return;
                  }
                }
              }
            }

            return (
              <div
                style={{
                  "border-top-width": index() === 0 ? "0px" : "1px",
                  "border-bottom-width": Object.values(object).some(
                    (val) => typeof val !== "object",
                  )
                    ? typeof Object.values(object)[index() + 1] !== "object"
                      ? "1px"
                      : "0"
                    : "0px",
                }}
              >
                <FormCollapsibleObject
                  id={props.id}
                  key={
                    isNaN(Number(key))
                      ? key
                      : `${props.id.split(".").pop()} ${Number(key) + 1}`
                  }
                  description={
                    checkDesc(key)
                      ? props.description![
                          key as keyof typeof props.description
                        ]
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
                  triggerDescription={
                    checkDesc(`__${key}`)
                      ? props.description![
                          `__${key}` as keyof typeof props.description
                        ]
                      : undefined
                  }
                  format={props.format ? format : undefined}
                  value={object[key as keyof typeof object]}
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
                  onItemChange={() => {
                    props.onItemChange?.();

                    const linkKey = props.id.split(".").pop();
                    if (
                      props.linkStates &&
                      linkKey &&
                      props.linkStates.has(linkKey)
                    ) {
                      const linkState = props.linkStates.get(linkKey)!;
                      if (linkState[0]()[0] && props.format) {
                        const otherKey = Object.keys(props.format).filter(
                          (formatKey) => formatKey !== key,
                        );
                        console.log(otherKey, key);
                        const newValue = object[key as keyof typeof object];
                        if (typeof newValue === "object") {
                          const deepCopy = JSON5.parse(
                            JSON5.stringify(newValue),
                          );
                          console.log(object);
                          setObject(otherKey as keyof typeof object, deepCopy);
                        }
                      }
                    }
                  }}
                />
              </div>
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
                  desc={
                    checkDesc(`__${key}`)
                      ? props.description![
                          `__${key}` as keyof typeof props.description
                        ]
                      : undefined
                  }
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
                desc={
                  checkDesc(`__${key}`)
                    ? props.description![
                        `__${key}` as keyof typeof props.description
                      ]
                    : undefined
                }
                originalValue={
                  props.originalFile
                    ? props.originalFile![
                        key as keyof typeof props.originalFile
                      ]
                    : undefined
                }
                changeUnits={props.changeUnits}
                linkStatus={props.linkStates}
                lockStatus={lockStatus}
                lockStatusKey={
                  lockStatusKey.length > 0 ? lockStatusKey : undefined
                }
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
