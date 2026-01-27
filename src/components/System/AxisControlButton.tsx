import { IconButton, IconButtonProps } from "../ui/icon-button.tsx";
import { IconDots } from "@tabler/icons-solidjs";
import { Popover } from "../ui/popover.tsx";
import { Input } from "../ui/input.tsx";
import { Button } from "../ui/button.tsx";
import { createSignal, Show } from "solid-js";
import { Text } from "../ui/text.tsx";

export enum AxisDirection {
  FORWARD = "forward",
  BACKWARD = "backward",
}

export type AxisSettingProps = {
  sendingCommand: boolean;
  disableCommandButton: boolean;
  disableMmcCliButton: boolean;
  onPull?: (
    axisDirection: string,
    carrierId: string,
    cas: string,
    destination?: string,
  ) => void;
  onPush?: (axisDirection: string, carrierId?: string) => void;
  onStopPull?: () => void;
  onStopPush?: () => void;
  onStopCommand?: () => void;
  stopPullDisabled?: boolean;
  stopPushDisabled?: boolean;
};

enum AxisCommandType {
  Pull,
  StopPull,
  Push,
  StopPush,
  PullCancel,
  PushCancel,
  None,
}

enum CasState {
  On = "on",
  Off = "off",
}

export function AxisControlButton(props: AxisSettingProps & IconButtonProps) {
  const { onPull, onPush, onStopPull, onStopPush, ...IconButtonProps } = props;

  const [pushCarrierId, setPushCarrierId] = createSignal<string>("");
  const [pushDirection, setPushDirection] = createSignal<AxisDirection>(
    AxisDirection.FORWARD,
  );
  const [pullCarrierId, setPullCarrierId] = createSignal<string>("");
  const [pullDestination, setPullDestination] = createSignal<string>("");
  const [pullDirection, setPullDirection] = createSignal<AxisDirection>(
    AxisDirection.BACKWARD,
  );
  const [casEnable, setCasEnable] = createSignal<CasState>(CasState.On);

  const [lastCommand, setLastCommand] = createSignal<AxisCommandType>(
    AxisCommandType.None,
  );

  return (
    <Show when={!props.disableMmcCliButton}>
      <Popover.Root>
        <Popover.Trigger
          width="min-content"
          height={"min-content"}
          disabled={props.disableMmcCliButton}
        >
          <IconButton {...IconButtonProps} disabled={props.disableMmcCliButton}>
            <IconDots />
          </IconButton>
        </Popover.Trigger>
        <Popover.Positioner>
          <Popover.Content width="12rem">
            <Popover.Arrow>
              <Popover.ArrowTip />
            </Popover.Arrow>
            {/* Push */}
            <div
              style={{
                width: "100%",
                display: "grid",
                "grid-template-rows": `repeat(2, 1.5rem)`,
                "grid-template-columns": `repeat(2, 4.5rem)`,
                "column-gap": "1rem",
              }}
            >
              <Text
                fontWeight={"bold"}
                size="sm"
                width={`100%`}
                style={{ "grid-row": 1, "grid-column": 1 }}
              >
                {"Push"}
              </Text>
              <Button
                width="2.5rem"
                marginLeft={`calc(100% - 2.5rem)`}
                height={"1.5rem"}
                size="xs"
                fontWeight={"medium"}
                style={{ "grid-row": 1, "grid-column": 2 }}
                variant={props.stopPushDisabled === true ? "solid" : "outline"}
                disabled={
                  props.disableCommandButton
                    ? props.sendingCommand
                      ? lastCommand() !== AxisCommandType.Push &&
                        lastCommand() !== AxisCommandType.StopPush &&
                        lastCommand() !== AxisCommandType.None
                      : true
                    : false
                }
                loading={
                  props.sendingCommand &&
                  lastCommand() === AxisCommandType.PushCancel
                }
                onClick={() => {
                  if (
                    props.sendingCommand &&
                    (lastCommand() === AxisCommandType.Push ||
                      lastCommand() === AxisCommandType.StopPush)
                  ) {
                    props.onStopCommand?.();
                    setLastCommand(AxisCommandType.PushCancel);
                    return;
                  }
                  if (props.stopPushDisabled === true && onPush) {
                    onPush(
                      pushDirection(),
                      pushCarrierId().length === 0
                        ? undefined
                        : pushCarrierId(),
                    );
                    setLastCommand(AxisCommandType.Push);
                    return;
                  }
                  if (props.stopPushDisabled === false && onStopPush) {
                    onStopPush();
                    setLastCommand(AxisCommandType.StopPush);
                    return;
                  }
                }}
              >
                {props.sendingCommand &&
                (lastCommand() === AxisCommandType.Push ||
                  lastCommand() === AxisCommandType.StopPush)
                  ? "Cancel"
                  : props.stopPushDisabled === true
                    ? "Push"
                    : "Stop"}
              </Button>

              <Text
                size="sm"
                style={{
                  "grid-row": 2,
                  "grid-column": 1,
                }}
              >
                {"Direction"}
              </Text>
              <Button
                height="2rem"
                variant="outline"
                onClick={() => {
                  setPushDirection(
                    pushDirection() === AxisDirection.FORWARD
                      ? AxisDirection.BACKWARD
                      : AxisDirection.FORWARD,
                  );
                }}
                style={{
                  "grid-row": 3,
                  "grid-column": 1,
                }}
              >
                {pushDirection()}
              </Button>
              <Text
                size="sm"
                style={{
                  opacity: pushCarrierId().length > 0 ? "1" : "0.5",
                  "grid-row": 2,
                  "grid-column": 2,
                }}
              >
                {"Carrier"}
              </Text>
              <Input
                value={pushCarrierId()}
                onInput={(e) => setPushCarrierId(e.target.value)}
                height="2rem"
                padding="0.2rem"
                style={{
                  width: `4rem`,
                  opacity: pushCarrierId().length > 0 ? "1" : "0.5",
                  "grid-row": 3,
                  "grid-column": 2,
                }}
              />
            </div>

            {/* Pull */}
            <div
              style={{
                width: "100%",
                "margin-top": "1rem",
                "border-top-width": "1px",
                "padding-top": "0.5rem",
                display: "grid",
                "grid-template-rows": `repeat(5, 1.5rem, 2rem)`,
                "grid-template-columns": `repeat(2, 4.5rem)`,
                "column-gap": "1rem",
              }}
            >
              <Text
                fontWeight={"bold"}
                size="sm"
                width={"100%"}
                style={{ "grid-row": 1, "grid-column": 1 }}
              >
                {"Pull"}
              </Text>
              <Button
                width="2.5rem"
                height={"1.5rem"}
                variant={props.stopPullDisabled === true ? "solid" : "outline"}
                fontWeight={"medium"}
                size="xs"
                marginLeft={`calc(100% - 2.5rem)`}
                style={{ "grid-row": 1, "grid-column": 2 }}
                loading={
                  props.sendingCommand &&
                  lastCommand() === AxisCommandType.PullCancel
                }
                disabled={
                  props.disableCommandButton
                    ? props.sendingCommand
                      ? lastCommand() !== AxisCommandType.Pull &&
                        lastCommand() !== AxisCommandType.StopPull &&
                        lastCommand() !== AxisCommandType.None
                      : true
                    : false
                }
                onClick={() => {
                  if (
                    props.sendingCommand &&
                    (lastCommand() === AxisCommandType.Pull ||
                      lastCommand() === AxisCommandType.StopPull)
                  ) {
                    props.onStopCommand?.();
                    setLastCommand(AxisCommandType.PullCancel);
                    return;
                  }
                  if (props.stopPullDisabled === true && onPull) {
                    onPull(
                      pullDirection(),
                      pullCarrierId(),
                      casEnable(),
                      pullDestination().length === 0
                        ? undefined
                        : pullDestination(),
                    );
                    setLastCommand(AxisCommandType.Pull);
                    return;
                  }

                  if (props.stopPullDisabled === false && onStopPull) {
                    onStopPull();
                    setLastCommand(AxisCommandType.StopPull);
                    return;
                  }
                }}
              >
                {props.sendingCommand &&
                (lastCommand() === AxisCommandType.Pull ||
                  lastCommand() === AxisCommandType.StopPull)
                  ? "Cancel"
                  : props.stopPullDisabled === true
                    ? "Pull"
                    : "Stop"}
              </Button>
              <Text size="sm" style={{ "grid-row": 2, "grid-column": 1 }}>
                {"Carrier"}
              </Text>
              <Input
                style={{ "grid-row": 3, "grid-column": 1 }}
                value={pullCarrierId()}
                onInput={(e) => setPullCarrierId(e.target.value)}
                height={"2rem"}
                padding="0.2rem"
              />

              <Text size="sm" style={{ "grid-row": 2, "grid-column": 2 }}>
                {"Direction"}
              </Text>
              <Button
                width="4.5rem"
                height="2rem"
                variant="outline"
                style={{ "grid-row": 3, "grid-column": 2 }}
                onClick={() => {
                  setPullDirection(
                    pullDirection() === AxisDirection.FORWARD
                      ? AxisDirection.BACKWARD
                      : AxisDirection.FORWARD,
                  );
                }}
              >
                {pullDirection()}
              </Button>

              <Text
                size="sm"
                style={{
                  "grid-row": 4,
                  "grid-column": 2,
                  opacity: casEnable() === CasState.On ? "0.5" : "1",
                }}
              >
                {"CAS"}
              </Text>
              <Button
                variant={"outline"}
                style={{
                  "grid-row": 5,
                  "grid-column": 2,
                  opacity: casEnable() === CasState.On ? "0.5" : "1",
                }}
                onClick={() =>
                  setCasEnable((prev) =>
                    prev === CasState.On ? CasState.Off : CasState.On,
                  )
                }
                height={"2rem"}
                padding="0.4rem"
              >
                {casEnable()}
              </Button>

              <Text
                size="sm"
                style={{
                  "grid-row": 4,
                  "grid-column": 1,
                  opacity:
                    pullDestination().length > 0 && pullDestination() !== "NaN"
                      ? "1"
                      : "0.5",
                }}
              >
                {"Destination"}
              </Text>
              <Input
                style={{
                  "grid-row": 5,
                  "grid-column": 1,
                  opacity:
                    pullDestination().length > 0 && pullDestination() !== "NaN"
                      ? "1"
                      : "0.5",
                }}
                value={pullDestination()}
                onChange={(e) => {
                  if (isNaN(Number(e.target.value))) {
                    setPullDestination("NaN");
                  } else {
                    setPullDestination(e.target.value);
                  }
                }}
                height={"2rem"}
                padding="0.2rem"
              />
            </div>
          </Popover.Content>
        </Popover.Positioner>
      </Popover.Root>
    </Show>
  );
}
