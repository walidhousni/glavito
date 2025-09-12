import Link from "next/link";
import { Github, Twitter, Globe, Mail, Heart } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="border-t bg-white/70 dark:bg-gray-900/70 backdrop-blur">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid gap-8 md:grid-cols-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600" />
              <span className="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Glavito</span>
            </div>
            <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
              Multichannel ticketing and AI CRM to delight your customers.
            </p>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Product</h4>
            <ul className="mt-3 space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <li><Link href="#features">Features</Link></li>
              <li><Link href="#solutions">Solutions</Link></li>
              <li><Link href="#pricing">Pricing</Link></li>
              <li><Link href="#">Changelog</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Resources</h4>
            <ul className="mt-3 space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <li><Link href="#">Documentation</Link></li>
              <li><Link href="#">API</Link></li>
              <li><Link href="#">Guides</Link></li>
              <li><Link href="#">Support</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Company</h4>
            <ul className="mt-3 space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <li><Link href="#">About</Link></li>
              <li><Link href="#">Blog</Link></li>
              <li><Link href="#">Careers</Link></li>
              <li><Link href="#">Contact</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            © {new Date().getFullYear()} Glavito. Built with <Heart className="inline h-3 w-3 text-rose-500" />.
          </p>
          <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400">
            <Link href="#" aria-label="Website"><Globe className="h-4 w-4" /></Link>
            <Link href="#" aria-label="Email"><Mail className="h-4 w-4" /></Link>
            <Link href="#" aria-label="GitHub"><Github className="h-4 w-4" /></Link>
            <Link href="#" aria-label="Twitter"><Twitter className="h-4 w-4" /></Link>
          </div>
        </div>
      </div>
    </footer>
  );
}


