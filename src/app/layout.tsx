import Theme from "@/theme/Theme";
import "./globals.css";
import { SessionManager } from "@/components/context/SessionManager";
import { ActionsProvider } from "@/components/navigation/ActionsProvider";

export default function RootLayout({ children, }: Readonly<{ children: React.ReactNode; }>) {

    return (
        <html lang="en">
            <body>
                <Theme>
                    <SessionManager>
                        <ActionsProvider>
                            {children}
                        </ActionsProvider>
                    </SessionManager>
                </Theme>
            </body>
        </html>
    );
}
