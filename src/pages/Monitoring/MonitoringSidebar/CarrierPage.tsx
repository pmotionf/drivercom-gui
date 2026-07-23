import { Accessor, For, JSX, Setter, createSignal } from "solid-js";
import { Response_Line_Carrier_State } from "~/proto/mmc/info_pb";
import { Accordion } from "~/components/ui/accordion";
import { IconChevronDown } from "@tabler/icons-solidjs";
import { Text } from "~/components/ui/text";
import { Input } from "~/components/ui/input";
import { ToggleGroup } from "~/components/ui/toggle-group";
import { Button } from "~/components/ui/button";
import { Select } from "~/components/ui/select";
import { createListCollection, ListCollection } from "@ark-ui/solid";
import { SendingCommand } from "../System/System";
import { Show } from "solid-js";

export type CarrierPageProps = JSX.HTMLAttributes<HTMLDivElement> & {
  carrierStates: CarrierState[];
  onCarrierMove?: (
    line: string,
    carrier: number,
    targetKind: TargetKind,
    targetValue: string,
    controlMode?: string,
    cas?: string,
  ) => void;
  sendingCommand: SendingCommand | null;
};

export type CarrierState = {
  lineName: string;
  carrierStates: Response_Line_Carrier_State[];
};

enum ControlMode {
  Position = "Position",
  Velocity = "Velocity",
}

enum TargetKind {
  Axis = "axis",
  Location = "location",
  Distance = "distance",
}

