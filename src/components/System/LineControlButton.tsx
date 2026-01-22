import { IconButton, IconButtonProps } from "../ui/icon-button.tsx";
import { IconDots } from "@tabler/icons-solidjs";
import { Popover } from "../ui/popover.tsx";
import { createSignal, Show } from "solid-js";
import { getAccelaration, getSpeed } from "~/pages/utils/MmcCliHandler.ts";
import { Text } from "../ui/text.tsx";
import { Button } from "../ui/button.tsx";
import { SendingCommand } from "./System.tsx";

export type LineCommandParameters = {
  line: string;
  speed?: number;
  accelaration?: number;
  zero?: number;
};

export type LineControlProps = {
  lineName: string;
  disableMmmCliButton: boolean;
  sendingCommand: SendingCommand;
  onSave?: (save: LineCommandParameters) => void;
};

export function LineControlButton(props: LineControlProps & IconButtonProps) {
  const { ...IconButtonProps } = props;

  const [speed, setSpeed] = createSignal<number>(NaN);
  const [speedInput, setSpeedInput] = createSignal<number>(NaN);
  const [speedUnit, setSpeedUnit] = createSignal<string>("");

  const [accelaration, setAccelaration] = createSignal<number>(NaN);
  const [accelarationInput, setAccelarationInput] = createSignal<number>(NaN);
  const [accelarationUnit, setAccelarationUnit] = createSignal<string>("");

  const [zero, setZero] = createSignal<number>(0);
  const [zeroInput, setZeroInput] = createSignal<number>(0);

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

            if (isNaN(accelaration())) {
              const accelaraion = await getAccelaration(props.lineName);
              if (accelaraion) {
                const match = accelaraion.match(/^\d+/);
                const value = match ? Number(match[0]) : NaN;
                setAccelaration(value);
                setAccelarationInput(value);

                setAccelarationUnit(
                  accelaraion.match(/\s([^\s]+)$/)
                    ? accelaraion.match(/\s([^\s]+)$/)![1]
                    : "mm/s²",
                );
              }
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
            padding="0.5rem 1rem 0.5rem 1rem"
          >
            <Popover.Arrow>
              <Popover.ArrowTip />
            </Popover.Arrow>
            <div
              style={{
                display: "grid",
                "grid-template-columns": "6rem 7rem",
                "grid-template-rows": `repeat(3, 2.5rem)`,
                "align-items": "center",
              }}
            >
              {/* Speed */}
              <Text
                size="sm"
                style={{
                  "grid-row": 1,
                  "grid-column": 1,
                }}
              >
                {"Speed"}
              </Text>
              <div
                style={{
                  width: "7rem",
                  height: "2rem",
                  display: "flex",
                  "align-items": "center",
                  "border-radius": "0.5rem",
                  "border-width": "1px",
                  "grid-row": 1,
                  "grid-column": 2,
                }}
              >
                <input
                  value={speedInput()}
                  size="md"
                  onFocusOut={(e) => setSpeedInput(Number(e.target.value))}
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

              {/* Accelaration */}
              <Text
                size="sm"
                style={{
                  "grid-row": 2,
                  "grid-column": 1,
                }}
              >
                {"Accelaration"}
              </Text>
              <div
                style={{
                  width: "7rem",
                  height: "2rem",
                  display: "flex",
                  "align-items": "center",
                  "border-radius": "0.5rem",
                  "border-width": "1px",
                  "grid-row": 2,
                  "grid-column": 2,
                }}
              >
                <input
                  value={accelarationInput()}
                  onInput={(e) => setAccelarationInput(Number(e.target.value))}
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
                  {accelarationUnit()}
                </Text>
              </div>

              {/* Zero */}
              <Text
                size="sm"
                style={{
                  "grid-row": 3,
                  "grid-column": 1,
                }}
              >
                {"Zero"}
              </Text>
              <div
                style={{
                  width: "7rem",
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
                  value={zeroInput()}
                  onInput={(e) => setZeroInput(Number(e.target.value))}
                  style={{
                    width: "7rem",
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
              </div>
            </div>
            <div
              style={{
                display: "flex",
                "flex-direction": "row-reverse",
                "margin-top": "0.5rem",
              }}
            >
              <Button
                size="xs"
                height="1.5rem"
                width="2.5rem"
                fontWeight={"medium"}
                loading={
                  sendingCommand() &&
                  sendingCommand()!.line === props.lineName &&
                  isNaN(sendingCommand()!.axisId)
                    ? true
                    : false
                }
                disabled={
                  sendingCommand()
                    ? sendingCommand()!.line === props.lineName
                      ? isNaN(sendingCommand()!.axisId)
                        ? false
                        : true
                      : true
                    : false
                }
                onClick={(e) => {
                  e.stopPropagation();

                  if (
                    speed() !== speedInput() ||
                    accelaration() !== accelarationInput() ||
                    zero() !== zeroInput()
                  ) {
                    const saveProps: LineCommandParameters = {
                      line: props.lineName,
                      speed:
                        speed() === speedInput() || isNaN(speedInput())
                          ? undefined
                          : speedInput(),
                      accelaration:
                        accelaration() === accelaration() ||
                        isNaN(accelarationInput())
                          ? undefined
                          : accelarationInput(),
                      zero:
                        zero() === zeroInput() || isNaN(zeroInput())
                          ? undefined
                          : zero(),
                    };
                    props.onSave?.(saveProps);
                  }

                  if (speed() !== speedInput()) {
                    setSpeed(NaN);
                  }
                  if (accelaration() !== accelarationInput()) {
                    setAccelaration(NaN);
                  }
                  if (zero() !== zeroInput()) {
                    setZero(zeroInput());
                  }
                }}
              >
                {"Save"}
              </Button>
            </div>
          </Popover.Content>
        </Popover.Positioner>
      </Popover.Root>
    </Show>
  );
}
