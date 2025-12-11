import { JSX } from "solid-js";
import { logStartCombinatorList, logStartConditionList } from "~/GlobalState";
import { createListCollection } from "~/components/ui/select";
import { ListCollection } from "@ark-ui/solid/collection";
import { AccordionStates, Form } from "./Form";

export type LoggingFormProps = JSX.HTMLAttributes<HTMLDivElement> & {
  id: string;
  formData: object;
  accordionStates: AccordionStates;
  originalFile?: object;
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
        "border-top-width": "1px",
        "border-bottom-width": "1px",
        "padding-bottom": "0.5rem",
      }}
    >
      <Form
        id={props.id}
        object={logForm}
        logStartCombinators={logStartCombinators}
        logStartConditions={logStartConditions}
        accordionStates={props.accordionStates}
        originalFile={props.originalFile}
      />
    </div>
  );
}
