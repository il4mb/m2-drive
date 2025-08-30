import Theme from "@/theme/Theme";
import "./globals.css";

export default function RootLayout({ children, }: Readonly<{ children: React.ReactNode; }>) {

    return (
        <html lang="en">
            <body>
                <Theme>
                    {children}
                </Theme>
            </body>
        </html>
    );
}
