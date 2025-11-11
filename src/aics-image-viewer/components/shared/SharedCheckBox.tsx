import { Checkbox } from "antd";
import type { CheckboxChangeEvent } from "antd/lib/checkbox";
import React from "react";

type SharedCheckboxProps<T> = React.PropsWithChildren<{
  allOptions: T[];
  checkedList: T[];
  onChange: (checked: boolean, checkedList: T[]) => void;
  style?: React.CSSProperties;
}>;

const SharedCheckbox = <T,>(props: SharedCheckboxProps<T>): React.ReactElement => {
  const onCheckAllChange = ({ target }: CheckboxChangeEvent): void => props.onChange(target.checked, props.allOptions);

  const indeterminate = !!props.checkedList.length && props.checkedList.length < props.allOptions.length;
  const checkAll = props.checkedList.length === props.allOptions.length;

  return (
    <Checkbox indeterminate={indeterminate} onChange={onCheckAllChange} checked={checkAll} style={props.style}>
      {props.children}
    </Checkbox>
  );
};

export default SharedCheckbox;
