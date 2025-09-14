'use client'
import { Theme, Components, alpha } from '@mui/material/styles';
import { gray, shape } from '../themePrimitives';
import { colorsName, getColor } from '../colors';

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
	},
	MuiAlert: {
		styleOverrides: {

			root: ({ theme }) => {

				return {
					fontWeight: 500,
					transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
					backdropFilter: 'blur(10px)',
					position: 'relative',
					"& .MuiAlertTitle-root": {
						fontWeight: 600,
						fontSize: 18,
						marginTop: -4
					},
					"& .MuiAlert-message": {
						width: '100%',
						display: 'flex',
						flexDirection: 'column',
						justifyContent: 'flex-start',
						alignItems: 'flex-start'
					},

					...theme.applyStyles('dark', {
						backdropFilter: 'blur(12px)',
					}),

					variants: [
						...['standard', 'filled', 'outlined'].flatMap((variant) =>
							colorsName.map((name) => {
								const color = getColor(name);

								return {
									props: {
										variant,
										severity: name
									},
									style: {
										'& .MuiAlert-icon': {
											fontSize: '1.25rem',
											color: color[600],
										},
										color: color[600],
										backgroundColor: `${alpha(color[300], 0.7)}`,
										boxShadow: `0px 0px 1px ${alpha(color[800], 0.5)}`,
										'&:hover': {
											backgroundColor: `${alpha(color[300], 0.7)}`,
											transform: 'translateY(-1px)',
											boxShadow: `0px 0px 1px ${alpha(color[800], 0.5)}, 0px 4px 2px 1px ${alpha(color[800], 0.05)}`,
										},
										'&:active': {
											transform: 'translateY(0)',
										},


										...(variant == "outlined" && {
											border: '1px solid',
											borderColor: color[600],
											background: 'none',
											'&:hover': {
												backgroundColor: `${alpha(color[400], 0.1)}`,
											},

										}),

										// // Dark mode adjustments
										...theme.applyStyles('dark', {
											// Text variant - dark
											color: color[200],
											backgroundColor: `${alpha(color[600], 0.8)}`,
											boxShadow: `0px 0px 1px ${alpha(color[800], 0.5)}`,
											'&:hover': {
												backgroundColor: `${alpha(color[600], 0.8)}`,
												transform: 'translateY(-1px)',
												boxShadow: `0px 0px 1px ${alpha(color[800], 0.5)}, 0px 4px 2px 1px ${alpha(color[800], 0.05)}`,
											},
											"& .MuiAlert-icon": {
												color: color[200],
											},

											...(variant == "outlined" && {
												color: color[400],
												borderColor: color[400],
												background: 'none',
												'&:hover': {
													backgroundColor: `${alpha(color[400], 0.1)}`,
												},
												'& .MuiAlert-icon': {
													color: color[400],
												},
											}),

										}),
									}
								};
							})
						),

						// Disabled state
						{
							props: {
								disabled: true,
							},
							style: {
								opacity: 0.6,
								pointerEvents: 'none',
								filter: 'grayscale(0.5)',

								'&:hover': {
									transform: 'none',
								}
							}
						},

						// Dense variant (smaller padding)
						{
							props: {
								variant: 'dense',
							},
							style: {
								padding: theme.spacing(1),
								'& .MuiAlert-message': {
									padding: 0,
								}
							}
						}
					],
				};
			},
		}
	}
};



// Helper function to convert hex to rgb
function hexToRgb(hex: string): string {
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	return result ?
		`${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` :
		'0, 0, 0';
}

// Helper function to determine contrast text color
function getContrastText(background: string): string {
	// Simple contrast calculation - in a real implementation, 
	// you might want to use theme.palette.getContrastText()
	const rgb = hexToRgb(background).split(',').map(val => parseInt(val.trim()));
	const brightness = (rgb[0] * 299 + rgb[1] * 587 + rgb[2] * 114) / 1000;
	return brightness > 128 ? '#000000' : '#ffffff';
}