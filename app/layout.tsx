import "./globals.css";
import ChatSidebar from "@/components/ChatSidebar"
import { ThemeProvider } from "@/components/theme-provider"
import Home from "./page";
import { AuthProvider } from "@/components/Auth";

export default function RootLayout({ children }: Readonly<{children: React.ReactNode}>) {
  return (
    <>
      <html lang="en" suppressHydrationWarning>
        <head />
        <body>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem
            disableTransitionOnChange
          >
            <div className="min-h-screen flex">
                <AuthProvider>
                    <ChatSidebar />
                    {children}
                </AuthProvider>
            </div>
          </ThemeProvider>
        </body>
      </html>
    </>
  )
}
