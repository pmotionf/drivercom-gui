import { For } from "solid-js";
import { StateType } from "src-tauri/generated/config/ConfigType";
import { css, cx } from "styled-system/css";
import { Text } from "~/components/ui/text";
import { prettierLabel } from "~/utils/PrettierLabel";

// Since the Driver status is immutable, It has a seperate components.
export function DriverStatus(props: { driverStatus: StateType }) {
  return (
    <div
      class={css({
        boxShadow: "md",
        gridTemplateRows: `repeat(auto-fill, 2rem) `,
        gridTemplateColumns: `10rem minmax(0,1fr)`,
        overflowY: "auto",
        width: "100%",
        height: "100%",
        background: "gray.1",
        zIndex: "1",
        borderLeftWidth : "1px"
      })}
    >
      <Text style={{ "grid-row": 1 }} fontWeight = "bold">{"Driver Status"}</Text>
      <DriverStatusTable branch={props.driverStatus}/>
    </div>
  );
}

const DriverStatusTable = (props: { branch: object; nested?: boolean }) => {
  return (
    <table
      class={cx(
        css({ width: "100%", tableLayout: "fixed",}),
        props.nested && css({ borderStyle: "hidden" }),
      )}
    >
      <colgroup>
        <col class={css({ width: !props.nested ? "7rem" : "5rem" })} />
        <col />
      </colgroup>
      <tbody>
        <For each={Object.entries(props.branch).sort(([, a], [, b]) => {
            const isObjA = a !== null && typeof a === "object" ? 1 : 0
            const isObjB = b !== null && typeof b === "object" ? 1 : 0
            return isObjA - isObjB
          })}>
          {([key, value]) => {
            const isObject = value !== null && typeof value === "object"
            return (
              <tr style = {{"padding" : "0"}}>
                <th class={css({borderWidth : "1px 1px 1px 0"})}>
                  <Text fontSize = "sm" fontWeight = {!props.nested ? "bold" : "medium"}>{isObject ? prettierLabel(key) : key.replaceAll("_", " ")}</Text>
                </th>
                <td class={css({borderWidth : "1px 0px 1px 0"})}>
                  {isObject ? (
                    <DriverStatusTable branch={value} nested />
                  ) : (
                    <Text fontSize = "sm" paddingLeft = "1rem">{String(value)}</Text>
                  )}
                </td>
              </tr>
            )
          }}
        </For>
      </tbody>
    </table>
  )
}
