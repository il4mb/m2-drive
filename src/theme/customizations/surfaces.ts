"use client"
import { alpha, Theme, Components } from '@mui/material/styles';
import { gray } from '../themePrimitives';

export const surfacesCustomizations: Components<Theme> = {
    MuiAccordion: {
        defaultProps: {
            elevation: 0,
            disableGutters: true,
        },
        styleOverrides: {
            root: ({ theme }) => ({
                padding: 4,
                overflow: 'clip',
                backgroundColor: gray[50],
                border: `1px solid ${gray[300]}`,
                borderRadius: 0,
                '&:not(:last-of-type)': {
                    borderBottom: 'none',
                },
                '&:first-of-type': {
                    borderTopLeftRadius: 0,
                    borderTopRightRadius: 0,
                },
                '&:last-of-type': {
                    borderBottomLeftRadius: 0,
                    borderBottomRightRadius: 0,
                },
                ...theme.applyStyles('dark', {
                    backgroundColor: gray[800],
                })
            }),
        },
    },
    MuiAccordionSummary: {
        styleOverrides: {
            root: ({ theme }) => ({
                border: 'none',
                borderRadius: 0,
                '&:hover': { backgroundColor: gray[50] },
                '&:focus-visible': { backgroundColor: 'transparent' },
                ...theme.applyStyles('dark', {
                    backgroundColor: 'transparent',
                    '&:hover': { backgroundColor: gray[800] },
                }),
            }),
        },
    },
    MuiAccordionDetails: {
        styleOverrides: {
            root: { mb: 20, border: 'none' },
        },
    },
    MuiPaper: {
        defaultProps: {
            elevation: 0,
        },
        styleOverrides: {
            root: {
                backdropFilter: 'blur(10px)'
            }
        }
    },
    MuiCard: {
        styleOverrides: {
            root: ({ theme }) => {
                return {
                    padding: 0,
                    transition: 'all 100ms ease',
                    backgroundColor: alpha(gray[50], 0.2),
                    borderRadius: 8,
                    boxShadow: `0px 0px 1px ${alpha(gray[400], 1)}, 1px 4px 4px ${alpha(gray[400], 0.5)}`,
                    ...theme.applyStyles('dark', {
                        backgroundColor: alpha(gray[800], 0.2),
                        boxShadow: `0px 0px 1px 1px ${alpha(gray[800], 1)}, 1px 4px 4px ${alpha(gray[800], 0.5)}`,
                    }),
                    variants: [
                        {
                            props: {
                                variant: 'outlined',
                            },
                            style: {
                                border: `1px solid ${gray[600]}`,
                                boxShadow: 'none',
                                // background: 'hsl(0, 0%, 100%)',
                                backgroundColor: 'transparent',
                                ...theme.applyStyles('dark', {
                                    background: alpha(gray[900], 0.4),
                                }),
                            },
                        },
                    ],
                };
            },
        },
    },
    MuiCardContent: {
        styleOverrides: {
            root: {
                padding: 16,
                '&:last-child': { paddingBottom: 20 },
            },
        },
    },
    MuiCardHeader: {
        styleOverrides: {
            root: {
                padding: 0,
            },
        },
    },
    MuiCardActions: {
        styleOverrides: {
            root: {
                padding: 0,
            },
        },
    },
};
