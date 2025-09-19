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
import { SearchFilterButton } from "./MonitoringSidebar/StausPage/SearchFilterButton";
import { TagsInputs } from "./MonitoringSidebar/StausPage/TagsInput";
import {
  LocationFilter,
  LocationFilterButton,
} from "./MonitoringSidebar/StausPage/LocationFilterButton";
import { Stack } from "styled-system/jsx";

type ErrorTable = {
  line: string;
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

enum FilterType {
  Line = "Line",
  Location = "Location",
  Error = "Error",
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
      const location = `${kind} ${error["id" as keyof typeof error]}`;
      if (hasError) {
        const newRow = {
          line: lineName,
          location: location,
          error: track,
        };
        addRow(newRow);
      } else {
        if (hasRow(lineName, location)) {
          deleteRow(lineName, location);
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
      (error) => error.location === row.location && error.line === row.line,
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

  const deleteRow = (line: string, location: string) => {
    return setErrorTable((prev) => {
      const deleteRow = prev.filter(
        (prevRow) => prevRow.location !== location && prevRow.line !== line,
      );
      return deleteRow;
    });
  };

  const hasRow = (lineName: string, location: string) => {
    const hasRow = errorTable().some(
      (row) => row.location === location && row.line === lineName,
    );
    return hasRow;
  };

  const [lines, setLines] = createSignal<string[]>([]);
  createEffect(
    on(
      () => systemErrors().map((system) => system.lineName),
      () => {
        const lineNames = systemErrors().map((system) => system.lineName);
        if (lineNames.toString() !== lines().toString()) {
          setLines(lineNames);
        }
      },
      { defer: true },
    ),
  );

  const errorFilter = () => {
    const axisError: Omit<
      Response_Track_Axis_Error,
      "$typeName" | "$unknown" | "id"
    > = { overcurrent: true };
    const axisErrorKeys: string[] = Object.keys(axisError);

    const driverError: Omit<
      Response_Track_Driver_Error,
      "$typeName" | "$unknown" | "id"
    > = {
      commErrorNext: true,
      commErrorPrev: true,
      controlLoopTimeExceeded: true,
      undervoltage: true,
      overvoltage: true,
      inverterOverheat: true,
    };
    const driverAxisKeys: string[] = Object.keys(driverError);
    return [...axisErrorKeys, ...driverAxisKeys];
  };

  const [filterIndex, setFilterIndex] = createSignal<number[]>([]);

  createEffect(
    on([() => tableFilter(), () => errorTable()], () => {
      if (tableFilter().length < 1) {
        setFilterIndex(
          Array.from({ length: errorTable().length }, (_, i) => i),
        );
      } else {
        let table = errorTable();
        const lineTypeFilter = tableFilter().filter(
          (table) => table.type === FilterType.Line,
        );
        if (lineTypeFilter.length > 0) {
          const lineFilters = lineTypeFilter.map((filter) =>
            filter.filterName.toLowerCase(),
          );
          table = table.filter((filter) =>
            lineFilters.includes(filter.line.toLowerCase()),
          );
        }

        const locationFilter = tableFilter()
          .filter((table) => table.type === FilterType.Location)
          .map((filter) => filter.filterName.toLowerCase());

        locationFilter.forEach((loc) => {
          if (loc.includes(`~`)) {
            const split = loc.split(" ");
            const kind = split[0];
            const range = split[1].split(`~`);
            const minId = Number(range[0]);
            const maxId = Number(range[1]);
            const ids = Array.from(
              { length: maxId - minId + 1 },
              (_, i) => minId + i,
            );
            ids.forEach((id) => {
              locationFilter.push(`${kind} ${id}`);
            });
          }
        });

        if (locationFilter.length > 0) {
          table = table.filter(
            (filter) =>
              locationFilter.filter((loc) =>
                filter.location.toLowerCase().includes(loc.toLowerCase()),
              ).length > 0,
          );
        }

        const errorFilter = tableFilter()
          .filter((table) => table.type == FilterType.Error)
          .map((filter) => filter.filterName.toLowerCase());
        if (errorFilter.length > 0) {
          table = table.filter(
            (table) =>
              table.error.filter((err) =>
                errorFilter.includes(err.toLowerCase()),
              ).length > 0,
          );
        }

        const filterIndexes = table.map((filterRow) => {
          const index = errorTable().findIndex(
            (row) =>
              filterRow.line === row.line &&
              filterRow.location === row.location &&
              filterRow.error.toString() === row.error.toString(),
          );
          return index;
        });
        setFilterIndex(filterIndexes);
      }
    }),
  );

  const [tableFilter, setTableFilter] = createSignal<
    { type: FilterType; filterName: string }[]
  >([]);
  const [locationFilter, setLocationFilter] = createSignal<LocationFilter>({
    axis: { show: false },
    driver: { show: false },
  });

  return (
    <>
      <Text
        fontWeight="bold"
        color="fg.subtle"
        size="sm"
        height="min-content"
        alignItems="center"
        marginLeft="1.2em"
        marginBottom="0.5em"
      >
        Error
      </Text>

      <Table.Root
        overflowX="hidden"
        borderTopWidth="1px"
        borderBottomWidth="1px"
        marginBottom="1em"
      >
        <Table.Head>
          <Show when={tableFilter().length > 0}>
            <Table.Row padding={"0"}>
              <Table.Cell colSpan={3} padding={"0"} height={"1rem"}>
                <TagsInputs
                  variant="ghost"
                  style={{ width: "100%", "border-width": "0" }}
                  value={tableFilter().map((table) => table.filterName)}
                  onValueChange={(inputs) => {
                    setTableFilter((prev) =>
                      prev.filter((prev) => inputs.includes(prev.filterName)),
                    );
                  }}
                />
              </Table.Cell>
            </Table.Row>
          </Show>
          <Table.Row>
            <Table.Header fontWeight={"bold"}>
              <Stack direction="row" alignItems="center" gap="0">
                <Text> {FilterType.Line}</Text>
                <SearchFilterButton
                  label={FilterType.Line}
                  searchData={lines()}
                  onApply={(inputs) => {
                    const parseInputs = inputs
                      .filter(
                        (input) =>
                          tableFilter().findIndex(
                            (table) => table.filterName === input,
                          ) === -1,
                      )
                      .map((input) => {
                        return { type: FilterType.Line, filterName: input };
                      });
                    setTableFilter((prev) => [...prev, ...parseInputs]);
                  }}
                />
              </Stack>
            </Table.Header>
            <Table.Header fontWeight="bold">
              <Stack direction="row" alignItems="center" gap="0">
                <Text>{FilterType.Location} </Text>
                <LocationFilterButton
                  locationFilter={locationFilter()}
                  onApply={(filter) => {
                    setLocationFilter(filter);
                    if (filter.axis.show) {
                      if (!filter.axis.ids) {
                        if (
                          tableFilter().findIndex(
                            (filter) => filter.filterName === "axis",
                          ) === -1
                        ) {
                          setTableFilter((prev) => [
                            ...prev.filter(
                              (prevFilter) =>
                                !prevFilter.filterName.includes("axis"),
                            ),
                            { type: FilterType.Location, filterName: "axis" },
                          ]);
                        }
                      } else {
                        setTableFilter((prev) =>
                          prev.filter((filter) => filter.filterName !== `axis`),
                        );
                        const minId = filter.axis.ids.min;
                        const maxId = filter.axis.ids.max;

                        if (!maxId) {
                          const fieldName = `axis ${minId}`;
                          if (
                            tableFilter().findIndex(
                              (filter) => filter.filterName === fieldName,
                            ) === -1
                          ) {
                            setTableFilter((prev) => [
                              ...prev,
                              {
                                type: FilterType.Location,
                                filterName: fieldName,
                              },
                            ]);
                          }
                        } else {
                          const rangeFilterName = `axis ${minId}~${maxId}`;
                          if (
                            tableFilter().findIndex(
                              (filter) => filter.filterName === rangeFilterName,
                            ) === -1
                          ) {
                            const ids = Array.from(
                              { length: maxId - minId + 1 },
                              (_, i) => minId + i,
                            );
                            ids.forEach((id) => {
                              const filterName = `axis ${id}`;
                              setTableFilter((prev) =>
                                prev.filter(
                                  (prevFilter) =>
                                    prevFilter.filterName !== filterName,
                                ),
                              );
                            });
                            setTableFilter((prev) => [
                              ...prev,
                              {
                                type: FilterType.Location,
                                filterName: rangeFilterName,
                              },
                            ]);
                          }
                        }
                      }
                    }

                    if (filter.driver.show) {
                      if (!filter.driver.ids) {
                        if (
                          tableFilter().findIndex(
                            (filter) => filter.filterName === "driver",
                          ) === -1
                        ) {
                          setTableFilter((prev) => [
                            ...prev.filter(
                              (prevFilter) =>
                                !prevFilter.filterName.includes("driver"),
                            ),
                            { type: FilterType.Location, filterName: "driver" },
                          ]);
                        }
                      } else {
                        setTableFilter((prev) =>
                          prev.filter(
                            (filter) => filter.filterName !== `driver`,
                          ),
                        );
                        const minId = filter.driver.ids.min;
                        const maxId = filter.driver.ids.max;

                        if (!maxId) {
                          const fieldName = `driver ${minId}`;
                          if (
                            tableFilter().findIndex(
                              (filter) => filter.filterName === fieldName,
                            ) === -1
                          ) {
                            setTableFilter((prev) => [
                              ...prev,
                              {
                                type: FilterType.Location,
                                filterName: fieldName,
                              },
                            ]);
                          }
                        } else {
                          const rangeFilterName = `driver ${minId}~${maxId}`;

                          if (
                            tableFilter().findIndex(
                              (filter) => filter.filterName === rangeFilterName,
                            ) === -1
                          ) {
                            const ids = Array.from(
                              { length: maxId - minId + 1 },
                              (_, i) => minId + i,
                            );
                            ids.forEach((id) => {
                              const filterName = `driver ${id}`;
                              setTableFilter((prev) =>
                                prev.filter(
                                  (prevFilter) =>
                                    prevFilter.filterName !== filterName,
                                ),
                              );
                            });
                            setTableFilter((prev) => [
                              ...prev,
                              {
                                type: FilterType.Location,
                                filterName: rangeFilterName,
                              },
                            ]);
                          }
                        }
                      }
                    }
                    setLocationFilter({
                      axis: { show: false },
                      driver: { show: false },
                    });
                  }}
                />
              </Stack>
            </Table.Header>
            <Table.Header fontWeight="bold">
              <Stack direction="row" alignItems="center" gap="0">
                <Text>Error</Text>
                <SearchFilterButton
                  label={FilterType.Error}
                  searchData={errorFilter()}
                  onApply={(inputs) => {
                    const parseInputs = inputs
                      .filter(
                        (input) =>
                          tableFilter().findIndex(
                            (table) => table.filterName === input,
                          ) === -1,
                      )
                      .map((input) => {
                        return { type: FilterType.Error, filterName: input };
                      });
                    setTableFilter((prev) => [...prev, ...parseInputs]);
                  }}
                />
              </Stack>
            </Table.Header>
          </Table.Row>
        </Table.Head>
        <Table.Body userSelect="none">
          <For each={filterIndex()}>
            {(index) => {
              const row = errorTable()[index];
              return (
                <Table.Row style={{ padding: "0" }}>
                  <Table.Cell style={{ height: "min-content", margin: "0" }}>
                    <Text>{row.line}</Text>
                  </Table.Cell>
                  <Table.Cell style={{ height: "min-content", margin: "0" }}>
                    <Text>{row.location}</Text>
                  </Table.Cell>
                  <Table.Cell>
                    <For each={row.error}>{(info) => <Text>{info}</Text>}</For>
                  </Table.Cell>
                </Table.Row>
              );
            }}
          </For>
        </Table.Body>
      </Table.Root>
    </>
  );
};
