import Nav from "@/components/nav";

export const dynamic = 'force-dynamic'

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Nav />
      <main className="pb-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto" style={{ paddingTop: 'calc(5rem + env(safe-area-inset-top, 0px))' }}>
        {children}
      </main>
    </>
  );
}
