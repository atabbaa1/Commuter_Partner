export const metadata = {
  title: "Commuter Partner",
  description: "An app which helps you make the most of your commute.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  )
}

// To learn how to link between pages
// Visit https://nextjs.org/docs/app/getting-started/layouts-and-pages#linking-between-pages