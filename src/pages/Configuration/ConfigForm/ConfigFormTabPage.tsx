import { ConfigTuneType } from "src-tauri/generated/config/ConfigTune";
import { ConfigCalibrationType } from "src-tauri/generated/config/ConfigCalibration";
import { ConfigSystemType } from "src-tauri/generated/config/ConfigSystem";
import { ConfigType } from "src-tauri/generated/config/ConfigType";
import { AccordionStates } from "./ConfigForm";
import { LinkStates } from "./ConfigForm";
import { GainLockStates } from "./ConfigForm";
import { JSX, onMount, For } from "solid-js";
import { createStore } from "solid-js/store";
import { Accordion } from "../../../components/ui/accordion";
import { FormNumberInput } from "../../../components/Form/FormNumberInput";
import { Text } from "../../../components/ui/text";
import { IconChevronDown } from "@tabler/icons-solidjs";
import { ConfigFormatObject } from "./ConfigFormatObject";

export type ConfigFormTabPageProps = {
  id: string;
  format: ConfigTuneType | ConfigCalibrationType | ConfigSystemType;
  config: ConfigType;
  originalFile?: ConfigType;
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

  return (
    <div
      id={props.id}
      ref={ref}
      style={{
        width: "100%",
        height: "100%",
        "overflow-y": "auto",
        "border-width": "0",
      }}
      onScroll={(e) => {
        props.formOverflowY.set(props.id, e.target.scrollTop);
      }}
    >
      <For each={Object.entries(props.format)}>
        {(entry) => {
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
                    style={{ "border-top-width": "1px" }}
                  >
                    <Accordion.ItemTrigger
                      fontSize={"1rem"}
                      padding={"0.7rem 0.5rem 0.7rem 0.5rem"}
                    >
                      <Text>{key}</Text>
                      <Accordion.ItemIndicator>
                        <IconChevronDown />
                      </Accordion.ItemIndicator>
                    </Accordion.ItemTrigger>
                    <Accordion.ItemContent padding="0rem 0.5rem 0.5rem 0.5rem">
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
              );
            }
          }
        }}
      </For>
    </div>
  );
};
