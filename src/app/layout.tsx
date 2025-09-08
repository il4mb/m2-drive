import Theme from "@/theme/Theme";
import "./globals.css";
import { SessionManager } from "@/components/context/SessionManager";
import { ActionsProvider } from "@/components/navigation/ActionsProvider";
import { Suspense } from "react";
import { Box, Stack } from "@mui/material";
import Pattern from '@/components/icon/Pattern';

export default function RootLayout({ children, }: Readonly<{ children: React.ReactNode; }>) {

    return (
        <html lang="en">
            <body>
                <Theme>
                    <Suspense fallback={"Loading..."}>
                        <SessionManager>
                            <ActionsProvider>
                                <Stack flex={1} overflow={"hidden"}>
                                    <Stack
                                        sx={{
                                            position: 'relative',
                                            zIndex: 2
                                        }}
                                        flex={1}
                                        direction={"row"}
                                        height={'100vh'}
                                        overflow={"hidden"}>
                                        {children}
                                    </Stack>
                                    <Box
                                        sx={{
                                            position: "fixed",
                                            top: 0,
                                            left: 0,
                                            width: '100vw',
                                            height: '100vh',
                                            zIndex: 1,
                                            pointerEvents: 'none',
                                            filter: 'blur(4px)'
                                        }}>
                                        <Pattern
                                            width={'100%'}
                                            height={'100%'}
                                            opacity={0.8} />
                                    </Box>
                                </Stack>
                            </ActionsProvider>
                        </SessionManager>
                    </Suspense>
                </Theme>
            </body>
        </html>
    );
}
