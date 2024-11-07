import { createSignal, For, splitProps } from "solid-js";

import { parseColor } from "@ark-ui/solid";
import { ColorPicker } from "~/components/ui/color-picker";
import { Heading } from "~/components/ui/heading";
import { IconButton } from "~/components/ui/icon-button";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { Card } from "../ui/card";
import { IconX } from "@tabler/icons-solidjs";

export type SeriesConfigurationProps = ColorPicker.RootProps & {
  series: string;
  palette?: string[];
  color?: string;
  onSave?: (new_color: string) => void;
  onCancel?: () => void;
};

export function SeriesConfiguration(props: SeriesConfigurationProps) {
  const [, rest] = splitProps(props, [
    "series",
    "palette",
    "color",
    "onSave",
    "onCancel",
  ]);

  const [selectedColor, setSelectedColor] = createSignal(
    parseColor(props.color ?? "#fff"),
  );

  return (
    <Card.Root>
      <Card.Header>
        <Card.Title>Configuration</Card.Title>
        <Card.Description>{props.series}</Card.Description>
        <IconButton
          position={"absolute"}
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
      </Card.Body>
      <Card.Footer>
        <Button
          onClick={() => props.onSave?.(selectedColor().toString("rgba"))}
        >
          Save
        </Button>
      </Card.Footer>
    </Card.Root>
  );
}
