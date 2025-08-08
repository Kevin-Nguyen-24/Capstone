"use client";

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import BottomNav from './bottom-nav';
import { Toaster } from './ui/toaster';
import { Loader2 } from 'lucide-react';

interface AppLayoutProps {
  children: React.ReactNode;
  title: string;
}

export default function AppLayout({ children, title }: AppLayoutProps) {
  const router = useRouter();
  const [isClient, setIsClient] = React.useState(false);
  const [isLoggedIn, setIsLoggedIn] = React.useState(false);

  useEffect(() => {
    setIsClient(true);
    const userId = localStorage.getItem('userID');
    if (!userId) {
      router.replace('/');
    } else {
      setIsLoggedIn(true);
    }
  }, [router]);

  if (!isClient || !isLoggedIn) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background font-body text-foreground">
      <header className="sticky top-0 z-10 border-b bg-background/80 p-4 backdrop-blur-sm">
        <h1 className="text-center text-xl font-bold font-headline">{title}</h1>
      </header>
      <main className="pb-24">{children}</main>
      <BottomNav />
    </div>
  );
}