export function CarrierPage(props: CarrierPageProps) {
  const casMap: Map<string, [Accessor<boolean>, Setter<boolean>]> = new Map();
  const controlModeMap: Map<
    string,
    [Accessor<ControlMode>, Setter<ControlMode>]
  > = new Map();
  const targetKindMap: Map<string, [Accessor<TargetKind>, Setter<TargetKind>]> =
    new Map();
  const targetValueMap: Map<string, [Accessor<string>, Setter<string>]> =
    new Map();
  const [lastCommandKey, setLastCommandKey] = createSignal<string>("");

  const targetKindList = [
    { label: TargetKind.Axis, value: TargetKind.Axis },
    {
      label: TargetKind.Distance,
      value: TargetKind.Distance,
    },
    {
      label: TargetKind.Location,
      value: TargetKind.Location,
    },
  ];
  const targetKindCollection: ListCollection = createListCollection({
    items: targetKindList,
  });

  const carrierStates = () => {
    return props.carrierStates;
  };

  const moveCarrierHandler = (
    mapKey: string,
    line: string,
    carrierId: number,
    targetKind: TargetKind,
    targetValue: string,
    controlMode: ControlMode,
    cas?: boolean,
  ) => {
    setLastCommandKey(mapKey);
    console.log(targetKind);
    props.onCarrierMove?.(
      line,
      carrierId,
      targetKind,
      targetValue,
      controlMode,
      cas ? undefined : "off",
    );
  };

  return (
    <div style={{ width: "100%", height: "100%" }}>
      <Accordion.Root width="100%" height={"100%"} multiple borderWidth={"0"}>
        <For each={carrierStates()}>
          {(carrier) => {
            return (
              <Show when={carrier.carrierStates.length >= 1}>
                <Accordion.Item
                  value={carrier.lineName}
                  borderBottomWidth={"1px"}
                >
                  <Accordion.ItemTrigger justifyContent="left">
                    <Accordion.ItemIndicator>
                      <IconChevronDown />
                    </Accordion.ItemIndicator>
                    {carrier.lineName}
                  </Accordion.ItemTrigger>

                  <Accordion.ItemContent>
                    <For each={carrier.carrierStates}>
                      {(carrierState) => {
                        const mapKey = `${carrier.lineName}${carrierState.id}`;
                        if (!casMap.has(mapKey)) {
                          casMap.set(
                            mapKey,
                            createSignal<boolean>(!carrierState.casDisabled),
                          );
                        }
                        const [cas, setCas] = casMap.get(mapKey)!;

                        if (!controlModeMap.has(mapKey)) {
                          controlModeMap.set(
                            mapKey,
                            createSignal<ControlMode>(ControlMode.Position),
                          );
                        }
                        const [controlMode, setControlMode] =
                          controlModeMap.get(mapKey)!;

                        if (!targetKindMap.has(mapKey)) {
                          targetKindMap.set(
                            mapKey,
                            createSignal<TargetKind>(TargetKind.Axis),
                          );
                        }
                        const [targetKind, setTargetKind] =
                          targetKindMap.get(mapKey)!;

                        if (!targetValueMap.has(mapKey)) {
                          targetValueMap.set(mapKey, createSignal<string>(""));
                        }
                        const [targetValue, setTargetValue] =
                          targetValueMap.get(mapKey)!;

                        return (
                          <div
                            style={{
                              display: "grid",
                              "grid-auto-columns": `14rem 8rem 3rem 3rem`,
                              "column-gap": "0.5rem",
                              "row-gap": "0.5rem",
                              "grid-auto-rows": `1rem 1rem 2.5rem`,
                              "margin-bottom": "1rem",
                            }}
                          >
                            <Text
                              fontSize="md"
                              fontWeight="bold"
                              style={{ "grid-row": 1, "grid-column": 1 }}
                            >
                              {`Carrier ${carrierState.id}`}
                            </Text>
                            <Text style={{ "grid-row": 2, "grid-column": 1 }}>
                              {"Target"}
                            </Text>
                            <div
                              style={{
                                display: "flex",
                                "grid-row": 3,
                                "grid-column": 1,
                                width: "100%",
                              }}
                            >
                              <Input
                                value={targetValue()}
                                onInput={(e) => setTargetValue(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key.toLowerCase() === "enter") {
                                    moveCarrierHandler(
                                      mapKey,
                                      carrier.lineName,
                                      carrierState.id,
                                      targetKind(),
                                      targetValue(),
                                      controlMode(),
                                      cas(),
                                    );
                                  }
                                }}
                                style={{
                                  width: "50%",
                                  "border-top-right-radius": "0rem",
                                  "border-bottom-right-radius": "0rem",
                                }}
                              />
                              <Select.Root
                                positioning={{ sameWidth: true }}
                                width="sm"
                                collection={targetKindCollection}
                                defaultValue={[targetKind()]}
                                onValueChange={(details) => {
                                  const currentItemLabel =
                                    details.items[0].label;
                                  const newTargetKind =
                                    currentItemLabel === "axis"
                                      ? TargetKind.Axis
                                      : currentItemLabel === "distance"
                                        ? TargetKind.Distance
                                        : TargetKind.Location;
                                  setTargetKind(newTargetKind);
                                  console.log(targetKind());
                                }}
                              >
                                <Select.Control>
                                  <Select.Trigger
                                    width="6rem"
                                    borderLeftWidth={"0px"}
                                    borderTopLeftRadius={"0rem"}
                                    borderBottomLeftRadius={"0rem"}
                                  >
                                    <Select.ValueText
                                      placeholder={`Select target`}
                                    />
                                  </Select.Trigger>
                                </Select.Control>
                                <Select.Positioner>
                                  <Select.Content>
                                    <For each={targetKindCollection.items}>
                                      {(item) => (
                                        <Select.Item item={item}>
                                          <Select.ItemText>
                                            {item.label}
                                          </Select.ItemText>
                                          <Select.ItemIndicator></Select.ItemIndicator>
                                        </Select.Item>
                                      )}
                                    </For>
                                  </Select.Content>
                                </Select.Positioner>
                              </Select.Root>
                            </div>

                            <Text style={{ "grid-row": 2, "grid-column": 2 }}>
                              {"Control Mode"}
                            </Text>
                            <ToggleGroup.Root
                              style={{ "grid-row": 3, "grid-column": 2 }}
                              value={[controlMode()]}
                              onValueChange={(details) =>
                                setControlMode(
                                  ControlMode[
                                    details.value[0] as keyof typeof ControlMode
                                  ],
                                )
                              }
                            >
                              <ToggleGroup.Item
                                value={ControlMode.Position}
                                width={"50%"}
                              >
                                {"Position"}
                              </ToggleGroup.Item>
                              <ToggleGroup.Item
                                value={ControlMode.Velocity}
                                width={"50%"}
                              >
                                {"Velocity"}
                              </ToggleGroup.Item>
                            </ToggleGroup.Root>
                            <Text style={{ "grid-row": 2, "grid-column": 3 }}>
                              {"CAS"}
                            </Text>
                            <Button
                              variant={cas() ? "solid" : "outline"}
                              style={{ "grid-row": 3, "grid-column": 3 }}
                              onClick={() => setCas(!cas())}
                            >
                              {cas() ? "on" : "off"}
                            </Button>
                            <Button
                              style={{ "grid-row": 3, "grid-column": 4 }}
                              disabled={
                                props.sendingCommand
                                  ? props.sendingCommand.line ===
                                    carrier.lineName
                                    ? props.sendingCommand.movingCarrier &&
                                      lastCommandKey() === mapKey
                                      ? false
                                      : true
                                    : true
                                  : false
                              }
                              loading={
                                props.sendingCommand &&
                                props.sendingCommand!.line ===
                                  carrier.lineName &&
                                props.sendingCommand!.movingCarrier &&
                                lastCommandKey() === mapKey
                                  ? true
                                  : false
                              }
                              onClick={() => {
                                moveCarrierHandler(
                                  mapKey,
                                  carrier.lineName,
                                  carrierState.id,
                                  targetKind(),
                                  targetValue(),
                                  controlMode(),
                                  cas(),
                                );
                              }}
                            >
                              {"Move"}
                            </Button>
                          </div>
                        );
                      }}
                    </For>
                  </Accordion.ItemContent>
                </Accordion.Item>
              </Show>
            );
          }}
        </For>
      </Accordion.Root>
    </div>
  );
}

export default CarrierPage;
