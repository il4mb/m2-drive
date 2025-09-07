import Theme from "@/theme/Theme";
import "./globals.css";
import { SessionManager } from "@/components/context/SessionManager";

export default function RootLayout({ children, }: Readonly<{ children: React.ReactNode; }>) {

    return (
        <html lang="en">
            <body>
                <Theme>
                    <SessionManager>
                        {children}
                    </SessionManager>
                </Theme>
            </body>
        </html>
    );
}
