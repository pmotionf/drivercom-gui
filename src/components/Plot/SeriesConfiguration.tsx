import { createSignal, For, splitProps } from "solid-js";
import { parseColor } from "@ark-ui/solid";
import * as ColorPicker from "~/components/ui/color-picker";
import { Heading } from "~/components/ui/heading";
import { IconButton } from "~/components/ui/icon-button";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import * as Card from "../ui/card";
import {
  IconLine,
  IconLineDashed,
  IconPoint,
  IconX,
} from "@tabler/icons-solidjs";
import * as ToggleGroup from "~/components/ui/toggle-group";
import { LegendStroke } from "./Legend";
import { css } from "styled-system/css";

export type SeriesConfigurationProps = Omit<ColorPicker.RootProps, "stroke"> & {
  series: string;
  palette?: string[];
  color?: string;
  stroke?: LegendStroke;
  dataFilter?: number;
  onSave?: (
    new_color: string,
    new_style: LegendStroke,
    new_filter?: number,
  ) => void;
  onCancel?: () => void;
};

export function SeriesConfiguration(props: SeriesConfigurationProps) {
  const [, rest] = splitProps(props, [
    "series",
    "palette",
    "color",
    "stroke",
    "onSave",
    "onCancel",
  ]);

  const [selectedColor, setSelectedColor] = createSignal(
    parseColor(props.color ?? "#fff"),
  );

  const [stroke, setStroke] = createSignal(props.stroke ?? LegendStroke.Line);

  const [dataFilter, setDataFilter] = createSignal<number>(
    props.dataFilter ?? 0,
  );

  return (
    <Card.Root style={{ padding: "0" }}>
      <Card.Header>
        <Card.Title>Configuration asd</Card.Title>
        <Card.Description>{props.series}</Card.Description>
        <IconButton
          position="absolute"
          variant="plain"
          top="2"
          right="2"
          onClick={() => props.onCancel?.()}
        >
          <IconX />
        </IconButton>
      </Card.Header>
      <Card.Body>
        <ColorPicker.Root
          value={selectedColor()}
          onValueChange={(e) => setSelectedColor(e.value)}
          onValueChangeEnd={(e) => setSelectedColor(e.value)}
          open
          {...rest}
        >
          <ColorPicker.Label>
            <Heading>Color</Heading>
          </ColorPicker.Label>
          <ColorPicker.Control>
            <ColorPicker.ChannelInput
              channel="hex"
              asChild={(inputProps) => <Input {...inputProps()} />}
            />
            <div
              style={{
                width: "3rem",
                height: "2.5rem",
                "border-width": "1px",
                display: "flex",
                "align-items": "center",
                "justify-content": "center",
                "border-radius": "0.2rem",
              }}
            >
              <div
                style={{
                  width: "1.8rem",
                  height: "1.8rem",
                  "border-radius": "0.2rem",
                  background: `${selectedColor()}`,
                }}
              />
            </div>
          </ColorPicker.Control>
          <ColorPicker.Area>
            <ColorPicker.AreaBackground />
            <ColorPicker.AreaThumb />
          </ColorPicker.Area>
          <ColorPicker.ChannelSlider
            channel="hue"
            style={{ "margin-top": "1rem" }}
          >
            <ColorPicker.ChannelSliderTrack />
            <ColorPicker.ChannelSliderThumb />
          </ColorPicker.ChannelSlider>
          <Heading as="h6" textStyle="xs" style={{ "margin-top": "0.2rem" }}>
            Color Palette
          </Heading>
          <ColorPicker.SwatchGroup>
            <For each={props.palette}>
              {(color) => (
                <ColorPicker.SwatchTrigger value={color}>
                  <ColorPicker.Swatch value={color} />
                </ColorPicker.SwatchTrigger>
              )}
            </For>
          </ColorPicker.SwatchGroup>
        </ColorPicker.Root>

        <div
          style={{
            display: "grid",
            "grid-template-columns": "50% 50%",
            "grid-template-rows": "1.5rem 3rem",
          }}
        >
          <Heading
            as="h6"
            textStyle="xs"
            style={{ "margin-top": "0.6rem", "grid-row": 1, "grid-column": 1 }}
          >
            Style
          </Heading>
          <ToggleGroup.Root
            value={[LegendStroke[stroke()]]}
            onValueChange={(details) => {
              if (details.value.length > 0) {
                setStroke(
                  LegendStroke[details.value[0] as keyof typeof LegendStroke],
                );
              } else {
                const current_stroke = stroke();
                const other_stroke = ((current_stroke.valueOf() + 1) %
                  Object.keys(LegendStroke).length) as LegendStroke;
                setStroke(other_stroke);
                setStroke(current_stroke);
              }
            }}
            width="10rem"
            style={{ "margin-top": "0.4rem", "grid-row": 2, "grid-column": 1 }}
          >
            <ToggleGroup.Item
              value={LegendStroke[LegendStroke.Line]}
              class={css({
                background:
                  LegendStroke[stroke()] === LegendStroke[LegendStroke.Line]
                    ? "Background"
                    : "gray.2",
                padding: "0.5rem",
                borderWidth: "1px 0px 1px 1px",
                borderRadius: "0.3rem 0 0 0.3rem",
                _hover: {
                  background:
                    LegendStroke[stroke()] === LegendStroke[LegendStroke.Line]
                      ? "Background"
                      : "gray.1",
                }
              })}
            >
              <IconLine />
            </ToggleGroup.Item>
            <ToggleGroup.Item value={LegendStroke[LegendStroke.Dash]}
              class={css({
                background:
                  LegendStroke[stroke()] === LegendStroke[LegendStroke.Dash]
                    ? "Background"
                    : "gray.2",
                padding: "0.5rem",
                borderWidth: "1px",
                _hover: {
                  background:
                    LegendStroke[stroke()] === LegendStroke[LegendStroke.Dash]
                      ? "Background"
                      : "gray.1",
                }
              })}
            >
              <IconLineDashed />
            </ToggleGroup.Item>
            <ToggleGroup.Item value={LegendStroke[LegendStroke.Dot]}
              class={css({
                background:
                  LegendStroke[stroke()] === LegendStroke[LegendStroke.Dot]
                    ? "Background"
                    : "gray.2",
                padding: "0.5rem",
                borderWidth: "1px 1px 1px 0px",
                borderRadius: "0 0.3rem 0.3rem 0",
                _hover: {
                  background:
                    LegendStroke[stroke()] === LegendStroke[LegendStroke.Dot]
                      ? "Background"
                      : "gray.1",
                }
              })}>
              <IconPoint />
            </ToggleGroup.Item>
          </ToggleGroup.Root>
          <Heading
            as="h6"
            textStyle="xs"
            style={{
              "margin-top": "0.6rem",
              "white-space": "nowrap",
              "grid-row": 1,
              "grid-column": 2,
            }}
          >
            Smoothing Filter
          </Heading>
          <Input
            value={dataFilter().toString()}
            onChange={(e) => {
              setDataFilter(Number(e.target.value));
            }}
            style={{ "grid-row": 2, "grid-column": 2, "margin-top": "0.4rem" }}
          />
        </div>
      </Card.Body>
      <Card.Footer>
        <Button
          onClick={() => {
            props.onSave?.(
              selectedColor().toString("rgba"),
              stroke(),
              !isNaN(dataFilter()) ? dataFilter() : undefined,
            );
          }}
        >
          Save
        </Button>
      </Card.Footer>
    </Card.Root>
  );
}
