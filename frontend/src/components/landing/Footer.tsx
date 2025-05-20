
import React from 'react';
import { Logo } from '../ui/logo';

export function Footer() {
  return (
    <footer className="bg-study-darker py-12 border-t border-white/10">
      <div className="container px-4 mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          <div className="md:col-span-2">
            <Logo className="mb-4" />
            <p className="text-muted-foreground mb-4 max-w-md">
              StuddyBuddy is your AI-powered study assistant that helps you learn faster, understand better,
              and retain knowledge longer.
            </p>
            <div className="flex gap-4">
              {['Twitter', 'Instagram', 'LinkedIn', 'Discord'].map((social) => (
                <a 
                  key={social} 
                  href="#" 
                  className="text-muted-foreground hover:text-white transition-colors"
                >
                  {social}
                </a>
              ))}
            </div>
          </div>
          
          {[
            {
              title: 'Product',
              links: ['Features', 'How it Works', 'Pricing', 'FAQ']
            },
            {
              title: 'Resources',
              links: ['Blog', 'Support', 'Documentation', 'API']
            },
            {
              title: 'Company',
              links: ['About Us', 'Careers', 'Privacy Policy', 'Terms of Service']
            }
          ].map((column, index) => (
            <div key={index}>
              <h3 className="font-semibold mb-4">{column.title}</h3>
              <ul className="space-y-3">
                {column.links.map((link) => (
                  <li key={link}>
                    <a href="#" className="text-muted-foreground hover:text-white transition-colors">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        
        <div className="border-t border-white/10 mt-12 pt-6 flex flex-col md:flex-row justify-between items-center">
          <p className="text-muted-foreground text-sm">
            © {new Date().getFullYear()} StuddyBuddy. All rights reserved.
          </p>
          <div className="mt-4 md:mt-0 flex gap-6">
            <a href="#" className="text-xs text-muted-foreground hover:text-white">Privacy Policy</a>
            <a href="#" className="text-xs text-muted-foreground hover:text-white">Terms of Service</a>
            <a href="#" className="text-xs text-muted-foreground hover:text-white">Cookie Policy</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
