import { Link } from 'react-router-dom'

const currentYear = new Date().getFullYear()
const appName = "DAD'S BOOKSHELVES (DBS)"

export function Footer() {
  return (
    <footer className="footer bg-base-200 text-base-content px-8 py-12">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-8 w-full">
        <div className="flex flex-col gap-2">
          <span className="footer-title text-base-content/80 font-semibold mb-2">Services</span>
          <Link to="/dbslibrary" className="link link-hover text-sm">Library</Link>
          <Link to="/ebook" className="link link-hover text-sm">eBook Conversion</Link>
          <Link to="/marketers" className="link link-hover text-sm">Marketer Program</Link>
          <Link to="/books/shop" className="link link-hover text-sm">BookShop</Link>
        </div>
        <div className="flex flex-col gap-2">
          <span className="footer-title text-base-content/80 font-semibold mb-2">Company</span>
          <Link to="/aboutus" className="link link-hover text-sm">About Us</Link>
          <Link to="/help" className="link link-hover text-sm">Contact</Link>
          <Link to="/careers" className="link link-hover text-sm">Careers</Link>
        </div>
        <div className="flex flex-col gap-2">
          <span className="footer-title text-base-content/80 font-semibold mb-2">Legal</span>
          <Link to="/terms" className="link link-hover text-sm">Terms of Service</Link>
          <Link to="/privacy" className="link link-hover text-sm">Privacy Policy</Link>
          <Link to="/cookies" className="link link-hover text-sm">Cookie Policy</Link>
        </div>
        <div className="flex flex-col gap-2">
          <span className="footer-title text-base-content/80 font-semibold mb-2">Connect</span>
          <div className="flex gap-3">
            <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="btn btn-circle btn-ghost btn-sm">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
            </a>
            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="btn btn-circle btn-ghost btn-sm">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073z"/></svg>
            </a>
          </div>
        </div>
      </div>
      <div className="divider my-4 col-span-2"></div>
      <div className="w-full text-center">
        <p className="text-sm opacity-60">
          © {currentYear} {appName}. All rights reserved.
        </p>
      </div>
    </footer>
  )
}