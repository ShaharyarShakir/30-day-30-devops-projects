import { Navbar } from "./Navbar";

type Props = {
  children: React.ReactNode;
};

export function AppLayout({ children }: Props) {
  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 flex flex-col font-sans">
      <Navbar />
      <main className="flex-1 mx-auto w-full max-w-7xl px-6 py-8">
        {children}
      </main>
    </div>
  );
}
