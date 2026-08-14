import { IconArrowNarrowRight, IconHelp } from "@tabler/icons-solidjs";
import { For } from "solid-js";
import { css } from "styled-system/css";
import { IconButton } from "~/components/ui/icon-button";
import { Text } from "~/components/ui/text";
import { Tooltip } from "~/components/ui/tooltip";

export const FlipSensorExample = () => {
  return (
    <Tooltip
      contentProps={{
        style: {
          "max-width": "50rem",
          ["--tooltip-bg" as string]: "var(--colors-gray-1)",
        },
      }}
      content={
        <div
          class={css({ background: "gray.1", color: "fg.default" })}
          style={{ display: "flex", width: "30rem", height: "10rem" }}
        >
          <div style={{ width: "14rem", height: "9rem" }}>
            <Text>{"Before Flip"}</Text>
            <div
              style={{
                width: "100%",
                height: "100%",
                display: "grid",
                "grid-template-rows": "2rem 5rem",
                "grid-template-columns": "12rem 3rem",
                "row-gap": "0.5rem",
                "border-width": "1px",
                padding: "0.5rem",
              }}
            >
              <div style={{ "grid-row": "1", "grid-column": "1" }}>
                <Text
                  width={"12rem"}
                  height={"1.5rem"}
                  fontWeight="medium"
                  borderWidth="1px"
                  textAlign="center"
                  padding="0.2rem"
                >
                  {"Magnet Plate"}
                </Text>
                <div style={{ display: "flex" }}>
                  <For each={Array.from({ length: 12 }, (_, i) => i)}>
                    {(magnetPole) => {
                      return (
                        <div
                          class={css({
                            background: magnetPole % 2 === 0 ? "blue" : "red",
                          })}
                          style={{ height: "0.5rem", width: "1rem" }}
                        />
                      );
                    }}
                  </For>
                </div>
              </div>

              <IconArrowNarrowRight
                style={{ "grid-row": "1", "grid-column": "2" }}
              />
              <div
                style={{
                  "grid-row": "2",
                  "grid-column": "1",
                  display: "flex",
                }}
              >
                <div
                  style={{
                    width: "1rem",
                    height: "3rem",
                    display: "flex",
                    "flex-direction": "column",
                    "align-items": "center",
                  }}
                >
                  <div
                    class={css({
                      borderBottom: "0.2rem solid",
                      borderBottomColor: "bg.disabled",
                    })}
                    style={{
                      width: 0,
                      height: 0,
                      "border-left": "0.2rem solid transparent",
                      "border-right": "0.2rem solid transparent",
                    }}
                  />
                  <div
                    class={css({
                      background: "bg.disabled",
                    })}
                    style={{
                      width: "0.4rem",
                      height: "0.8rem",
                    }}
                  />

                  <div
                    style={{
                      width: "1rem",
                      height: "2rem",
                      display: "flex",
                      "align-items": "center",
                      "justify-content": "center",
                      "border-width": "1px",
                    }}
                  >
                    <Text textAlign="center">L</Text>
                  </div>
                </div>
                <div
                  style={{
                    width: "10rem",
                    height: "5rem",
                    "padding-left": "0.5rem",
                    "padding-right": "0.5rem",
                  }}
                >
                  <Text textStyle="xs">Coil</Text>
                  <div
                    class={css({ background: "bg.disabled" })}
                    style={{
                      width: "100%",
                      height: `calc(100% - 2.2rem)`,
                      display: "grid",
                      "grid-template-rows": "2.5rem 1rem",
                      "grid-template-columns": "repeat(9, 1rem)",
                      "border-width": "1px",
                      "row-gap": "0.2rem",
                    }}
                  >
                    <For each={Array.from({ length: 9 }, (_, i) => i + 1)}>
                      {(coil) => {
                        return (
                          <>
                            <div
                              style={{
                                "grid-row": 1,
                                "grid-column": coil,
                                height: "2.5rem",
                                width: "0.8rem",
                                "border-width": "4px",
                                "border-radius": "0.2rem",
                                "justify-self": "center",
                                "border-color": "orange",
                              }}
                            />
                            <Text
                              textAlign="center"
                              style={{
                                "grid-row": 2,
                                "grid-column": coil,
                                height: "1rem",
                                width: "1rem",
                              }}
                            >
                              {coil % 3 === 2
                                ? "V"
                                : coil % 3 === 1
                                  ? "U"
                                  : "W"}
                            </Text>
                          </>
                        );
                      }}
                    </For>
                  </div>
                </div>
                <div
                  style={{
                    width: "1rem",
                    height: "3rem",
                    display: "flex",
                    "flex-direction": "column",
                    "align-items": "center",
                  }}
                >
                  <div
                    class={css({
                      borderBottom: "0.2rem solid",
                      borderBottomColor: "bg.disabled",
                    })}
                    style={{
                      width: 0,
                      height: 0,
                      "border-left": "0.2rem solid transparent",
                      "border-right": "0.2rem solid transparent",
                    }}
                  />
                  <div
                    class={css({
                      background: "bg.disabled",
                    })}
                    style={{
                      width: "0.4rem",
                      height: "0.8rem",
                    }}
                  />

                  <div
                    style={{
                      width: "1rem",
                      height: "2rem",
                      display: "flex",
                      "align-items": "center",
                      "justify-content": "center",
                      "border-width": "1px",
                    }}
                  >
                    <Text textAlign="center">R</Text>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div
            style={{
              width: "2rem",
              height: "100%",
              display: "flex",
              "align-items": "center",
              "justify-content": "center",
            }}
          >
            <div
              class={css({ background: "bg.disabled" })}
              style={{ width: "0.5rem", height: "0.5rem" }}
            />
            <div
              class={css({
                borderLeft: "0.5rem solid",
                borderLeftColor: "bg.disabled",
                borderTop: "0.5rem solid transparent",
                borderBottom: "0.5rem solid transparent",
                width: 0,
                height: 0,
              })}
            />
          </div>

          {/*after flip */}
          <div style={{ width: "14rem", height: "9rem" }}>
            <Text>{"After Flip"}</Text>
            <div
              style={{
                width: "100%",
                height: "100%",
                display: "grid",
                "grid-template-rows": "2rem 5rem",
                "grid-template-columns": "12rem 3rem",
                "row-gap": "0.5rem",
                "border-width": "1px",
                padding: "0.5rem",
              }}
            >
              <div style={{ "grid-row": "1", "grid-column": "1" }}>
                <Text
                  width={"12rem"}
                  height={"1.5rem"}
                  fontWeight="medium"
                  borderWidth="1px"
                  textAlign="center"
                  padding="0.2rem"
                >
                  {"Magnet Plate"}
                </Text>
                <div style={{ display: "flex" }}>
                  <For each={Array.from({ length: 12 }, (_, i) => i)}>
                    {(magnetPole) => {
                      return (
                        <div
                          class={css({
                            background: magnetPole % 2 === 0 ? "blue" : "red",
                          })}
                          style={{ height: "0.5rem", width: "1rem" }}
                        />
                      );
                    }}
                  </For>
                </div>
              </div>

              <IconArrowNarrowRight
                style={{ "grid-row": "1", "grid-column": "2" }}
              />
              <div
                style={{
                  "grid-row": "2",
                  "grid-column": "1",
                  display: "flex",
                }}
              >
                <div
                  style={{
                    width: "1rem",
                    height: "3rem",
                    display: "flex",
                    "flex-direction": "column",
                    "align-items": "center",
                    transform: "scaleY(-1)",
                    "margin-top": "1rem",
                  }}
                >
                  <div
                    class={css({
                      borderBottom: "0.2rem solid",
                      borderBottomColor: "bg.disabled",
                    })}
                    style={{
                      width: 0,
                      height: 0,
                      "border-left": "0.2rem solid transparent",
                      "border-right": "0.2rem solid transparent",
                    }}
                  />
                  <div
                    class={css({
                      background: "bg.disabled",
                    })}
                    style={{
                      width: "0.4rem",
                      height: "0.8rem",
                    }}
                  />

                  <div
                    style={{
                      width: "1rem",
                      height: "2rem",
                      display: "flex",
                      "align-items": "center",
                      "justify-content": "center",
                      "border-width": "1px",
                    }}
                  >
                    <Text textAlign="center">L</Text>
                  </div>
                </div>
                <div
                  style={{
                    width: "10rem",
                    height: "5rem",
                    "padding-left": "0.5rem",
                    "padding-right": "0.5rem",
                  }}
                >
                  <Text textStyle="xs">Coil</Text>
                  <div
                    class={css({ background: "bg.disabled" })}
                    style={{
                      width: "100%",
                      height: `calc(100% - 2.2rem)`,
                      display: "grid",
                      "grid-template-rows": "2.5rem 1rem",
                      "grid-template-columns": "repeat(9, 1rem)",
                      "border-width": "1px",
                      "row-gap": "0.2rem",
                    }}
                  >
                    <For each={Array.from({ length: 9 }, (_, i) => i + 1)}>
                      {(coil) => {
                        return (
                          <>
                            <div
                              style={{
                                "grid-row": 1,
                                "grid-column": coil,
                                height: "2.5rem",
                                width: "0.8rem",
                                "border-width": "4px",
                                "border-radius": "0.2rem",
                                "justify-self": "center",
                                "border-color": "orange",
                              }}
                            />
                            <Text
                              textAlign="center"
                              style={{
                                "grid-row": 2,
                                "grid-column": coil,
                                height: "1rem",
                                width: "1rem",
                              }}
                            >
                              {coil % 3 === 2
                                ? "V"
                                : coil % 3 === 1
                                  ? "U"
                                  : "W"}
                            </Text>
                          </>
                        );
                      }}
                    </For>
                  </div>
                </div>
                <div
                  style={{
                    width: "1rem",
                    height: "3rem",
                    display: "flex",
                    "flex-direction": "column",
                    "align-items": "center",
                    transform: "scaleY(-1)",
                    "margin-top": "1rem",
                  }}
                >
                  <div
                    class={css({
                      borderBottom: "0.2rem solid",
                      borderBottomColor: "bg.disabled",
                    })}
                    style={{
                      width: 0,
                      height: 0,
                      "border-left": "0.2rem solid transparent",
                      "border-right": "0.2rem solid transparent",
                    }}
                  />
                  <div
                    class={css({
                      background: "bg.disabled",
                    })}
                    style={{
                      width: "0.4rem",
                      height: "0.8rem",
                    }}
                  />

                  <div
                    style={{
                      width: "1rem",
                      height: "2rem",
                      display: "flex",
                      "align-items": "center",
                      "justify-content": "center",
                      "border-width": "1px",
                    }}
                  >
                    <Text textAlign="center">R</Text>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      }
    >
      <IconButton
        size={"xs"}
        width="0.5rem"
        padding="0"
        height="1rem"
        variant={"plain"}
        onClick={(e) => {
          e.stopPropagation();
        }}
        opacity={"0.5"}
      >
        <IconHelp />
      </IconButton>
    </Tooltip>
  );
};
