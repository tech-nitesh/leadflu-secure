import type {Metadata} from 'next';
import './globals.css';
import { BottomNav } from '@/components/navigation';
import { StoreHydrator } from '@/components/store-hydrator';
import { AuthProvider } from '@/components/auth-provider';

export const metadata: Metadata = {
  title: 'Lead Management Platform',
  description: 'Premium Lead Management Platform for Video Editors & Freelancers',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-zinc-50 dark:bg-zinc-950 text-zinc-950 dark:text-zinc-50 font-sans antialiased min-h-[100dvh] pb-safe selection:bg-blue-200 dark:selection:bg-blue-900" suppressHydrationWarning>
        <StoreHydrator />
        <AuthProvider />
        <div className="mx-auto max-w-md w-full min-h-[100dvh] relative bg-zinc-50/80 dark:bg-zinc-950/80 shadow-2xl shadow-zinc-200/20 dark:shadow-none overflow-x-hidden">
          {/* Subtle colorful background blobs for premium glassmorphism */}
          <div className="fixed top-0 left-0 right-0 max-w-md mx-auto w-full h-full overflow-hidden -z-10 pointer-events-none">
            <div className="absolute top-[-5%] left-[-10%] w-[50%] h-[30%] rounded-full bg-blue-500/20 dark:bg-blue-500/10 blur-[80px]" />
            <div className="absolute top-[30%] right-[-20%] w-[60%] h-[40%] rounded-full bg-indigo-500/15 dark:bg-indigo-500/10 blur-[100px]" />
            <div className="absolute bottom-[-10%] left-[10%] w-[70%] h-[40%] rounded-full bg-purple-500/20 dark:bg-purple-500/10 blur-[120px]" />
          </div>
          {children}
          <BottomNav />
        </div>
      </body>
    </html>
  );
}
