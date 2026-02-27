// components/Navbar.tsx
import Link from 'next/link';
import Image from 'next/image';

export default function Navbar() {
  return (
    <nav className="bg-[#0d1f3c] border-b border-[#1a3260] shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <Image
              src="/logo.png"
              alt="Canadian Calculators"
              width={65}
              height={65}
              className="object-contain"
            />
            <div className="flex flex-col leading-tight">
              <span className="text-white font-bold text-lg tracking-wide group-hover:text-red-400 transition-colors">
                Canadian Calculators
              </span>
              <span className="text-blue-300 text-xs font-medium tracking-widest uppercase">
                Financial Tools
              </span>
            </div>
          </Link>

          {/* Right side nav links */}
          <div className="flex items-center gap-6">
            <Link
              href="/tax-deadlines-2025"
              className="hidden sm:inline-flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-3 py-1.5 rounded-full transition-colors"
            >
              <span>📅</span> Tax Deadlines 2025
            </Link>
            <Link
              href="/"
              className="text-blue-200 hover:text-white text-sm font-medium transition-colors"
            >
              All Calculators
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
