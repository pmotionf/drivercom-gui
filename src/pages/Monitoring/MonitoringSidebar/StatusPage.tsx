import { ErrorTable } from "./ErrorTable";
import { Text } from "~/components/ui/text";
import {
  Response_Track_Axis_Error,
  Response_Track_Driver_Error,
  /*@ts-ignore Ignore git acticon type check */
} from "../proto/mmc/info_pb";

export type StatusPageProps = {
  systemErrors: {
    lineName: string;
    axisErrors: Response_Track_Axis_Error[];
    driverErrors: Response_Track_Driver_Error[];
  }[];
  clearErrorAuto: boolean;
};

export const StatusPage = (props: StatusPageProps) => {
  return (
    <>
      <Text fontWeight="bold" size="lg" marginBottom="0.5em">
        Status
      </Text>
      <ErrorTable
        systemErrors={props.systemErrors}
        clearErrorAuto={props.clearErrorAuto}
      />
    </>
  );
};
