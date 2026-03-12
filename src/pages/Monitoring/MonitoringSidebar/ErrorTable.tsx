import { JSX, on, createEffect, createSignal } from "solid-js";
import { Table } from "~/components/ui/table.tsx";
import { For } from "solid-js";
import { Text } from "~/components/ui/text";
import {
  Response_Line_Axis_Error,
  Response_Line_Driver_Error,
} from "~/proto/mmc/info_pb";
import { Show } from "solid-js";
import { trackStore } from "@solid-primitives/deep";
import JSON5 from "json5";

type ErrorTableProps = JSX.HTMLAttributes<HTMLDivElement> & {
  systemErrors: {
    lineName: string;
    axisErrors: Response_Line_Axis_Error[];
    driverErrors: Response_Line_Driver_Error[];
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
      <Text fontWeight="bold" color="fg.subtle" size="sm" marginBottom="0.5em">
        Error
      </Text>
      <Show
        when={showTable()}
        fallback={
          <Text color="fg.subtle" size="sm">
            No errors.
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
            <For each={systemError()}>
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
  errors: Response_Line_Axis_Error[] | Response_Line_Driver_Error[];
  location: string;
};

const ErrorTableRows = (props: ErrorTableRowProps) => {
  const [error, setError] = createSignal(props.errors);
  createEffect(
    on(
      () => trackStore(props.errors),
      () => {
        if (JSON5.stringify(error) !== JSON5.stringify(props.errors)) {
          setError(JSON5.parse(JSON5.stringify(props.errors)));
        }
      },
    ),
  );

  return (
    <For each={error()}>
      {(error, i) => {
        if (Object.values(error).includes(true)) {
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
