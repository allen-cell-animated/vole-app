export type ColorObject = { r: number; g: number; b: number };
export type ColorArray = [number, number, number];

export const colorObjectToArray = (obj: ColorObject): ColorArray => [obj.r, obj.g, obj.b];

export const colorArrayToObject = (arr: ColorArray): ColorObject => ({ r: arr[0], g: arr[1], b: arr[2] });

export const colorArrayToFloats = (arr: ColorArray): ColorArray => [arr[0] / 255, arr[1] / 255, arr[2] / 255];

export const colorArrayToString = (arr: ColorArray): string => `rgb(${arr[0]}, ${arr[1]}, ${arr[2]})`;
