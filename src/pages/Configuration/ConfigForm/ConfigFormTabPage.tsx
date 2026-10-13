import { AccordionStates } from "./ConfigForm";
import { LinkStates } from "./ConfigForm";
import { GainLockStates } from "./ConfigForm";
import { JSX, onMount, For, createSignal } from "solid-js";
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

export type ConfigFormTabPageProps = {
  id: string;
  format: object;
  config: object;
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
        }, 0);
      }
    }
  });

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
        padding: "0rem 1rem 0rem 1rem",
        display: "flex",
      }}
      onScroll={(e) => {
        props.formOverflowY.set(props.id, e.target.scrollTop);
      }}
    >
      <div style={{ width: "100%", height: "100%", "min-width": "32rem" }}>
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
                    multiple
                    style={{ "border-width": "0" }}
                    defaultValue={getAccordionValue()}
                    onValueChange={(details) => {
                      if (props.accordionStatuses) {
                        props.accordionStatuses.set(id, details.value);
                      }
                    }}
                  >
                    <Accordion.Item
                      value={accordionItemValue}
                      borderRadius={"0.2rem"}
                    >
                      <Accordion.ItemTrigger
                        fontSize={"1rem"}
                        fontWeight={"bold"}
                        borderBottomWidth={"1px"}
                      >
                        <Text>{prettierLabel(key)}</Text>
                        <Accordion.ItemIndicator>
                          <IconChevronDown />
                        </Accordion.ItemIndicator>
                      </Accordion.ItemTrigger>
                      <Accordion.ItemContent
                        padding={"0rem 0.5rem 0.5rem 0.5rem"}
                        borderWidth={"0px 1px 1px 1px"}
                        borderRadius={"0.2rem"}
                      >
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
                    }}
                  >
                    <FormNumberInput
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
                      inputValue={Number(store[key as keyof typeof store])}
                      onInputChange={(value) => {
                        setStore(
                          key as keyof typeof store,
                          // @ts-ignore: TSC unable to handle generic object type
                          // in store
                          value,
                        );
                      }}
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
                      "grid-template-columns": `15rem minmax(0,1fr)`,
                      "align-items": "center",
                    }}
                  >
                    <Text>{"cc_link_speed"}</Text>
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
                        <Select.Trigger borderColor={"gray.4"}>
                          <Select.ValueText
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
