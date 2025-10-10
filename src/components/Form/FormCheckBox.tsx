import { Checkbox } from "../ui/checkbox";
import { Text } from "../ui/text";

export type FormCheckBoxProps = {
  id: string;
  label: string;
  checked: boolean;
  onCheckedChange?: (checked: boolean) => void;
  onClick?: () => void;
  onShiftClick?: () => void;
};

export const FormCheckBox = (props: FormCheckBoxProps) => {
  const key = props.label;
  return (
    <Checkbox
      id={props.id}
      checked={props.checked}
      onCheckedChange={(e) => {
        props.onCheckedChange?.(e.checked === true ? true : false);
      }}
      marginTop="1rem"
      onClick={(e) => {
        if (!e.shiftKey) {
          props.onClick?.();
        } else {
          props.onShiftClick?.();
        }
      }}
    >
      <Text fontWeight="light" userSelect="none">
        {key}
      </Text>
    </Checkbox>
  );
};
