import Link from "next/link";

export function GalaxyFooter() {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="mt-auto border-t border-white/10 bg-black/30 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Links Row */}
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 mb-4">
          <Link href="/about" className="text-white/60 hover:text-white text-sm transition-colors">
            About
          </Link>
          <Link href="/faq" className="text-white/60 hover:text-white text-sm transition-colors">
            FAQ
          </Link>
          <Link href="/privacy" className="text-white/60 hover:text-white text-sm transition-colors">
            Privacy Policy
          </Link>
          <Link href="/contact" className="text-white/60 hover:text-white text-sm transition-colors">
            Contact & Support
          </Link>
        </div>
        
        {/* Divider */}
        <div className="border-t border-white/5 pt-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-2 text-center">
            {/* Copyright */}
            <p className="text-white/40 text-xs">
              © {currentYear} SpEdGalexii. All rights reserved.
            </p>
            
            {/* Tagline */}
            <p className="text-white/40 text-xs">
              Built with 💜 by Educators, for Educators
            </p>
            
            {/* FERPA Notice */}
            <p className="text-white/40 text-xs">
              🔒 FERPA Compliant • Student Data Protected
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
