import { Input } from "~/components/ui/input";
import { Text } from "~/components/ui/text";
import { prettierLabel } from "~/utils/PrettierLabel";
import { Response_Line_Carrier_State_State } from "~/proto/mmc/info_pb";
import { WaitCommand } from "../ScenarioPage";
import { createStore } from "solid-js/store";

export function WaitCommandBlock(props: { waitCommand: WaitCommand }) {
  const [obj, setObj] = createStore<WaitCommand>(props.waitCommand)

  return (
    <>
    <Text style = {{"font-weight" : "bold"}}>
      {prettierLabel(Response_Line_Carrier_State_State[obj.value.carrierState].replace(
        "CARRIER_STATE",
        "WAIT",
      ))}
    </Text>
    <Text>{"Line"}</Text>
    <Input
      width="2rem"
      value={obj.value.lineId ?? ""}
        onChange={(e) => {
          const parseValue = Number(e.target.value)
          if (isNaN(parseValue)) {
            setObj(
              "value",
              "lineId",
              parseValue,
            );
        }

      }}
    />
    <Text>{"Carrier"}</Text>
    <Input
      width="2rem"
      value={obj.value.carrierId ?? ""}
        onChange={(e) => {
          const parseValue = Number(e.target.value)
          if (isNaN(parseValue)) {
            setObj(
              "value",
              "carrierId",
              parseValue,
            );
          }
      }}
    />
    <Text opacity={obj.value.timeout ? "1" : "0.5"}>{"Time-out"}</Text>
    <Input
      opacity={obj.value.timeout ? "1" : "0.5"}
      width="2rem"
      value={obj.value.timeout ?? ""}
        onChange={(e) => {
          const parseValue = Number(e.target.value)
          if (isNaN(parseValue)) {
            setObj(
              "value",
              "timeout",
              parseValue,
            );
          }

      }}
      />
    </>
  )
}
