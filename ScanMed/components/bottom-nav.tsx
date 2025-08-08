"use client";

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { BookUser, Camera, ScanLine, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/diary', label: 'My Diary', icon: BookUser },
  { href: '/capture', label: 'Intake', icon: Camera },
  { href: '/scan', label: 'Prescription', icon: ScanLine },
];

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = () => {
    localStorage.removeItem('userID');
    router.push('/');
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-20 border-t bg-background/95 backdrop-blur-sm">
      <div className="mx-auto grid max-w-md grid-cols-4 items-center justify-around">
        {navItems.map((item) => (
          <Link href={item.href} key={item.href} className={cn(
            "flex flex-1 flex-col items-center gap-1 py-2 text-sm transition-colors duration-200",
            pathname === item.href ? 'text-primary' : 'text-muted-foreground hover:text-primary'
          )}>
            <item.icon className="h-6 w-6" />
            <span className="text-xs font-medium">{item.label}</span>
          </Link>
        ))}
        <button onClick={handleLogout} className="flex flex-1 flex-col items-center gap-1 py-2 text-sm text-muted-foreground transition-colors duration-200 hover:text-primary">
           <LogOut className="h-6 w-6" />
           <span className="text-xs font-medium">Logout</span>
        </button>
      </div>
    </nav>
  );
}
