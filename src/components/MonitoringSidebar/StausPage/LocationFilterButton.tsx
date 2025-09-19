import { Popover } from "~/components/ui/popover";
import { IconButton } from "~/components/ui/icon-button";
import { IconFilter2 } from "@tabler/icons-solidjs";
import { Stack } from "styled-system/jsx";
import { Checkbox } from "~/components/ui/checkbox";
import { Input } from "~/components/ui/input";
import { Text } from "~/components/ui/text";
import { Button } from "~/components/ui/button";
import { createSignal } from "solid-js";

export type LocationFilterButtonProps = {
  locationFilter: LocationFilter;
  onApply?: (locationFilter: LocationFilter) => void;
};

export type LocationFilter = {
  axis: {
    show: boolean;
    ids?: { min: number; max?: number };
  };
  driver: {
    show: boolean;
    ids?: { min: number; max?: number };
  };
};

export const LocationFilterButton = (props: LocationFilterButtonProps) => {
  const [filter, setFilter] = createSignal<LocationFilter>(
    props.locationFilter,
  );

  const [driverStartId, setDriverStartId] = createSignal<string>("");
  const [driverEndId, setDriverEndId] = createSignal<string>("");
  const [driverRange, setDriverRange] = createSignal<boolean>(false);

  const [axisStartId, setAxisStartId] = createSignal<string>("");
  const [axisEndId, setAxisEndId] = createSignal<string>("");
  const [axisRange, setAxisRange] = createSignal<boolean>(false);

  return (
    <Popover.Root positioning={{ placement: "bottom-start" }}>
      <Popover.Trigger width="min-content">
        <IconButton size="xs" variant="ghost">
          <IconFilter2 />
        </IconButton>
      </Popover.Trigger>
      <Popover.Positioner>
        <Popover.Content width="12rem" fontWeight="medium" gap="0.5rem">
          <fieldset
            style={{
              "border-width": "1px",
              padding: "0 0.5rem 0.5rem 0.5rem",
              "border-radius": "0.5rem",
            }}
          >
            <legend>
              <Stack direction="row">
                <Checkbox
                  size="sm"
                  checked={filter().driver.show ? true : false}
                  onCheckedChange={(details) =>
                    setFilter((prev) => {
                      return {
                        ...prev,
                        driver: {
                          show: details.checked ? true : false,
                          ids: prev.axis.ids,
                        },
                      };
                    })
                  }
                >
                  <Text fontWeight="bold">Driver</Text>
                </Checkbox>
              </Stack>
            </legend>
            <Stack direction="row" gap="1.2rem" marginBottom="0.2em">
              <Text width="50%">ID</Text>
              <Checkbox
                width="50%"
                gap="0.5"
                size="sm"
                padding="0"
                margin="0"
                checked={driverRange() ? true : false}
                onCheckedChange={(e) =>
                  setDriverRange(e.checked ? true : false)
                }
              >
                Range
              </Checkbox>
            </Stack>
            <Stack direction="row" alignItems="center">
              <Input
                disabled={!filter().driver.show}
                width="50%"
                height={"1.8em"}
                value={driverStartId()}
                onChange={(e) => {
                  if (!isNaN(Number(e.currentTarget.value))) {
                    setDriverStartId(e.currentTarget.value);
                  } else {
                    const prevId = driverStartId();
                    setDriverStartId("");
                    setDriverStartId(prevId);
                  }
                }}
              />
              <Text opacity={driverRange() ? "1" : "0.5"}>-</Text>
              <Input
                disabled={!driverRange()}
                width="50%"
                height={"1.8em"}
                value={driverEndId()}
                onChange={(e) => {
                  if (!isNaN(Number(e.currentTarget.value))) {
                    if (Number(e.target.value) <= Number(driverStartId())) {
                      setDriverEndId("");
                      const newId = Number(driverStartId()) + 1;
                      setDriverEndId(newId.toString());
                      return;
                    }
                    setDriverEndId(e.currentTarget.value);
                  } else {
                    const prevId = driverEndId();
                    setDriverStartId("");
                    setDriverStartId(prevId);
                  }
                }}
              />
            </Stack>
          </fieldset>

          <fieldset
            style={{
              "border-width": "1px",
              padding: "0 0.5rem 0.5rem 0.5rem",
              "border-radius": "0.5rem",
            }}
          >
            <legend>
              <Stack direction="row">
                <Checkbox
                  size="sm"
                  checked={filter().axis.show ? true : false}
                  onCheckedChange={(details) =>
                    setFilter((prev) => {
                      return {
                        ...prev,
                        axis: {
                          show: details.checked ? true : false,
                          ids: prev.driver.ids,
                        },
                      };
                    })
                  }
                >
                  <Text fontWeight="bold">Axis</Text>
                </Checkbox>
              </Stack>
            </legend>
            <Stack direction="row" gap="1.2rem" marginBottom="0.2em">
              <Text width="50%">ID</Text>
              <Checkbox
                width="50%"
                gap="0.5"
                size="sm"
                padding="0"
                margin="0"
                checked={axisRange() ? true : false}
                onCheckedChange={(e) => setAxisRange(e.checked ? true : false)}
              >
                Range
              </Checkbox>
            </Stack>
            <Stack direction="row" alignItems="center">
              <Input
                disabled={!filter().axis.show}
                width="50%"
                height={"1.8em"}
                value={axisStartId()}
                onChange={(e) => {
                  if (!isNaN(Number(e.currentTarget.value))) {
                    setAxisStartId(e.currentTarget.value);
                  } else {
                    const prevId = driverStartId();
                    setAxisStartId("");
                    setAxisStartId(prevId);
                  }
                }}
              />
              <Text opacity={axisRange() ? "1" : "0.5"}>-</Text>
              <Input
                disabled={!axisRange()}
                width="50%"
                height={"1.8em"}
                value={axisEndId()}
                onChange={(e) => {
                  if (!isNaN(Number(e.currentTarget.value))) {
                    if (Number(e.target.value) <= Number(axisStartId())) {
                      setAxisEndId("");
                      const newId = Number(axisStartId()) + 1;
                      setAxisEndId(newId.toString());
                      return;
                    }
                    setAxisEndId(e.currentTarget.value);
                  } else {
                    const prevId = driverEndId();
                    setAxisStartId("");
                    setAxisStartId(prevId);
                  }
                }}
              />
            </Stack>
          </fieldset>

          <Stack width="100%" direction={"row-reverse"} gap="0.5rem">
            <Popover.CloseTrigger>
              <Button
                size="sm"
                padding="0em 0.5em 0em 0.5em"
                height="2em"
                marginRight="0.5rem"
                fontWeight={"medium"}
                onClick={() => {
                  setFilter({
                    axis: {
                      show: filter().axis.show,
                      ids:
                        axisStartId().length > 0
                          ? {
                              min: Number(axisStartId()),
                              max: axisRange()
                                ? Number(axisEndId())
                                : undefined,
                            }
                          : undefined,
                    },
                    driver: {
                      show: filter().driver.show,
                      ids:
                        driverStartId().length > 0
                          ? {
                              min: Number(driverStartId()),
                              max: driverRange()
                                ? Number(driverEndId())
                                : undefined,
                            }
                          : undefined,
                    },
                  });
                  props.onApply?.(filter());
                  setAxisStartId("");
                  setAxisEndId("");
                  setDriverStartId("");
                  setDriverEndId("");
                }}
              >
                Apply
              </Button>
              <Button
                size="sm"
                variant="outline"
                padding="0em 0.5em 0em 0.5em"
                height="2em"
                fontWeight={"medium"}
              >
                Cancel
              </Button>
            </Popover.CloseTrigger>
          </Stack>
        </Popover.Content>
      </Popover.Positioner>
    </Popover.Root>
  );
};
