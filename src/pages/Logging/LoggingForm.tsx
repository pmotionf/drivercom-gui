import { JSX } from "solid-js";
import {
  logStartCombinatorList,
  logStartConditionList,
} from "~/store/GlobalState";
import { createListCollection } from "@ark-ui/solid/collection";
import { ListCollection } from "@ark-ui/solid/collection";
import { LoggingAccordionStates, Form } from "~/components/Form";

export type LoggingFormProps = JSX.HTMLAttributes<HTMLDivElement> & {
  id: string;
  formData: object;
  accordionStates: LoggingAccordionStates;
  originalFile?: object;
  description?: object;
};

export function LoggingForm(props: LoggingFormProps) {
  const logForm = props.formData;

  // Log config start condition list for select component
  const parseStartConditionList = logStartConditionList().map((condition) => {
    return { label: condition, value: condition };
  });
  const logStartConditions: ListCollection = createListCollection({
    items: parseStartConditionList,
  });

  // Log config start combinator list for select component
  const parseCombinatorList = logStartCombinatorList().map((condition) => {
    return { label: condition, value: condition };
  });
  const logStartCombinators = createListCollection({
    items: parseCombinatorList,
  });

  return (
    <div
      ref={props.ref}
      style={{
        "overflow-y": "auto",
        "padding-left": "0.5rem",
        "padding-right": "0.5rem",
      }}
    >
      <Form
        id={props.id}
        value={logForm}
        logStartCombinators={logStartCombinators}
        logStartConditions={logStartConditions}
        accordionStates={props.accordionStates}
        originalFile={props.originalFile}
        description={props.description}
      />
    </div>
  );
}
