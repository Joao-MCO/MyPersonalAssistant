import "./globals.css";
import ChatSidebar from "@/components/ChatSidebar"
import { ThemeProvider } from "@/components/theme-provider"

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
              <ChatSidebar></ChatSidebar>
              {children}
            </div>
          </ThemeProvider>
        </body>
      </html>
    </>
  )
}
