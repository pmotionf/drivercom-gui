import { AccordionStates } from "./ConfigForm";
import { LinkStates } from "./ConfigForm";
import { GainLockStates } from "./ConfigForm";
import {
  JSX,
  onMount,
  For,
  createSignal,
  Show,
  createEffect,
  on,
} from "solid-js";
import { createStore } from "solid-js/store";
import * as Accordion from "../../../components/ui/accordion";
import { FormNumberInput } from "../../../components/Form/FormNumberInput";
import { Text } from "../../../components/ui/text";
import { IconChevronDown } from "@tabler/icons-solidjs";
import { ConfigFormatObject } from "./ConfigFormatObject";
import { prettierLabel } from "~/utils/PrettierLabel";
import * as Select from "../../../components/ui/select";
import { createListCollection } from "@ark-ui/solid";
import { cclinkSpeed } from "~/store/GlobalState";
import { FormCheckBox } from "~/components/Form/FormCheckBox";
import { css } from "styled-system/css";

export type ConfigFormTabPageProps = {
  id: string;
  format: object;
  config: object;
  focusFieldKey?: string;
  originalFile?: object;
  description?: object;
  unitChange?: boolean;
  accordionStatuses?: AccordionStates;
  linkKey?: string;
  linkedStatuses?: LinkStates;
  gainLockStatuses?: GainLockStates;
  formOverflowY: Map<string, number>;
} & JSX.HTMLAttributes<HTMLDivElement>;

