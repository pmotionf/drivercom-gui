import { For } from "solid-js"
import { ScenarioCommand } from "../ScenarioPage"
import { createStore } from "solid-js/store"
import { Text } from "~/components/ui/text"

export type CommandDetailFormProps = {
  scenarioCommand : ScenarioCommand
}

export const CommandDetailForm = (props: CommandDetailFormProps) => {
  const [command,] = createStore<ScenarioCommand>(props.scenarioCommand)
  if (command.case === "mmcCommand") {
    return (
      <InputGroup context={command.value.command}/>
    )
  } else {
    return(<InputGroup context={command.value}/>)
  }
}

const InputGroup = (props: { context: object }) => {
  const [inputs, setInputs] = createStore(props.context)
  return (
    <div>
    <For each={Object.entries(inputs)}>
      {([key, value]) => {
        return (
          <>
            <Text>{key}</Text>
            <Text>{value}</Text>
          </>
        )
      }}
      </For>
    </div>
  )

}
