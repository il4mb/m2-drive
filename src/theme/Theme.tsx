'use client';

import { useEffect, useMemo, useState, ReactNode } from 'react';
import { ThemeProvider, createTheme, useColorScheme } from '@mui/material/styles';
import type { ThemeOptions } from '@mui/material/styles';
import { inputsCustomizations } from './customizations/inputs';
import { dataDisplayCustomizations } from './customizations/dataDisplay';
import { feedbackCustomizations } from './customizations/feedback';
import { navigationCustomizations } from './customizations/navigation';
import { surfacesCustomizations } from './customizations/surfaces';
import { colorSchemes, typography, shadows, shape } from './themePrimitives';
import "./theme.scss";


interface Props {
	children: ReactNode;
	disableCustomTheme?: boolean;
	themeComponents?: ThemeOptions['components'];
}

export default function Theme({ children, disableCustomTheme, themeComponents }: Props) {
	const [mode, setMode] = useState<'light' | 'dark'>('light');

	const theme = useMemo(() => {	
		if (disableCustomTheme) return {};

		const palette = colorSchemes[mode]?.palette ?? colorSchemes.light.palette;

		return createTheme({
			palette,
			cssVariables: {
				colorSchemeSelector: 'data-color-scheme',
				cssVarPrefix: 'template',
			},
			colorSchemes,
			typography,
			shadows,
			shape,
			components: {
				...inputsCustomizations,
				...dataDisplayCustomizations,
				...feedbackCustomizations,
				...navigationCustomizations,
				...surfacesCustomizations,
				...themeComponents,
			},
		});
	}, [disableCustomTheme, themeComponents, mode]);

	if (disableCustomTheme) return <>{children}</>;

	return (
		<ThemeProvider theme={theme} disableTransitionOnChange>
			<ThemeClient onResolvedMode={setMode}>{children}</ThemeClient>
		</ThemeProvider>
	);
}

function ThemeClient({
	children,
	onResolvedMode,
}: {
	children: ReactNode;
	onResolvedMode: (mode: 'light' | 'dark') => void;
}) {
	const { mode, systemMode } = useColorScheme();
	const resolvedMode = (mode ?? systemMode ?? 'light') as 'light' | 'dark';

	useEffect(() => {
		onResolvedMode(resolvedMode);
	}, [resolvedMode]);

	return <>{children}</>;
}
