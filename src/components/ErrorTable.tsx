import { JSX } from "solid-js";
import { Table } from "~/components/ui/table.tsx";
import { For } from "solid-js";
import { Text } from "./ui/text";
import {
  Response_Track_Axis_Error,
  Response_Track_Driver_Error,
  /*@ts-ignore Ignore git acticon type check */
} from "./proto/mmc/info_pb";
import { Show } from "solid-js";

type ErrorTableProps = JSX.HTMLAttributes<HTMLDivElement> & {
  systemErrors: {
    lineName: string;
    axisErrors: Response_Track_Axis_Error[];
    driverErrors: Response_Track_Driver_Error[];
  }[];
  clearErrorAuto: boolean;
};

export const ErrorTable = (props: ErrorTableProps) => {
  const systemError = () => {
    return props.systemErrors;
  };

  const showTable = () => {
    const findSystemError = systemError().map((system) => {
      const findAxisErrors = findError(system.axisErrors);
      if (findAxisErrors) {
        return true;
      } else {
        if (!props.clearErrorAuto) {
          return findError(system.driverErrors);
        }
      }
      return false;
    });
    return findSystemError.includes(true);
  };

  const findError = (errors: object[]): boolean => {
    const detectError = errors
      .map((axis) => Object.values(axis).includes(true))
      .includes(true);
    return detectError;
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
        when={showTable()}
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
              <Table.Header fontWeight="bold" color="red.9">
                Error
              </Table.Header>
            </Table.Row>
          </Table.Head>
          <Table.Body userSelect="none">
            <For each={props.systemErrors}>
              {(systemError) => (
                <>
                  <Show when={!props.clearErrorAuto}>
                    <ErrorTableRows
                      location={systemError.lineName}
                      errors={systemError.driverErrors}
                    />
                  </Show>
                  <ErrorTableRows
                    location={systemError.lineName}
                    errors={systemError.axisErrors}
                  />
                </>
              )}
            </For>
          </Table.Body>
        </Table.Root>
      </Show>
    </>
  );
};

type ErrorTableRowProps = {
  errors: Response_Track_Axis_Error[] | Response_Track_Driver_Error[];
  location: string;
};

const ErrorTableRows = (props: ErrorTableRowProps) => {
  return (
    <For each={props.errors}>
      {(error, i) => {
        if (
          Object.values(error).some(
            (value) => typeof value === "boolean" && value,
          )
        ) {
          const keys = Object.entries(error)
            .filter((entry) => typeof entry[1] === "boolean" && entry[1])
            .map((entry) => entry[0]);
          const locationKind = error.$typeName.split(`.`)[4].toLowerCase();
          const locationId = i() + 1;

          return (
            <Table.Row style={{ padding: "0" }}>
              <Table.Cell style={{ height: "min-content", margin: "0" }}>
                <Text>{`${props.location} ${locationKind} ${locationId}`}</Text>
              </Table.Cell>
              <Table.Cell>
                <For each={keys}>
                  {(info) => <Text color="red.9">{info}</Text>}
                </For>
              </Table.Cell>
            </Table.Row>
          );
        }
      }}
    </For>
  );
};
