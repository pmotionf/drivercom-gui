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

type ErrorTable = {
  location: string;
  errorInfo: string[];
};

type ErrorTableProps = JSX.HTMLAttributes<HTMLDivElement> & {
  systemErrors: {
    lineName: string;
    axisErrors: Response_Track_Axis_Error[];
    driverErrors: Response_Track_Driver_Error[];
  }[];
  clearErrorAuto: boolean;
};

enum ErrorKind {
  Driver = "Driver",
  Axis = "Axis",
}

export const ErrorTable = (props: ErrorTableProps) => {
  const systemErrors = () => props.systemErrors;

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
          if (axisErrors) {
            trackError(axisErrors, prettierName, ErrorKind.Axis);
          }

          if (props.clearErrorAuto) {
            if (
              errorTable().some((table) =>
                table.location.includes(ErrorKind.Driver),
              )
            ) {
              trackError(driverErrors, prettierName, ErrorKind.Driver);
            } else {
              continue;
            }
          } else {
            if (driverErrors) {
              trackError(driverErrors, prettierName, ErrorKind.Driver);
            }
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
          errorInfo: track,
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
      const currentErrorInfo = errorTable()[rowIndex].errorInfo;
      const differentErrorInfo =
        currentErrorInfo.toString() !== row.errorInfo.toString();
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

  return (
    <>
      <Text
        fontWeight="bold"
        color="fg.subtle"
        size="sm"
        marginLeft="1.2em"
        marginBottom="0.5em"
      >
        Error
      </Text>
      <Show
        when={errorTable().length > 0}
        fallback={
          <Text color="fg.subtle" size="sm" marginLeft="1.2em">
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
                    <For each={row.errorInfo}>
                      {(info) => <Text>{info}</Text>}
                    </For>
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
