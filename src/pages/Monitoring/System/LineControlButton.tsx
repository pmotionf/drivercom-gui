import { IconButton, IconButtonProps } from "~/components/ui/icon-button.tsx";
import { IconDots } from "@tabler/icons-solidjs";
import { Popover } from "~/components/ui/popover.tsx";
import { createSignal } from "solid-js";
import { Text } from "~/components/ui/text.tsx";
import { Button } from "~/components/ui/button.tsx";
import { SendingCommand } from "./System.tsx";

export type LineCommandParameters = {
  speed?: number;
  acceleration?: number;
  calibrate?: boolean;
  setZero?: boolean;
};

export type LineControlProps = {
  lineName: string;
  acceleration: number;
  speed: number;
  disableCalibrateButton: boolean;
  disableSetZeroButton: boolean;
  sendingCommand: SendingCommand;
  onLineCommand?: (save: LineCommandParameters) => void;
};

enum LineCommand {
  SaveVelocity,
  SetZero,
  Calibrate,
  None,
}

export function LineControlButton(props: LineControlProps & IconButtonProps) {
  const { ...IconButtonProps } = props;

  const [speedInput, setSpeedInput] = createSignal<string>(`${props.speed}`);
  const speedUnit = "mm/s";

  const [accelerationInput, setaccelerationInput] = createSignal<string>(
    `${props.acceleration}`,
  );
  const accelerationUnit = "mm/s²";

  const [lastCommand, setLastCommand] = createSignal<LineCommand>(
    LineCommand.None,
  );

  const sendingCommand = () => props.sendingCommand;
  const disableCalibrate = () => props.disableCalibrateButton;
  const disableSetZero = () => props.disableSetZeroButton;

  return (
    <Popover.Root>
      <Popover.Trigger
        width="min-content"
        height={"min-content"}
        disabled={props.disableMmcCliButton}
        onClick={(e) => e.stopPropagation()}
      >
        <IconButton {...IconButtonProps}>
          <IconDots />
        </IconButton>
      </Popover.Trigger>
      <Popover.Positioner>
        <Popover.Content
          width="max-content"
          onClick={(e) => e.stopPropagation()}
          direction={"column"}
        >
          <Popover.Arrow>
            <Popover.ArrowTip />
          </Popover.Arrow>
          <div
            style={{
              display: "grid",
              "grid-template-columns": "7rem 6rem",
              "grid-template-rows": `1.5rem 1.8rem 2rem`,
              "align-items": "center",
            }}
          >
            <Text
              size="sm"
              style={{
                "grid-row": 1,
                "grid-column": 1,
              }}
            >
              {"Configuration"}
            </Text>
            <Button
              size="xs"
              height="1.5rem"
              width="2.5rem"
              style={{
                "grid-row": 1,
                "grid-column": 2,
                "margin-left": `calc(100% - 2.5rem)`,
              }}
              fontWeight={"medium"}
              loading={
                sendingCommand() &&
                sendingCommand()!.line === props.lineName &&
                isNaN(sendingCommand()!.axisId) &&
                !sendingCommand()!.movingCarrier &&
                lastCommand() === LineCommand.SaveVelocity
                  ? true
                  : false
              }
              disabled={
                props.acceleration !== Number(accelerationInput()) ||
                props.speed !== Number(speedInput())
                  ? sendingCommand()
                    ? sendingCommand()!.line === props.lineName
                      ? isNaN(sendingCommand()!.axisId) &&
                        sendingCommand()!.movingCarrier !== true
                        ? lastCommand() === LineCommand.SaveVelocity
                          ? false
                          : true
                        : true
                      : true
                    : false
                  : true
              }
              onClick={(e) => {
                e.stopPropagation();

                if (
                  props.speed !== Number(speedInput()) ||
                  props.acceleration !== Number(accelerationInput())
                ) {
                  const saveProps: LineCommandParameters = {
                    speed:
                      props.speed === Number(speedInput()) ||
                      isNaN(Number(speedInput()))
                        ? undefined
                        : Number(speedInput()),
                    acceleration:
                      props.acceleration === Number(accelerationInput()) ||
                      isNaN(Number(accelerationInput()))
                        ? undefined
                        : Number(accelerationInput()),
                  };
                  setLastCommand(LineCommand.SaveVelocity);
                  props.onLineCommand?.(saveProps);
                }
              }}
            >
              {"Save"}
            </Button>

            {/* Speed */}
            <Text
              size="sm"
              fontWeight={"medium"}
              style={{
                "grid-row": 2,
                "grid-column": 1,
              }}
              width="min-content"
            >
              {"Speed"}
            </Text>
            <div
              style={{
                width: "6rem",
                height: "2rem",
                display: "flex",
                "align-items": "center",
                "border-radius": "0.5rem",
                "border-width": "1px",
                "grid-row": 3,
                "grid-column": 1,
              }}
            >
              <input
                value={speedInput()}
                onInput={(e) => setSpeedInput(e.target.value)}
                onChange={(e) => setSpeedInput(`${Number(e.target.value)}`)}
                onKeyDown={(e) => {
                  e.stopPropagation();
                }}
                size="md"
                style={{
                  width: "4rem",
                  padding: "0.2rem",
                  outline: "none",
                  "font-size": "1rem",
                  "font-weight": "lighter",
                  overflow: "hidden",
                  "white-space": "nowrap",
                  "text-overflow": "ellipsis",
                  display: "block",
                }}
                onClick={(e) => e.stopPropagation()}
              />
              <Text size="sm" opacity="0.7" fontWeight="medium">
                {speedUnit}
              </Text>
            </div>

            {/* Acceleration */}
            <Text
              size="sm"
              style={{
                "grid-row": 2,
                "grid-column": 2,
              }}
              fontWeight={"medium"}
              width="min-content"
            >
              {"Acceleration"}
            </Text>
            <div
              style={{
                width: "6rem",
                height: "2rem",
                display: "flex",
                "align-items": "center",
                "border-radius": "0.5rem",
                "border-width": "1px",
                "grid-row": 3,
                "grid-column": 2,
              }}
            >
              <input
                value={accelerationInput()}
                onInput={(e) => setaccelerationInput(e.target.value)}
                onChange={(e) =>
                  setaccelerationInput(`${Number(e.target.value)}`)
                }
                style={{
                  width: "4rem",
                  padding: "0.2rem",
                  outline: "none",
                  "font-size": "1rem",
                  "font-weight": "lighter",
                  overflow: "hidden",
                  "white-space": "nowrap",
                  "text-overflow": "ellipsis",
                  display: "block",
                }}
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
              />
              <Text size="sm" opacity="0.7" fontWeight="medium">
                {accelerationUnit}
              </Text>
            </div>
          </div>
          <div
            style={{
              display: "grid",
              "grid-template-columns": "4rem 4rem 4rem",
              "column-gap": "0.5rem",
              "grid-template-rows": "2rem",
              "padding-top": "0.5rem",
              "border-top-width": "1px",
              "margin-top": "0.5rem",
              "align-items": "center",
            }}
          >
            <Button
              size="xs"
              fontWeight={"medium"}
              style={{ "grid-row": 1, "grid-column": 2 }}
              height="1.5rem"
              onClick={() => {
                const commandProps: LineCommandParameters = {
                  setZero: true,
                };
                setLastCommand(LineCommand.SetZero);
                props.onLineCommand?.(commandProps);
              }}
              loading={
                sendingCommand() &&
                sendingCommand()!.line === props.lineName &&
                isNaN(sendingCommand()!.axisId) &&
                !sendingCommand()!.movingCarrier &&
                lastCommand() === LineCommand.SetZero
                  ? true
                  : false
              }
              disabled={
                !disableSetZero()
                  ? sendingCommand()
                    ? sendingCommand()!.line === props.lineName
                      ? isNaN(sendingCommand()!.axisId) &&
                        !sendingCommand()!.movingCarrier
                        ? lastCommand() === LineCommand.SetZero
                          ? false
                          : true
                        : true
                      : true
                    : false
                  : true
              }
            >
              {"Set Zero"}
            </Button>
            <Button
              size="xs"
              fontWeight={"medium"}
              style={{ "grid-row": 1, "grid-column": 3 }}
              height="1.5rem"
              onClick={() => {
                const commandProps: LineCommandParameters = {
                  calibrate: true,
                };
                setLastCommand(LineCommand.Calibrate);
                props.onLineCommand?.(commandProps);
              }}
              loading={
                sendingCommand() &&
                sendingCommand()!.line === props.lineName &&
                isNaN(sendingCommand()!.axisId) &&
                !sendingCommand()!.movingCarrier &&
                lastCommand() === LineCommand.Calibrate
                  ? true
                  : false
              }
              disabled={
                !disableCalibrate()
                  ? sendingCommand()
                    ? sendingCommand()!.line === props.lineName
                      ? isNaN(sendingCommand()!.axisId) &&
                        !sendingCommand()!.movingCarrier
                        ? lastCommand() === LineCommand.Calibrate
                          ? false
                          : true
                        : true
                      : true
                    : false
                  : true
              }
            >
              {"Calibrate"}
            </Button>
          </div>
        </Popover.Content>
      </Popover.Positioner>
    </Popover.Root>
  );
}
