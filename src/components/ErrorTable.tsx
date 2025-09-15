import { createSignal, JSX } from "solid-js";
import { Table } from "~/components/ui/table.tsx";
import { For, createEffect, on } from "solid-js";
import { Text } from "./ui/text";
import {
  Response_Track_Axis_Error,
  Response_Track_Driver_Error,
  /*@ts-ignore Ignore git acticon type check */
} from "./proto/mmc/info_pb";
import { Show } from "solid-js";
import { IconButton } from "./ui/icon-button";
import { IconFilter2 } from "@tabler/icons-solidjs";
import { Menu } from "./ui/menu";

type ErrorTable = {
  location: string;
  error: string[];
};

type ErrorTableProps = JSX.HTMLAttributes<HTMLDivElement> & {
  systemErrors: {
    lineName: string;
    axisErrors: Response_Track_Axis_Error[];
    driverErrors: Response_Track_Driver_Error[];
  }[];
};

enum ErrorKind {
  Driver = "Driver",
  Axis = "Axis",
}

export const ErrorTable = (props: ErrorTableProps) => {
  const systemErrors = () => props.systemErrors;

  console.log(Object.values(ErrorKind));

  createEffect(
    on(
      () => systemErrors(),
      () => {
        if (!systemErrors() || systemErrors().length < 1) {
          setErrorTable([]);
          return;
        }
        for (const { lineName, axisErrors, driverErrors } of systemErrors()) {
          const prettierName = prettierLabel(lineName);
          if (driverErrors) {
            trackError(driverErrors, prettierName, ErrorKind.Driver);
          }
          if (axisErrors) {
            trackError(axisErrors, prettierName, ErrorKind.Axis);
          }
        }
      },
      { defer: true },
    ),
  );

  // Make driver axis to string enum
  const trackError = (errors: object[], lineName: string, kind: ErrorKind) => {
    errors.forEach((error) => {
      const track = findError(error);
      const hasError = track.length > 0;
      const location = `${lineName} ${kind} ${error["id" as keyof typeof error]}`;
      if (hasError) {
        const newRow = {
          location: location,
          error: track,
        };
        addRow(newRow);
      } else {
        if (hasRow(location)) {
          deleteRow(location);
        }
      }
    });
  };

  const findError = (error: object): string[] => {
    const errorKeys: string[] = [];
    const entries = Object.entries(error);
    for (const [key, value] of entries) {
      if (value) {
        const errorInfo = prettierLabel(key);
        if (typeof value === "boolean") {
          errorKeys.push(errorInfo);
        } else if (typeof value === "object") {
          const track = findError(value).toString();
          if (track.length > 0) {
            errorKeys.push(`${errorInfo}: ${track}`);
          }
        }
      }
    }
    return errorKeys;
  };

  const prettierLabel = (label: string) => {
    return `${label[0].toUpperCase()}${label.slice(1, label.length)}`;
  };

  const [errorTable, setErrorTable] = createSignal<ErrorTable[]>([]);

  const addRow = (row: ErrorTable) => {
    const rowIndex = errorTable().findIndex(
      (error) => error.location === row.location,
    );
    const rowFound = rowIndex !== -1;
    if (rowFound) {
      const currentErrorInfo = errorTable()[rowIndex].error;
      const differentErrorInfo =
        currentErrorInfo.toString() !== row.error.toString();
      if (differentErrorInfo) {
        setErrorTable((prev) => {
          const updatePrev = prev.map((prevRow, i) => {
            return i === rowIndex ? row : prevRow;
          });
          return updatePrev;
        });
      }
    } else {
      setErrorTable((prev) => [...prev, row]);
    }
  };

  const deleteRow = (location: string) => {
    return setErrorTable((prev) => {
      const deleteRow = prev.filter((prevRow) => prevRow.location !== location);
      return deleteRow;
    });
  };

  const hasRow = (location: string) => {
    const hasRow = errorTable().some((row) => row.location === location);
    return hasRow;
  };

  const locationFilter = () => {
    return [
      ...systemErrors().map((line) => line.lineName),
      ...Object.values(ErrorKind),
    ];
  };

  const errorFilter = () => {
    // Need to find another way to find out
    const axisErrorKeys: Array<keyof Response_Track_Axis_Error> = [
      "overcurrent",
    ];
    const driverErrorKeys: Array<keyof Response_Track_Driver_Error> = [
      "commErrorNext",
      "commErrorPrev",
      "controlLoopTimeExceeded",
      "inverterOverheat",
      "overvoltage",
      "undervoltage",
    ];
    return [...axisErrorKeys, ...driverErrorKeys];
  };

  const [errorFilter, setErrorFilter] = createSignal<string[]>([]);

  return (
    <>
      <div
        style={{
          width: "100%",
          display: "flex",
          "align-items": "center",
          "justify-items": "center",
          height: "3rem",
          "padding-left": "1em",
          "padding-right": "1em",
        }}
      >
        <Text
          fontWeight="bold"
          color="fg.subtle"
          size="sm"
          //width={`calc(100% - 2rem)`}
          height="min-content"
          alignItems="center"
        >
          Error
        </Text>
        <Show when={errorTable().length > 1}>
          <Menu.Root positioning={{ placement: "bottom-start" }}>
            <Menu.Trigger width="min-content">
              <IconButton size="xs" variant="ghost">
                <IconFilter2 />
              </IconButton>
            </Menu.Trigger>
            <Menu.Positioner>
              <Menu.Content>
                <For each={Object.keys(errorTable()[0])}>
                  {(filterKind) => {
                    const prettierLabel = `${filterKind[0].toUpperCase()}${filterKind.slice(1, filterKind.length)}`;
                    return (
                      <Menu.Root positioning={{ placement: "right-start" }}>
                        <Menu.TriggerItem>{prettierLabel}</Menu.TriggerItem>
                        <Menu.Positioner>
                          <Menu.Content>
                            <For
                              each={
                                filterKind === "location"
                                  ? locationFilter()
                                  : errorFilter()
                              }
                            >
                              {(filter) => {
                                return (
                                  <Menu.Item value={filter}>{filter}</Menu.Item>
                                );
                              }}
                            </For>
                          </Menu.Content>
                        </Menu.Positioner>
                      </Menu.Root>
                    );
                  }}
                </For>
              </Menu.Content>
            </Menu.Positioner>
          </Menu.Root>
        </Show>
      </div>
      <Show
        when={errorTable().length > 0}
        fallback={
          <Text color="fg.subtle" size="sm" marginLeft="1em">
            None errors.
          </Text>
        }
      >
        <Table.Root
          overflowX="hidden"
          borderTopWidth="1px"
          borderBottomWidth="1px"
          marginBottom="1em"
        >
          <Table.Head>
            <Table.Row>
              <Table.Header fontWeight="bold"> Location</Table.Header>
              <Table.Header fontWeight="bold"> Error</Table.Header>
            </Table.Row>
          </Table.Head>
          <Table.Body userSelect="none">
            <For each={errorTable()}>
              {(row) => (
                <Table.Row style={{ padding: "0" }}>
                  <Table.Cell style={{ height: "min-content", margin: "0" }}>
                    <Text>{row.location}</Text>
                  </Table.Cell>
                  <Table.Cell>
                    <For each={row.error}>{(info) => <Text>{info}</Text>}</For>
                  </Table.Cell>
                </Table.Row>
              )}
            </For>
          </Table.Body>
        </Table.Root>
      </Show>
    </>
  );
};
