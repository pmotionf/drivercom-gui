import { createSignal, For, splitProps } from "solid-js";
import { parseColor } from "@ark-ui/solid";
import { ColorPicker } from "~/components/ui/color-picker";
import { Heading } from "~/components/ui/heading";
import { IconButton } from "~/components/ui/icon-button";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { Card } from "../ui/card";
import {
  IconLine,
  IconLineDashed,
  IconPoint,
  IconX,
} from "@tabler/icons-solidjs";
import { ToggleGroup } from "~/components/ui/toggle-group";
import { LegendStroke } from "./Legend";

export type SeriesConfigurationProps = Omit<ColorPicker.RootProps, "stroke"> & {
  series: string;
  palette?: string[];
  color?: string;
  stroke?: LegendStroke;
  onSave?: (new_color: string, new_style: LegendStroke) => void;
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

  return (
    <Card.Root>
      <Card.Header>
        <Card.Title>Configuration</Card.Title>
        <Card.Description>{props.series}</Card.Description>
        <IconButton
          position="absolute"
          variant="ghost"
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
            <IconButton variant="outline">
              <ColorPicker.ValueSwatch />
            </IconButton>
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
          <Heading as="h6" size="xs" style={{ "margin-top": "0.2rem" }}>
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
        <Heading as="h6" size="xs" style={{ "margin-top": "0.6rem" }}>
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
          width="7.6rem"
          style={{ "margin-top": "0.4rem" }}
        >
          <ToggleGroup.Item value={LegendStroke[LegendStroke.Line]}>
            <IconLine />
          </ToggleGroup.Item>
          <ToggleGroup.Item value={LegendStroke[LegendStroke.Dash]}>
            <IconLineDashed />
          </ToggleGroup.Item>
          <ToggleGroup.Item value={LegendStroke[LegendStroke.Dot]}>
            <IconPoint />
          </ToggleGroup.Item>
        </ToggleGroup.Root>
      </Card.Body>
      <Card.Footer>
        <Button
          onClick={() => {
            props.onSave?.(selectedColor().toString("rgba"), stroke());
          }}
        >
          Save
        </Button>
      </Card.Footer>
    </Card.Root>
  );
}
