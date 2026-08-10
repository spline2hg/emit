import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { Logo } from './Logo';

const Navbar: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const navLinks = [
    { label: 'Dashboard', path: '/workspaces' },
    { label: 'Profile', path: '/profile' },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50">
      <div className="mx-auto max-w-7xl px-4 pt-2">
        <div className="flex h-11 items-center justify-between rounded-xl border border-border/50 px-4 sm:px-6">
          {/* Logo — always goes to landing */}
          <Logo onClick={() => navigate('/')} />

          {/* Desktop Nav */}
          <div className="hidden items-center gap-6 md:flex">
            {navLinks.map((link) => {
              const active =
                location.pathname === link.path ||
                (link.path === '/workspaces' && location.pathname.startsWith('/workspaces/'));
              return (
                <button
                  key={link.path}
                  onClick={() => navigate(link.path)}
                  className={`text-[13px] font-medium tracking-[0.008em] transition-colors ${
                    active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {link.label}
                </button>
              );
            })}
          </div>

          {/* Mobile toggle */}
          <div className="md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="mx-4 mt-2 flex flex-col gap-2 rounded-xl border border-border bg-background/80 p-4 backdrop-blur md:hidden">
          {navLinks.map((link) => (
            <button
              key={link.path}
              onClick={() => {
                navigate(link.path);
                setMobileMenuOpen(false);
              }}
              className="rounded-lg px-3 py-2 text-left text-[14px] font-medium text-muted-foreground transition-all hover:bg-accent hover:text-foreground"
            >
              {link.label}
            </button>
          ))}
        </div>
      )}
    </nav>
  );
};

export default Navbar;