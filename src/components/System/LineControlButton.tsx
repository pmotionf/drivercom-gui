import { IconButton, IconButtonProps } from "../ui/icon-button.tsx";
import { IconDots } from "@tabler/icons-solidjs";
import { Popover } from "../ui/popover.tsx";
import { createSignal, Show } from "solid-js";
import { getAcceleration, getSpeed } from "~/pages/utils/MmcCliHandler.ts";
import { Text } from "../ui/text.tsx";
import { Button } from "../ui/button.tsx";
import { SendingCommand } from "./System.tsx";

export type LineCommandParameters = {
  line: string;
  speed?: number;
  acceleration?: number;
  calibrate?: boolean;
  setZero?: boolean;
};

export type LineControlProps = {
  lineName: string;
  disableMmmCliButton: boolean;
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

  const [speed, setSpeed] = createSignal<number>(NaN);
  const [speedInput, setSpeedInput] = createSignal<number>(NaN);
  const [speedUnit, setSpeedUnit] = createSignal<string>("");

  const [acceleration, setacceleration] = createSignal<number>(NaN);
  const [accelerationInput, setaccelerationInput] = createSignal<number>(NaN);
  const [accelerationUnit, setaccelerationUnit] = createSignal<string>("");

  const [lastCommand, setLastCommand] = createSignal<LineCommand>(
    LineCommand.None,
  );

  const disableBtn = () => props.disableMmmCliButton;
  const sendingCommand = () => props.sendingCommand;

  return (
    <Show when={!disableBtn()}>
      <Popover.Root
        onOpenChange={async (e) => {
          if (e.open) {
            if (isNaN(speed())) {
              const speed = await getSpeed(props.lineName);
              if (speed) {
                const match = speed.match(/^\d+/);
                const value = match ? Number(match[0]) : NaN;
                setSpeed(value);
                setSpeedInput(value);
                setSpeedUnit(
                  speed.match(/\s([^\s]+)$/)
                    ? speed.match(/\s([^\s]+)$/)![1]
                    : "mm/s",
                );
              }
            }

            if (isNaN(acceleration())) {
              const accelaraion = await getAcceleration(props.lineName);
              if (accelaraion) {
                const match = accelaraion.match(/^\d+/);
                const value = match ? Number(match[0]) : NaN;
                setacceleration(value);
                setaccelerationInput(value);

                setaccelerationUnit(
                  accelaraion.match(/\s([^\s]+)$/)
                    ? accelaraion.match(/\s([^\s]+)$/)![1]
                    : "mm/s²",
                );
              }
            } else {
              setLastCommand(LineCommand.None);
            }
          }
        }}
      >
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
                {"Velocity"}
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
                  lastCommand() === LineCommand.SaveVelocity
                    ? true
                    : false
                }
                disabled={
                  sendingCommand()
                    ? sendingCommand()!.line === props.lineName
                      ? isNaN(sendingCommand()!.axisId)
                        ? lastCommand() === LineCommand.SaveVelocity
                          ? false
                          : true
                        : true
                      : true
                    : false
                }
                onClick={(e) => {
                  e.stopPropagation();

                  if (
                    speed() !== speedInput() ||
                    acceleration() !== accelerationInput()
                  ) {
                    const saveProps: LineCommandParameters = {
                      line: props.lineName,
                      speed:
                        speed() === speedInput() || isNaN(speedInput())
                          ? undefined
                          : speedInput(),
                      acceleration:
                        acceleration() === accelerationInput() ||
                        isNaN(accelerationInput())
                          ? undefined
                          : accelerationInput(),
                    };
                    setLastCommand(LineCommand.SaveVelocity);
                    props.onLineCommand?.(saveProps);
                  }

                  if (speed() !== speedInput()) {
                    setSpeed(NaN);
                  }
                  if (acceleration() !== accelerationInput()) {
                    setacceleration(NaN);
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
                borderBottomWidth={
                  !isNaN(speed()) && speed() !== speedInput() ? "1px" : "0px"
                }
                borderColor={"accent.default"}
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
                  onChange={(e) => setSpeedInput(Number(e.target.value))}
                  type="text"
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
                  {speedUnit()}
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
                borderBottomWidth={
                  !isNaN(acceleration()) &&
                  acceleration() !== accelerationInput()
                    ? "1px"
                    : "0px"
                }
                borderColor={"accent.default"}
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
                  onChange={(e) => setaccelerationInput(Number(e.target.value))}
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
                  {accelerationUnit()}
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
              <Text size="sm" style={{ "grid-row": 1, "grid-column": 1 }}>
                {"Position"}
              </Text>
              <Button
                size="xs"
                fontWeight={"medium"}
                style={{ "grid-row": 1, "grid-column": 2 }}
                height="1.5rem"
                onClick={() => {
                  const commandProps: LineCommandParameters = {
                    line: props.lineName,
                    setZero: true,
                  };
                  setLastCommand(LineCommand.SetZero);
                  props.onLineCommand?.(commandProps);
                }}
                loading={
                  sendingCommand() &&
                  sendingCommand()!.line === props.lineName &&
                  isNaN(sendingCommand()!.axisId) &&
                  lastCommand() === LineCommand.SetZero
                    ? true
                    : false
                }
                disabled={
                  sendingCommand()
                    ? sendingCommand()!.line === props.lineName
                      ? isNaN(sendingCommand()!.axisId)
                        ? lastCommand() === LineCommand.SetZero
                          ? false
                          : true
                        : true
                      : true
                    : false
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
                    line: props.lineName,
                    calibrate: true,
                  };
                  setLastCommand(LineCommand.Calibrate);
                  props.onLineCommand?.(commandProps);
                }}
                loading={
                  sendingCommand() &&
                  sendingCommand()!.line === props.lineName &&
                  isNaN(sendingCommand()!.axisId) &&
                  lastCommand() === LineCommand.Calibrate
                    ? true
                    : false
                }
                disabled={
                  sendingCommand()
                    ? sendingCommand()!.line === props.lineName
                      ? isNaN(sendingCommand()!.axisId)
                        ? lastCommand() === LineCommand.Calibrate
                          ? false
                          : true
                        : true
                      : true
                    : false
                }
              >
                {"Calibrate"}
              </Button>
            </div>
          </Popover.Content>
        </Popover.Positioner>
      </Popover.Root>
    </Show>
  );
}
