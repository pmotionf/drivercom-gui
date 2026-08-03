import {
  Response_Line_Axis_Error,
  Response_Line_Driver_Error,
} from "~/proto/mmc/info_pb";
import { ErrorTable } from "./ErrorTable";
import { Text } from "~/components/ui/text";

export type StatusPageProps = {
  systemErrors: {
    lineName: string;
    axisErrors: Response_Line_Axis_Error[];
    driverErrors: Response_Line_Driver_Error[];
  }[];
  clearErrorAuto: boolean;
};

export const StatusPage = (props: StatusPageProps) => {
  return (
    <>
      <Text fontWeight="bold" textStyle="lg" marginBottom="0.5em">
        Status
      </Text>
      <ErrorTable
        systemErrors={props.systemErrors}
        clearErrorAuto={props.clearErrorAuto}
      />
    </>
  );
};
