import { IconButton, IconButtonProps } from "../ui/icon-button.tsx";
import { IconSettings } from "@tabler/icons-solidjs";
import { Popover } from "../ui/popover.tsx";
import { Input } from "../ui/input.tsx";
import { Button } from "../ui/button.tsx";
import { createSignal } from "solid-js";
import { Text } from "../ui/text.tsx";

export enum AxisDirection {
  FORWARD = "forward",
  BACKWARD = "backward",
}

export type AxisSettingProps = {
  onPull?: (
    axisDirection: string,
    carrierId: string,
    cas: boolean,
    destination?: string,
  ) => void;
  onPush?: (axisDirection: string, carrierId?: string) => void;
  onStopPull?: () => void;
  onStopPush?: () => void;
  stopPullDisabled?: boolean;
  stopPushDisabled?: boolean;
};

export function AxisSetting(props: AxisSettingProps & IconButtonProps) {
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
  const [casEnable, setCasEnable] = createSignal<boolean>(false);

  return (
    <Popover.Root>
      <Popover.Trigger width="min-content" height={"min-content"}>
        <IconButton {...IconButtonProps}>
          <IconSettings />
        </IconButton>
      </Popover.Trigger>
      <Popover.Positioner>
        <Popover.Content width="12rem">
          <Popover.Arrow>
            <Popover.ArrowTip />
          </Popover.Arrow>

          <div style={{ width: "100%" }}>
            <div
              style={{
                display: "flex",
                width: "100%",
                "align-items": "center",
              }}
            >
              <Text fontWeight={"bold"} size="sm" width={`100%`}>
                {"Push"}
              </Text>
              <Button
                width="3rem"
                height="2rem"
                onClick={() => {
                  if (onPush) {
                    onPush(
                      pushDirection(),
                      pushCarrierId().length === 0
                        ? undefined
                        : pushCarrierId(),
                    );
                  }
                }}
              >
                {"Push"}
              </Button>
              <Button
                width="3rem"
                height={"2rem"}
                marginLeft={`0.5rem`}
                variant="outline"
                disabled={
                  props.stopPushDisabled !== undefined
                    ? props.stopPushDisabled
                    : true
                }
                onClick={() => {
                  if (onStopPush) {
                    onStopPush();
                  }
                }}
              >
                {"Stop"}
              </Button>
            </div>
            <div
              style={{
                width: "100%",
                height: "max-content",
                display: "flex",
                "align-items": "center",
                "flex-direction": "row",
              }}
            >
              <div
                style={{
                  "flex-direction": "column",
                  width: `max-content`,
                }}
              >
                <Text size="sm">{"Direction"}</Text>
                <Button
                  width="4.5rem"
                  height="2rem"
                  variant="outline"
                  onClick={() => {
                    setPushDirection(
                      pushDirection() === AxisDirection.FORWARD
                        ? AxisDirection.BACKWARD
                        : AxisDirection.FORWARD,
                    );
                  }}
                >
                  {pushDirection()}
                </Button>
              </div>
              <div
                style={{
                  "flex-direction": "column",
                  width: `5rem`,
                  opacity: pushCarrierId().length > 0 ? "1" : "0.5",
                  "margin-left": "1rem",
                }}
              >
                <Text size="sm">{"Carrier"}</Text>
                <Input
                  value={pushCarrierId()}
                  onInput={(e) => setPushCarrierId(e.target.value)}
                  height="2rem"
                  padding="0.2rem"
                />
              </div>
            </div>
          </div>

          <div
            style={{
              width: "100%",
              "margin-top": "1rem",
              "border-top-width": "1px",
              "padding-top": "0.5rem",
            }}
          >
            <div
              style={{
                width: "100%",
                display: "flex",
                "align-items": "center",
              }}
            >
              <Text fontWeight={"bold"} size="sm" width={"100%"}>
                {"Pull"}
              </Text>
              <Button
                width="3rem"
                height={"2rem"}
                onClick={() => {
                  if (onPull) {
                    onPull(
                      pullDirection(),
                      pullCarrierId(),
                      casEnable(),
                      pullDestination().length === 0
                        ? undefined
                        : pullDestination(),
                    );
                  }
                }}
              >
                {"Pull"}
              </Button>
              <Button
                width="2.5rem"
                height={"2rem"}
                marginLeft={`0.5rem`}
                variant="outline"
                size="xs"
                disabled={
                  props.stopPullDisabled !== undefined
                    ? props.stopPullDisabled
                    : true
                }
                onClick={() => {
                  if (onStopPull) {
                    onStopPull();
                  }
                }}
              >
                {"Stop"}
              </Button>
            </div>
            <div
              style={{
                width: "100%",
                height: "max-content",
                display: "flex",
                "align-items": "center",
                "flex-direction": "row-reverse",
              }}
            >
              <div
                style={{
                  "flex-direction": "column",
                  width: `5rem`,
                }}
              >
                <Text size="sm">{"Carrier"}</Text>
                <Input
                  value={pullCarrierId()}
                  onInput={(e) => setPullCarrierId(e.target.value)}
                  height={"2rem"}
                  padding="0.2rem"
                />
              </div>

              <div
                style={{
                  "flex-direction": "column",
                  width: `4.5rem`,
                  "margin-right": "1rem",
                }}
              >
                <Text size="sm">{"Direction"}</Text>
                <Button
                  width="4.5rem"
                  height="2rem"
                  variant="outline"
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
              </div>
            </div>
            <div style={{ display: "flex", width: "100%" }}>
              <div
                style={{
                  "flex-direction": "column",
                  width: `3rem`,
                  opacity: !casEnable() ? "0.5" : "1",
                }}
              >
                <Text size="sm">{"CAS"}</Text>
                <Button
                  variant={"outline"}
                  onClick={() => setCasEnable(!casEnable())}
                  height={"2rem"}
                  padding="0.4rem"
                >
                  {casEnable() ? "False" : "True"}
                </Button>
              </div>
              <div
                style={{
                  "flex-direction": "column",
                  width: `calc(100% - 3.5rem)`,
                  opacity:
                    pullDestination().length > 0 && pullDestination() !== "NaN"
                      ? "1"
                      : "0.5",
                  "margin-left": "0.5rem",
                }}
              >
                <Text size="sm">{"Destination"}</Text>
                <Input
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
            </div>
          </div>
        </Popover.Content>
      </Popover.Positioner>
    </Popover.Root>
  );
}
