import Theme from "@/theme/Theme";
import "./globals.css";
import { SessionManager } from "@/components/context/SessionManager";
import { ActionsProvider } from "@/components/navigation/ActionsProvider";
import { Suspense } from "react";

export default function RootLayout({ children, }: Readonly<{ children: React.ReactNode; }>) {

    return (
        <html lang="en">
            <body>
                <Theme>
                    <Suspense fallback={"Loading..."}>
                        <SessionManager>
                            <ActionsProvider>
                                {children}
                            </ActionsProvider>
                        </SessionManager>
                    </Suspense>
                </Theme>
            </body>
        </html>
    );
}
