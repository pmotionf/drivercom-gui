import { Text } from "~/components/ui/text";
import { createStore } from "solid-js/store";
import {
  Request_Direction,
  type Request as CommandRequest,
} from "~/proto/mmc/command_pb";
import { Input } from "~/components/ui/input";
import { LineConfig } from "../../Monitoring";
import { createListCollection } from "@ark-ui/solid";
import { Select } from "~/components/Customize/Select";
import { prettierLabel } from "~/utils/PrettierLabel";

// Adaptive code block component for MMC Command in scenario page
export function MmcCommandBlock(props: {
  command: CommandRequest;
  lineConfig: LineConfig[];
}) {
  const [obj, setObj] = createStore<CommandRequest>(props.command);
  if (obj.body.value === undefined) return;

  const lineNames = props.lineConfig.map((config, i) => {
    return { label: config.name, value: (i + 1).toString() };
  });
  const lineNamesCollection = createListCollection({ items: lineNames });
  return (
    <>
      <Text fontWeight="bold" style={{ width: "12rem" }}>
        {prettierLabel(obj.body.case)}
      </Text>
      {"line" in obj.body.value && (
        <>
          <Text>{"Line"}</Text>
          <Select
            style={{ width: "6rem" }}
            listCollection={lineNamesCollection}
            value={obj.body.value.line.toString()}
            onValueChange={(value) => {
              const newLine = Number(value);
              if (isNaN(newLine)) return;
              setObj(
                "body",
                "value",
                // @ts-ignore: The type is already checked by the preceding condition.
                "line",
                newLine,
              );
              if (!obj.body.value) return;
              const lineIndex = newLine - 1;
              if ("velocity" in obj.body.value) {
                setObj(
                  "body",
                  "value",
                  // @ts-ignore: The type is already checked by the preceding condition.
                  "velocity",
                  props.lineConfig[lineIndex].speed,
                );
              }
              if ("acceleration" in obj.body.value) {
                setObj(
                  "body",
                  "value",
                  // @ts-ignore: The type is already checked by the preceding condition.
                  "acceleration",
                  props.lineConfig[lineIndex].acceleration,
                );
              }
            }}
          />
        </>
      )}
      {"axis" in obj.body.value && "line" in obj.body.value && (
        <>
          <Text>{"Axis"}</Text>
          <Select
            style={{ width: "4rem" }}
            listCollection={createListCollection({
              items: Array.from(
                { length: props.lineConfig[obj.body.value.line - 1].axes },
                (_, i) => {
                  const axisId = (i + 1).toString();
                  return { label: axisId, value: axisId };
                },
              ),
            })}
            value={obj.body.value.axis.toString()}
            onValueChange={(value) => {
              setObj(
                "body",
                "value",
                // @ts-ignore: The type is already checked by the preceding condition.
                "axis",
                Number(value),
              );
            }}
          />
        </>
      )}
      {"direction" in obj.body.value && (
        <>
          <Text>{"Direction"}</Text>
          <Select
            style={{ width: "10rem" }}
            listCollection={createListCollection({
              items: Object.keys(Request_Direction)
                .filter((key) => isNaN(Number(key)))
                .map((key, i) => {
                  return { label: key, value: i.toString() };
                }),
            })}
            value={obj.body.value.direction.toString()}
            onValueChange={(value) => {
              setObj(
                "body",
                "value",
                // @ts-ignore: The type is already checked by the preceding condition.
                "direction",
                Number(value),
              );
            }}
          />
        </>
      )}
      {obj.body.value && "carrier" in obj.body.value && (
        <>
          <Text>{"Carrier"}</Text>
          <Input
            width={"5rem"}
            value={obj.body.value.carrier.toString()}
            onChange={(e) => {
              setObj(
                "body",
                "value",
                // @ts-ignore: The type is already checked by the preceding condition.
                "carrier",
                Number(e.target.value),
              );
            }}
          />
        </>
      )}
      {obj.body.value &&
        "target" in obj.body.value &&
        typeof obj.body.value.target.value === "number" && (
          <>
            <Text>{"Target"}</Text>
            <Select
              style={{ width: "8rem" }}
              value={obj.body.value.target.case}
              onValueChange={(value) => {
                setObj(
                  "body",
                  "value",
                  // @ts-ignore: The type is already checked by the preceding condition.
                  "target",
                  // @ts-ignore: The type is already checked by the preceding condition.
                  { case: value, value: obj.body.value.target.value },
                );
              }}
              listCollection={createListCollection({
                items: [
                  { label: "axis", value: "axis" },
                  { label: "location", value: "location" },
                  { label: "distance", value: "distance" },
                ],
              })}
            />
            <Text>{"Value"}</Text>
            <Input
              width={"5rem"}
              value={obj.body.value.target.value.toString()}
              onChange={(e) => {
                setObj(
                  "body",
                  "value",
                  // @ts-ignore: The type is already checked by the preceding condition.
                  "target",
                  "value",
                  Number(e.target.value),
                );
              }}
            />
          </>
        )}

      {"target" in obj.body.value && obj.body.value.target.case === "axes" && (
        <>
          <Text> Axis </Text>
          <Select
            style={{ width: "4rem" }}
            listCollection={createListCollection({
              items: Array.from(
                { length: props.lineConfig[obj.body.value.line - 1].axes },
                (_, i) => {
                  const axisId = (i + 1).toString();
                  return { label: axisId, value: axisId };
                },
              ),
            })}
            value={obj.body.value.target.value.start.toString()}
            onValueChange={(value) => {
              const targetAxis = Number(value);
              if (isNaN(targetAxis)) return;
              setObj(
                "body",
                "value",
                // @ts-ignore: The type is already checked by the preceding condition.
                "target",
                "value",
                {
                  start: targetAxis,
                  end: targetAxis,
                  $typeName: "root.Range",
                },
              );
            }}
          />
        </>
      )}
    </>
  );
}
