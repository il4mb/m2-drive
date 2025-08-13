'use client'
import { Theme, Components } from '@mui/material/styles';
import { gray } from '../themePrimitives';

/* eslint-disable import/prefer-default-export */
export const feedbackCustomizations: Components<Theme> = {
	MuiDialog: {
		styleOverrides: {
			root: ({ theme }) => ({
				'& .MuiDialog-paper': {
					borderRadius: '10px',
					border: '1px solid',
					// @ts-ignore
					borderColor: (theme.vars || theme).palette.divider,
				},
			}),
		},
	},
	MuiLinearProgress: {
		styleOverrides: {
			root: ({ theme }) => ({
				height: 8,
				borderRadius: 8,
				backgroundColor: gray[200],
				...theme.applyStyles('dark', {
					backgroundColor: gray[800],
				}),
			}),
		},
	},
	MuiSkeleton: {
		styleOverrides: {
			root: ({ theme }) => ({
				cursor: 'wait',
				background: '#0001',
				...theme.applyStyles('dark', {
					background: '#fff1',
				}),
			})
		}
	}
};
