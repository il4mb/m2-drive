import { blue } from "@mui/material/colors";
import { gray, green, orange, purple, red } from "./themePrimitives";

const colors = { primary: purple, secondary: gray, success: green, error: red, warning: orange, info: blue } as const;

export type ColorName = keyof typeof colors;
export const colorsName = Object.keys(colors) as ColorName[];

export const getColor = (name: ColorName) => {
    return colors[name] || purple;
}