export const ConfigFormTabPage = (props: ConfigFormTabPageProps) => {
  const [store, setStore] = createStore(props.config);
  let ref: HTMLDivElement | undefined;

  onMount(() => {
    if (ref) {
      const getScrollTop = props.formOverflowY.get(props.id);
      if (getScrollTop) {
        setTimeout(() => {
          ref.scrollTo(0, getScrollTop);
        });
      }
    }
  });

  createEffect(
    on(
      () => props.focusFieldKey,
      () => {
        if (ref) {
          if (props.focusFieldKey) {
            const element = document.getElementById(
              props.id + "." + props.focusFieldKey,
            );
            if (element) {
              setTimeout(() => {
                element.scrollIntoView();
              });
            }
          }
        }
      },
    ),
  );

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
      setStore(
        key as keyof typeof store,
        // @ts-ignore : TSC unable to handle generic object type
        // in store
        values[prevIndex],
      );
    });
  };

  return (
    <div
      id={props.id}
      ref={ref}
      style={{
        width: `100%`,
        height: "100%",
        "overflow-y": "auto",
        "overflow-x": "hidden",
        "border-width": "0",
        padding: "1rem",
        display: "flex",
        "justify-content": "space-between",
      }}
      onScroll={(e) => {
        props.formOverflowY.set(props.id, e.target.scrollTop);
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          "flex-direction": "column",
          gap: "0.5rem",
          "max-width": "60rem",
        }}
      >
        <For each={Object.entries(props.format)}>
          {(entry, index) => {
            const key = entry[0];
            const value = entry[1];
            const id = props.id + "." + key;
            const originalFile = props.originalFile
              ? props.originalFile[key as keyof typeof props.originalFile]
              : null;
            const description = props.description
              ? props.description[key as keyof typeof props.description]
              : null;

            if (key in store) {
              const accordionItemValue = id + "." + key;
              if (props.accordionStatuses && !props.accordionStatuses.has(id)) {
                props.accordionStatuses.set(id, [accordionItemValue]);
              }

              const getAccordionValue = () =>
                props.accordionStatuses
                  ? props.accordionStatuses.get(id)!
                  : undefined;

              if (typeof store[key as keyof typeof store] === "object") {
                const label = prettierLabel(
                  isNaN(Number(key)) ? key : `axis ${Number(key) + 1}`,
                );
                if (description) {
                  const innerKeys = Object.keys(value);
                  const findHidden = innerKeys.map((key) => {
                    if (`__${key}` in description) {
                      const fieldDesc =
                        description[`__${key}` as keyof typeof description];
                      if (fieldDesc && "hidden" in fieldDesc) {
                        return fieldDesc[
                          "hidden" as keyof typeof fieldDesc
                        ] as boolean;
                      }
                      return false;
                    }
                  });
                  if (findHidden.every((find) => find)) return;
                }
                return (
                  <Accordion.Root
                    id={id}
                    multiple
                    style={{
                      "border-width": "1px",
                      padding: "0.5rem",
                      "border-radius": "0.5rem",
                    }}
                    defaultValue={getAccordionValue()}
                    onValueChange={(details) => {
                      if (props.accordionStatuses) {
                        props.accordionStatuses.set(id, details.value);
                      }
                    }}
                  >
                    <Accordion.Item borderWidth="0" value={accordionItemValue}>
                      <Accordion.ItemTrigger
                        padding="0"
                        fontSize={"1rem"}
                        fontWeight={"bold"}
                      >
                        <Text>{label}</Text>
                        <Accordion.ItemIndicator>
                          <IconChevronDown />
                        </Accordion.ItemIndicator>
                      </Accordion.ItemTrigger>
                      <Accordion.ItemContent padding={"0.5rem"}>
                        <ConfigFormatObject
                          id={props.id + "." + key}
                          format={value}
                          config={store[key as keyof typeof store] as object}
                          originalFile={
                            originalFile && typeof originalFile === "object"
                              ? originalFile
                              : undefined
                          }
                          description={description ?? undefined}
                          changeUnit={props.unitChange}
                          accordionStatuses={props.accordionStatuses}
                          linkKey={props.linkKey}
                          linkedStatuses={props.linkedStatuses}
                          gainLockStatuses={props.gainLockStatuses}
                          focusFieldKey={props.focusFieldKey}
                        />
                      </Accordion.ItemContent>
                    </Accordion.Item>
                  </Accordion.Root>
                );
              } else if (typeof store[key as keyof typeof store] === "number") {
                if (key === "_") return;
                const label = !isNaN(Number(key))
                  ? `${props.id.split(".").pop()} ${Number(key) + 1}`
                  : key;

                return (
                  <div
                    style={{
                      "border-top-width": index() === 0 ? "0px" : "1px",
                      "padding-top": index() === 0 ? "0px" : "0.5rem",
                    }}
                  >
                    <FormNumberInput
                      background={"gray.2"}
                      id={`${props.id}.${key}`}
                      label={label}
                      originalValue={
                        props.originalFile
                          ? Number(
                              props.originalFile[
                                key as keyof typeof props.originalFile
                              ],
                            )
                          : undefined
                      }
                      desc={
                        props.description && `__${key}` in props.description
                          ? props.description[
                              `__${key}` as keyof typeof props.description
                            ]
                          : undefined
                      }
                      changeUnits={props.unitChange}
                      inputValue={store[key as keyof typeof store]}
                      onInputChange={(value) => {
                        setStore(
                          key as keyof typeof store,
                          // @ts-ignore: TSC unable to handle generic object type
                          // in store
                          value,
                        );
                      }}
                      isFocus={props.focusFieldKey === key}
                    />
                  </div>
                );
              } else if (key === "cc_link_speed") {
                const collection = createListCollection({
                  items: cclinkSpeed().map((cclink) => {
                    return { label: cclink, value: cclink };
                  }),
                });
                return (
                  <div
                    style={{
                      display: "grid",
                      "grid-template-columns": `minmax(0,1fr) 15rem`,
                      "align-items": "center",
                      "border-top-width": index() === 0 ? "0px" : "1px",
                      "padding-top": index() === 0 ? "0px" : "0.5rem",
                    }}
                  >
                    <Text display="flex" alignItems="center" gap="0.4rem">
                      <Show
                        when={originalFile !== store[key as keyof typeof store]}
                      >
                        <div
                          class={css({
                            background: "accent.9",
                            width: "0.5rem",
                            height: "0.5rem",
                            borderRadius: "1rem",
                            marginTop: "0.3rem",
                          })}
                        />
                      </Show>
                      <div
                        class={css({
                          background:
                            props.focusFieldKey === key
                              ? "accent.7"
                              : "transparent",
                        })}
                      >
                        {"cc_link_speed"}
                      </div>
                    </Text>
                    <Select.Root
                      collection={collection}
                      value={[store[key as keyof typeof store] as string]}
                      onValueChange={(e) => {
                        setStore(
                          key as keyof typeof store,
                          //@ts-ignore
                          e.value[0],
                        );
                      }}
                    >
                      <Select.Control>
                        <Select.Trigger borderColor={"gray.5"}>
                          <Select.ValueText
                            id={id}
                            width="100%"
                            placeholder="Select a framework"
                            textAlign={"end"}
                          />
                          <Select.IndicatorGroup>
                            <Select.Indicator />
                          </Select.IndicatorGroup>
                        </Select.Trigger>
                      </Select.Control>
                      <Select.Positioner>
                        <Select.Content>
                          <For each={collection.items}>
                            {(item) => (
                              <Select.Item item={item.value}>
                                <Select.ItemText>{item.label}</Select.ItemText>
                                <Select.ItemIndicator />
                              </Select.Item>
                            )}
                          </For>
                        </Select.Content>
                      </Select.Positioner>
                    </Select.Root>
                  </div>
                );
              } else if (
                typeof store[key as keyof typeof store] === "boolean"
              ) {
                const label = !isNaN(Number(key))
                  ? `${props.id.split(".").pop()} ${Number(key) + 1}`
                  : key;
                return (
                  <div style={{ "margin-bottom": "0.5em" }}>
                    <FormCheckBox
                      id={props.id + "." + key}
                      label={label}
                      originalValue={
                        props.originalFile
                          ? props.originalFile[
                              key as keyof typeof props.originalFile
                            ]
                          : undefined
                      }
                      desc={
                        props.description && `__${key}` in props.description
                          ? props.description[
                              `__${key}` as keyof typeof props.description
                            ]
                          : undefined
                      }
                      checked={store[key as keyof typeof store]}
                      onCheckedChange={(checked) =>
                        setStore(
                          key as keyof typeof store,
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
                          checkBoxShiftClick(
                            prevCheckBoxIndex()!,
                            index(),
                            store,
                          );
                          setPrevCheckBoxIndex(null);
                        }
                      }}
                      isFocus={props.focusFieldKey === key}
                    />
                  </div>
                );
              }
            }
          }}
        </For>
      </div>
    </div>
  );
};
