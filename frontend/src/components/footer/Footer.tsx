import React from 'react';
import { Logo } from '../ui/logo';

export function Footer() {
  return (
    <footer className="bg-transparent px-8 z-10">
        <div className="border-t border-white/10 py-6 flex flex-col md:flex-row justify-between items-center">
          <p className="text-muted-foreground text-sm">
            © {new Date().getFullYear()} StuddyBuddy. All rights reserved.
          </p>
          <div className="mt-4 md:mt-0 flex gap-6">
            <a href="#" className="text-xs text-muted-foreground hover:text-white">Privacy Policy</a>
            <a href="#" className="text-xs text-muted-foreground hover:text-white">Terms of Service</a>
            <a href="#" className="text-xs text-muted-foreground hover:text-white">Cookie Policy</a>
          </div>
        </div>
    </footer>
  );
}
