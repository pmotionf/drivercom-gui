import { AccordionStates } from "./ConfigForm";
import { LinkStates } from "./ConfigForm";
import { GainLockStates } from "./ConfigForm";
import { createStore } from "solid-js/store";
import { Show, For, createSignal, onMount } from "solid-js";
import * as Accordion from "../../../components/ui/accordion";
import { IconButton } from "../../../components/ui/icon-button";
import { Text } from "../../../components/ui/text";
import { FormNumberInput } from "../../../components/Form/FormNumberInput";
import { FormCheckBox } from "../../../components/Form/FormCheckBox";

import {
  IconLock,
  IconLockOff,
  IconLink,
  IconLinkOff,
  IconChevronDown,
} from "@tabler/icons-solidjs";
import { prettierLabel } from "~/utils/PrettierLabel";
import { FlipSensorExample } from "./FlipSensorExample";
import { SwapSensorExample } from "./SwapSensorExample";

export type ConfigFormatObjectProps = {
  id: string;
  config: object;
  format: object;
  originalFile?: object;
  description?: object;
  changeUnit?: boolean;
  accordionStatuses?: AccordionStates;
  linkKey?: string;
  linkedStatuses?: LinkStates;
  gainLockStatuses?: GainLockStates;
};

export const ConfigFormatObject = (props: ConfigFormatObjectProps) => {
  const [store, setStore] = createStore<object>(props.config);
  const [render, setRender] = createSignal<boolean>(false);

  let mapKey: string | undefined = props.linkKey;
  const entries = Object.entries(props.format);

  onMount(() => {
    checkLinkField();
    setRender(true);
  });

  const checkLinkField = () => {
    if (props.id.split(".").pop() === "flags") return;
    const objects = entries.filter(
      (entry) =>
        typeof entry[1] === "object" &&
        !Object.values(entry[1])
          .map((val) => typeof val)
          .includes("boolean"),
    );
    const parseFields = objects.map((entry) => {
      return { key: entry[0], fields: Object.keys(entry[1]).join(",") };
    });
    if (parseFields.length > 0) {
      const checkDuplicateField = [
        ...new Set([...parseFields.map((field) => field.fields)]),
      ];
      if (parseFields.length !== checkDuplicateField.length) {
        mapKey = parseFields[0].fields;
        if (props.linkedStatuses && !props.linkedStatuses.has(mapKey)) {
          props.linkedStatuses.set(
            mapKey,
            createSignal<[boolean, string]>([false, ""]),
          );
        }
      }
    }
  };

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
    <Show when={render()}>
      <For each={entries}>
        {(entry, index) => {
          const key = entry[0];
          const value = entry[1];
          const id = props.id + "." + key;
          const config = props.config[`${key}` as keyof typeof props.config];
          const originalFile = props.originalFile
            ? props.originalFile[key as keyof typeof props.originalFile]
            : null;
          const label = !isNaN(Number(key))
            ? `${props.id.split(".").pop()} ${Number(key) + 1}`
            : key;
          const description = props.description
            ? props.description[key as keyof typeof props.description]
            : undefined;
          const descriptionText = props.description
            ? props.description[`__${key}` as keyof typeof props.description]
            : null;

          if (typeof value === "object") {
            const innerValues = Object.values(value);
            if (
              innerValues.length === 1 &&
              typeof innerValues[0] === "object" &&
              innerValues[0]
            ) {
              const innerKey = Object.keys(value)[0];
              const innerId = id + "." + innerKey;
              const innerConfig = () => config[innerKey as keyof typeof config];
              const innerOriginalFile = originalFile
                ? originalFile[innerKey as keyof typeof originalFile]
                : null;
              const innerLabel = !isNaN(Number(key))
                ? `${props.id.split(".").pop()} ${Number(innerKey) + 1}`
                : innerKey;
              const accordionItemValue = label + "." + key + "." + innerKey;
              const innerDesc = description
                ? description[innerKey as keyof typeof description]
                : null;
              const innderDescText = description
                ? description[`__${innerKey}` as keyof typeof description]
                : null;

              if (
                props.accordionStatuses &&
                !props.accordionStatuses.has(innerId)
              ) {
                props.accordionStatuses.set(innerId, [accordionItemValue]);
              }

              if (
                props.gainLockStatuses &&
                !props.gainLockStatuses.has(innerId) &&
                innerId.includes("gain")
              ) {
                props.gainLockStatuses.set(
                  innerId,
                  createSignal<boolean>(false),
                );
              }

              return (
                <Accordion.Root
                  multiple
                  style={{ "border-width": "0px" }}
                  defaultValue={props.accordionStatuses!.get(innerId)!}
                  onValueChange={(details) => {
                    if (props.accordionStatuses) {
                      props.accordionStatuses.set(innerId, details.value);
                    }
                  }}
                >

                  <Accordion.Item
                    value={accordionItemValue}
                    borderRadius={"0.2rem"}
                    padding={
                      props.linkedStatuses &&
                      props.linkedStatuses.has(Object.keys(value).join(","))
                        ? "0.5rem"
                        : "0"
                    }
                  >
                    <Accordion.ItemTrigger
                      fontSize={
                        props.linkedStatuses &&
                        props.linkedStatuses.has(Object.keys(value).join(","))
                          ? "0.9rem"
                          : "0.8rem"
                      }
                      justifyContent={"left"}
                      alignItems={"center"}
                      paddingBottom={
                        props.linkedStatuses &&
                        props.linkedStatuses.has(Object.keys(value).join(","))
                          ? "0.5rem"
                          : "0.5rem"
                      }
                      borderBottomWidth={"1px"}
                      paddingTop={
                        props.linkedStatuses &&
                        props.linkedStatuses.has(Object.keys(value).join(","))
                          ? "0.2rem"
                          : "0.2rem"
                      }
                    >
                      <div
                        style={{
                          width: "50%",
                          display: "flex",
                          gap: "0.5rem",
                          "align-items": "center",
                        }}
                      >
                        <Text
                          fontWeight={"bold"}
                          opacity={
                            props.linkedStatuses &&
                            props.linkedStatuses.has(
                              Object.keys(value).join(","),
                            )
                              ? "0.7"
                              : "0.8rem"
                          }
                        >{`${prettierLabel(label)} ${prettierLabel(innerLabel)}`}</Text>

                        <Show when={innderDescText}>
                          <Text
                            textStyle="xs"
                            fontWeight="light"
                            style={{
                              width: "100%",
                            }}
                            color="gray.9"
                          >
                            {
                              innderDescText![
                                "description" as keyof typeof innderDescText
                              ]
                            }
                          </Text>
                        </Show>
                        <Show
                          when={
                            props.gainLockStatuses &&
                            props.gainLockStatuses.get(innerId)
                          }
                        >
                          <IconButton
                            size="xs"
                            variant={"plain"}
                            opacity={
                              props.gainLockStatuses!.get(innerId)![0]()
                                ? "1"
                                : "0.5"
                            }
                            onClick={(e) => {
                              e.stopPropagation();
                              const lockEntries = Array.from(
                                props.gainLockStatuses!.entries(),
                              );

                              const isLinked =
                                typeof props.linkedStatuses !== "undefined" &&
                                typeof mapKey !== "undefined" &&
                                props.linkedStatuses.get(mapKey)![0]()[0];

                              const dynPos = innerId.includes("center")
                                ? "center"
                                : "between";

                              const filterEntries = isLinked
                                ? lockEntries
                                : lockEntries.filter((entry) =>
                                    entry[0].includes(dynPos),
                                  );
                              const updateValue = filterEntries
                                .map((entry) => entry[1][0]())
                                .includes(false);
                              filterEntries.forEach((entry) => {
                                const key = entry[0];
                                props.gainLockStatuses!.get(key)![1](
                                  updateValue,
                                );
                              });
                            }}
                          >
                            <Show
                              when={props.gainLockStatuses!.get(innerId)![0]()}
                              fallback={<IconLockOff />}
                            >
                              <IconLock />
                            </Show>
                          </IconButton>
                        </Show>
                        <Show
                          when={
                            props.linkedStatuses &&
                            props.linkedStatuses.has(
                              Object.keys(value).join(","),
                            )
                          }
                        >
                          <IconButton
                            size="xs"
                            disabled={
                              props.gainLockStatuses &&
                              props.gainLockStatuses.size >= 12
                                ? Array.from(props.gainLockStatuses.entries())
                                    .filter((entry) =>
                                      entry[0].includes("center"),
                                    )
                                    .map(
                                      (entry) =>
                                        entry[1][0]() !==
                                        props.gainLockStatuses!.get(
                                          entry[0].replace("center", "between"),
                                        )![0](),
                                    )
                                    .includes(true)
                                : false
                            }
                            variant={"plain"}
                            opacity={
                              props.linkedStatuses!.get(
                                Object.keys(value).join(","),
                              )![0]()[0]
                                ? "1"
                                : "0.5"
                            }
                            onClick={(e) => {
                              e.stopPropagation();
                              if (
                                props.gainLockStatuses &&
                                props.gainLockStatuses.size >= 12 &&
                                Array.from(props.gainLockStatuses.entries())
                                  .filter((entry) =>
                                    entry[0].includes("center"),
                                  )
                                  .map(
                                    (entry) =>
                                      entry[1][0]() !==
                                      props.gainLockStatuses!.get(
                                        entry[0].replace("center", "between"),
                                      )![0](),
                                  )
                                  .includes(true)
                              ) {
                                return;
                              }
                              const [link, setLink] = props.linkedStatuses!.get(
                                Object.keys(value).join(","),
                              )!;
                              setLink([!link()[0], link()[1]]);
                            }}
                          >
                            <Show
                              when={
                                props.linkedStatuses!.get(
                                  Object.keys(value).join(","),
                                )![0]()[0]
                              }
                              fallback={<IconLinkOff />}
                            >
                              <IconLink />
                            </Show>
                          </IconButton>
                        </Show>
                      </div>
                      <Accordion.ItemIndicator marginLeft={`50%`}>
                        <IconChevronDown />
                      </Accordion.ItemIndicator>
                    </Accordion.ItemTrigger>
                    <Accordion.ItemContent
                      padding={"0rem 0.5rem 0.5rem 0.5rem"}
                      borderWidth={"0px 1px 1px 1px"}
                    >
                      <ConfigFormatObject
                        id={innerId}
                        format={innerValues[0]}
                        config={innerConfig()}
                        originalFile={
                          innerOriginalFile &&
                          typeof innerOriginalFile === "object"
                            ? innerOriginalFile
                            : undefined
                        }
                        description={innerDesc ?? undefined}
                        changeUnit={props.changeUnit}
                        linkKey={mapKey}
                        linkedStatuses={props.linkedStatuses}
                        accordionStatuses={props.accordionStatuses}
                        gainLockStatuses={props.gainLockStatuses}
                      />
                    </Accordion.ItemContent>
                  </Accordion.Item>
                </Accordion.Root>
              );
            } else {
              const accordionItemValue = label + "." + key;
              if (props.accordionStatuses && !props.accordionStatuses.has(id)) {
                props.accordionStatuses.set(id, [accordionItemValue]);
              }
              return (
                <Accordion.Root
                  multiple
                  style={{ "border-width": "0px" }}
                  defaultValue={
                    props.accordionStatuses
                      ? props.accordionStatuses.get(id)!
                      : undefined
                  }
                  onValueChange={(details) => {
                    if (props.accordionStatuses) {
                      props.accordionStatuses.set(id, details.value);
                    }
                  }}>

                  <Accordion.Item
                    value={accordionItemValue}
                    borderRadius={"0.2rem"}
                    padding={
                      props.linkedStatuses &&
                      props.linkedStatuses.has(Object.keys(value).join(","))
                        ? "0.5rem"
                        : "0"
                    }
                  >
                    <Accordion.ItemTrigger
                      fontSize={
                        props.linkedStatuses &&
                        props.linkedStatuses.has(Object.keys(value).join(","))
                          ? "0.9rem"
                          : "0.8rem"
                      }
                      justifyContent={"left"}
                      alignItems={"center"}
                      paddingBottom={
                        props.linkedStatuses &&
                        props.linkedStatuses.has(Object.keys(value).join(","))
                          ? "0.5rem"
                          : "0.5rem"
                      }
                      borderBottomWidth={"1px"}
                      paddingTop={
                        props.linkedStatuses &&
                        props.linkedStatuses.has(Object.keys(value).join(","))
                          ? "0.2rem"
                          : "0.2rem"
                      }
                    >
                      <div
                        style={{
                          width: "50%",
                          display: "flex",
                          gap: "0.5rem",
                          "align-items": "center",
                        }}
                      >
                        <div
                          style={{
                            width: descriptionText ? "20rem" : "unset",
                          }}
                        >
                          <Text
                            fontWeight={"bold"}
                            opacity={
                              props.linkedStatuses &&
                              props.linkedStatuses.has(
                                Object.keys(value).join(","),
                              )
                                ? "0.7"
                                : "0.8rem"
                            }
                          >
                            {prettierLabel(label)}
                          </Text>

                          <Show when={descriptionText}>
                            <Text
                              textStyle="xs"
                              fontWeight="light"
                              style={{
                                width: "100%",
                              }}
                              color="fg.muted"
                            >
                              {
                                descriptionText![
                                  "description" as keyof typeof descriptionText
                                ]
                              }
                              <Show
                                when={label.toLowerCase() === "flip_sensors"}
                              >
                                <FlipSensorExample />
                              </Show>
                              <Show
                                when={label.toLowerCase() === "swap_sensors"}
                              >
                                <SwapSensorExample />
                              </Show>
                            </Text>
                          </Show>

                        </div>

                        <Show
                          when={
                            props.linkedStatuses &&
                            props.linkedStatuses.has(
                              Object.keys(value).join(","),
                            )
                          }
                        >
                          <IconButton
                            size="xs"
                            variant={"plain"}
                            opacity={
                              props.linkedStatuses!.get(
                                Object.keys(value).join(","),
                              )![0]()[0]
                                ? "1"
                                : "0.5"
                            }
                            onClick={(e) => {
                              e.stopPropagation();
                              const [link, setLink] = props.linkedStatuses!.get(
                                Object.keys(value).join(","),
                              )!;
                              setLink([!link()[0], link()[1]]);
                            }}
                          >
                            <Show
                              when={
                                props.linkedStatuses!.get(
                                  Object.keys(value).join(","),
                                )![0]()[0]
                              }
                              fallback={<IconLinkOff />}
                            >
                              <IconLink />
                            </Show>
                          </IconButton>
                        </Show>
                      </div>
                      <div
                        style={{
                          width: "100%",
                          display: "flex",
                          "flex-direction": "row-reverse",
                        }}
                      >
                        <Accordion.ItemIndicator>
                          <IconChevronDown />
                        </Accordion.ItemIndicator>
                      </div>
                    </Accordion.ItemTrigger>
                    <Accordion.ItemContent
                      padding={"0rem 0.5rem 0.5rem 0.5rem"}
                      borderWidth={"0px 1px 1px 1px"}
                    >
                      <ConfigFormatObject
                        id={id}
                        format={value}
                        config={config}
                        originalFile={
                          originalFile && typeof originalFile === "object"
                            ? originalFile
                            : undefined
                        }
                        description={description ?? undefined}
                        changeUnit={props.changeUnit}
                        accordionStatuses={props.accordionStatuses}
                        gainLockStatuses={props.gainLockStatuses}
                        linkKey={mapKey}
                        linkedStatuses={props.linkedStatuses}
                      />
                    </Accordion.ItemContent>
                  </Accordion.Item>

                </Accordion.Root>
              );
            }
          } else if (typeof value === "number") {
            if (key === "_") return;

            if (id.includes(`gain`) && !id.includes("denominator")) {
              if (props.gainLockStatuses && !props.gainLockStatuses.has(id)) {
                props.gainLockStatuses.set(id, createSignal<boolean>(false));
              }
            }

            return (
              <div
                style={{ "border-top-width": index() === 0 ? "0px" : "1px" }}
              >
                <FormNumberInput
                  id={id}
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
                  changeUnits={props.changeUnit}
                  lockStatus={props.gainLockStatuses}
                  lockStatusKey={id}
                  linkStatus={props.linkedStatuses}
                  inputValue={store[key as keyof typeof store]}
                  onInputChange={(value) => {
                    if (props.linkKey && props.linkedStatuses) {
                      const parseLinkKey = props.linkKey.split(",");
                      if (parseLinkKey.some((field) => id.includes(field))) {
                        const isGain =
                          id.includes("gain") ||
                          id.includes("center") ||
                          id.includes("between");
                        const linkString = isGain
                          ? props.id.includes("center")
                            ? "center"
                            : "between"
                          : id
                              .split(".")
                              .filter((key) => !isNaN(Number(key)))[0];
                        props.linkedStatuses.get(props.linkKey)![1]((prev) => [
                          prev[0],
                          linkString,
                        ]);
                      }
                    }
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
          } else if (typeof value === "boolean") {
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
                      checkBoxShiftClick(prevCheckBoxIndex()!, index(), store);
                      setPrevCheckBoxIndex(null);
                    }
                  }}
                />
              </div>
            );
          }
        }}
      </For>
    </Show>
  );
};
