"use client"
import * as React from "react";
import { alpha, Theme, Components } from "@mui/material/styles";
import { toggleButtonGroupClasses } from "@mui/material/ToggleButtonGroup";
import { toggleButtonClasses } from "@mui/material/ToggleButton";
// import CheckBoxOutlineBlankRoundedIcon from "@mui/icons-material/CheckBoxOutlineBlankRounded";
// import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
// import RemoveRoundedIcon from "@mui/icons-material/RemoveRounded";
import { gray, green, orange, purple, red } from "../themePrimitives";
import { blue } from "@mui/material/colors";
import { Circle, CircleCheck, CircleX, Square, SquareCheck } from "lucide-react";

const colors = { primary: purple, secondary: gray, success: green, error: red, warning: orange, info: blue } as const;
type ColorName = keyof typeof colors;
const colorsName = Object.keys(colors) as ColorName[];

const getColor = (name: ColorName) => {
    return colors[name] || purple;
}

export const inputsCustomizations: Components<Theme> = {
    MuiButtonBase: {
        defaultProps: {
            disableTouchRipple: true,
            disableRipple: true
        },
        styleOverrides: {
            root: ({ theme }) => ({
                boxSizing: "border-box",
                transition: "all 100ms ease-in",
                borderRadius: theme.shape.borderRadius,
                "&:focus-visible": {
                    outline: `3px solid ${alpha(theme.palette.primary.main, 0.5)}`,
                    outlineOffset: "2px",
                }
            }),
        },
    },

    MuiButton: {
        styleOverrides: {
            root: ({ theme }) => ({
                boxShadow: "none",
                textTransform: "none",
                borderRadius: 14,
                transition: 'all 0.2s ease-out',
                variants: [
                    ...['text', 'outlined', 'contained'].flatMap((variant) => colorsName.map((name) => {
                        const color = getColor(name);
                        return {
                            props: {
                                variant,
                                color: name
                            },
                            style: {

                                // text
                                color: color[500],

                                // contained
                                ...(variant == "contained" && {
                                    transition: 'all 0.2s ease-out',
                                    color: ["error", "primary"].includes(name) ? "#fff" : color[900],
                                    background: color[400],
                                    backgroundSize: '100%',
                                    backgroundPosition: '0% 0%',
                                    "&:hover": {
                                        color: '#fff',
                                        background: color[500],
                                    },
                                    "&:active": {
                                        backgroundSize: '200%',
                                        backgroundPosition: '100% 0%',
                                    }
                                }),


                                // outlined
                                ...(variant == "outlined" && {
                                    borderColor: color[500],
                                    background: `${color[50]}`,
                                    "&:hover": {
                                        color: color[50],
                                        background: color[500],
                                    }
                                }),


                                ...theme.applyStyles('dark', {

                                    // text - dark
                                    color: color[300],


                                    // contained - dark
                                    ...(variant == "contained" && {
                                        transition: 'all 0.2s ease-out',
                                        color: color[100],
                                        backgroundSize: '100%',
                                        backgroundPosition: '0% 0%',
                                        "&:hover": {
                                            color: '#fff',
                                            backgroundSize: '200%',
                                            backgroundPosition: '0% 0%',
                                        },
                                        "&:active": {
                                            backgroundSize: '200%',
                                            backgroundPosition: '100% 0%',
                                        }
                                    }),



                                    // outlined - dark
                                    ...(variant == "outlined" && {

                                        borderColor: color[500],
                                        background: alpha(color[300], 0.1),
                                        "&:hover": {
                                            color: color[50],
                                            background: color[500],
                                        }
                                    }),
                                }),

                            }
                        }
                    })
                    ),
                    {
                        props: {
                            disabled: true,
                        },
                        style: {
                            opacity: 0.5
                        }
                    }
                ],
            }),
        },
    },
    MuiListItemButton: {
        styleOverrides: {
            root: ({ theme }) => ({
                "&.Mui-selected": {
                    background: `linear-gradient(135deg, ${purple[500]} 0%, ${purple[300]} 80%)`,
                }
            })
        }
    },
    MuiIconButton: {
        styleOverrides: {
            root: ({ theme }) => ({
                boxShadow: "none",
                borderRadius: theme.shape.borderRadius,
                textTransform: "none",
                fontWeight: theme.typography.fontWeightMedium,
                letterSpacing: 0,
                border: "1px solid ",
                borderColor: '#6662',
                minWidth: 0,
                padding: 0,
                width: '2rem',
                height: '2rem',
                transition: 'all 0.2s ease-out',
                "& svg": { fontSize: "1rem" },
                variants: [
                    {
                        props: {
                            size: "small",
                        },
                        style: {
                            width: "1.55rem",
                            height: "1.55rem",
                            padding: "0.25rem",
                        },
                    },
                    {
                        props: {
                            size: "large",
                        },
                        style: {
                            width: "2.5rem",
                            height: "2.5rem",
                        },
                    },
                    ...colorsName.map((name) => {
                        const colors = getColor(name);
                        const color = colors[["error", "primary"].includes(name) ? 300 : 400];

                        return {
                            props: {
                                color: name
                            },
                            style: {
                                background: alpha(color, 0.05),
                                color: color,
                                fill: color,
                                border: '1px solid',
                                borderColor: alpha(color, 0.4),
                                "&:hover": {
                                    background: alpha(color, 0.5),
                                }
                            }
                        }
                    })
                ],
            }),
        },
    },
    MuiToggleButtonGroup: {
        styleOverrides: {
            root: ({ theme }) => ({
                borderRadius: "10px",
                boxShadow: `0 4px 16px ${alpha(gray[400], 0.2)}`,
                [`& .${toggleButtonGroupClasses.selected}`]: {
                    color: purple[500],
                },
                ...theme.applyStyles("dark", {
                    [`& .${toggleButtonGroupClasses.selected}`]: {
                        color: "#fff",
                    },
                    boxShadow: `0 4px 16px ${alpha(purple[700], 0.5)}`,
                }),
            }),
        },
    },
    MuiToggleButton: {
        styleOverrides: {
            root: ({ theme }) => ({
                padding: "12px 16px",
                textTransform: "none",
                borderRadius: "10px",
                fontWeight: 500,
                ...theme.applyStyles("dark", {
                    color: gray[400],
                    boxShadow: "0 4px 16px rgba(0, 0, 0, 0.5)",
                    [`&.${toggleButtonClasses.selected}`]: {
                        color: purple[300],
                    },
                }),
            }),
        },
    },
    MuiCheckbox: {
        defaultProps: {
            disableRipple: true,
            icon: (
                <Square
                    size={22}
                    style={{
                        position: "absolute",
                    }}
                />
            ),
            checkedIcon: (
                <SquareCheck
                    size={22}
                    style={{
                        position: "absolute",
                    }}
                />
            ),
            // indeterminateIcon: <CircleX />,
        },
        styleOverrides: {
            root: ({ theme }) => ({
                margin: 10,
                height: 16,
                width: 16,
                borderRadius: 2,
                border: "none",
                backgroundColor: alpha(gray[100], 0.4),
                transition: "border-color, background-color, 120ms ease-in",

                "&.Mui-focusVisible": {
                    outline: `3px solid ${alpha(purple[500], 0.5)}`,
                    outlineOffset: "2px",
                },
                "&.Mui-checked": {
                    boxShadow: `none`,
                    backgroundColor: purple[100],
                    "&:hover": {
                        backgroundColor: purple[100],
                    },
                },
                ...theme.applyStyles("dark", {
                    backgroundColor: alpha(gray[900], 0.8),
                    "&.Mui-focusVisible": {
                        outline: `3px solid ${alpha(purple[500], 0.5)}`,
                        outlineOffset: "2px",
                    },
                    "&.Mui-checked": {
                        boxShadow: `none`,
                        backgroundColor: purple[800],
                        "&:hover": {
                            backgroundColor: purple[800],
                        },
                    },
                }),
                variants: [
                    ...colorsName.map((name) => {
                        const colors = getColor(name);
                        const color = colors[["error", "primary"].includes(name) ? 300 : 400];

                        return {
                            props: {
                                color: name
                            },
                            style: {
                                backgroundColor: alpha(color, 0.05),
                                color: color,
                                fill: color,
                                border: '1px solid',
                                borderColor: alpha(color, 0.4),
                                "&:hover": {
                                    backgroundColor: alpha(color, 0.5),
                                },
                                "&.Mui-checked": {
                                    boxShadow: `none`,
                                    backgroundColor: alpha(color, 0.05),
                                    "&:hover": {
                                        backgroundColor: alpha(color, 0.5),
                                    },
                                },
                                "&.Mui-focusVisible": {
                                    outline: `3px solid ${alpha(color, 0.5)}`,
                                    outlineOffset: "2px",
                                },
                            }
                        }
                    })
                ]
            }),
        },
    },

    MuiFormControl: {
        styleOverrides: {
            root: ({ theme }) => ({
                "& .MuiFormLabel-root": {
                    top: "50%",
                    transform: "translate(14px, -50%)",
                    transition: 'all 0.2s ease'
                },
                "&:has(.Mui-focused), &:has(.MuiFormLabel-filled)": {
                    "& .MuiFormLabel-root": {
                        top: 0,
                        transform: "translate(14px, -50%) scale(0.758)",
                        ...theme.applyStyles("dark", {
                            color: "white"
                        })
                    }
                }
            })
        }
    },
    MuiInputBase: {
        styleOverrides: {
            root: {
                border: "none",
            },
            input: ({ theme }) => ({
                color: "#000",
                "&::placeholder": {
                    opacity: 0.7,
                },
                ...theme.applyStyles("dark", {
                    color: "#fff",
                    "&::placeholder": {
                        opacity: 0.6,
                        color: "white",
                    },
                }),
            }),
        },
    },
    MuiOutlinedInput: {
        styleOverrides: {
            input: {
                padding: 0,
            },
            root: ({ theme, ownerState }) => {

                const { multiline, size } = ownerState;

                return {
                    padding: "8px 12px",
                    color: theme.palette.text.primary,
                    borderRadius: theme.shape.borderRadius,
                    transition: "border 120ms ease-in",
                    "&:hover .MuiOutlinedInput-notchedOutline": {
                        borderColor: blue[800],
                    },
                    "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                        borderColor: blue[800],
                    },
                    ...(multiline && {
                        textAlign: 'left',
                        verticalAlign: 'top'
                    }),
                    ...theme.applyStyles("dark", {
                        "&:hover .MuiOutlinedInput-notchedOutline": {
                            borderColor: blue[400],
                        },
                        "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                            borderColor: blue[400],
                            color: "white"
                        },
                    }),
                    variants: [
                        {
                            props: {
                                size: "small",
                            },
                            style: {
                                height: multiline ? "unset" : "2rem",
                            },
                        },
                        {
                            props: {
                                size: "medium",
                            },
                            style: {
                                height: multiline ? "unset" : "2.5rem",
                            },
                        },
                    ],
                }
            },
            notchedOutline: ({ theme }) => ({
                border: `1px solid`,
                transition: "border 120ms ease-in",
                borderColor: gray[500],
                ...theme.applyStyles("dark", {
                    borderColor: gray[400],
                }),
            }),
        },
    },

    MuiInputAdornment: {
        styleOverrides: {
            root: ({ theme }) => ({
                color: theme.palette.grey[500],
                ...theme.applyStyles("dark", {
                    color: theme.palette.grey[400],
                }),
            }),
        },
    },

    MuiFormLabel: {
        styleOverrides: {
            root: ({ theme }) => ({
                typography: theme.typography.caption,
                transform: "translate(14px, 0px)",
                transition: "color 120ms ease-in",
                color: theme.palette.text.secondary,
                "&.Mui-focused": {
                    color: gray[800],
                },
            }),
        },
    },

    MuiSelect: {
        styleOverrides: {
            root: ({ theme }) => ({
                borderRadius: theme.shape.borderRadius,
                border: `0px solid`,
                transition: "border 120ms ease-in",
                "&:hover": {
                    borderColor: gray[800],
                    "& .MuiOutlinedInput-notchedOutline": {
                        borderColor: gray[800],
                    }
                },
                variants: [
                    {
                        props: {
                            size: "small",
                        },
                        style: {
                            height: "2.25rem",
                        },
                    },
                ],


            })
        }
    }
};