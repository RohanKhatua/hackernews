"use client"

import Link from "next/link"
import { Triangle, SearchIcon, Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { usePathname } from "next/navigation"

export function Header() {
  const pathname = usePathname()
  
  // Helper function to determine if link is active
  const isActive = (path: string) => {
    if (path === '/' && pathname === '/') return true
    if (path !== '/' && pathname.startsWith(path)) return true
    return false
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 max-w-screen-2xl items-center px-4 md:px-6">
        <div className="flex items-center">
          <Link href="/" className="flex items-center space-x-2 mr-4">
            <Triangle className="h-6 w-6 text-primary" fill="currentColor" />
            <span className="font-bold text-primary">HN</span>
          </Link>

          {/* Mobile Navigation */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[240px] sm:w-[300px]">
              <div className="flex flex-col space-y-4 mt-6">
                <Link href="/" className={`text-base py-2 px-4 rounded-md hover:bg-secondary ${isActive('/') ? 'font-medium' : 'text-muted-foreground'}`}>
                  top
                </Link>
                <Link
                  href="/newest"
                  className={`text-base py-2 px-4 rounded-md hover:bg-secondary ${isActive('/newest') ? 'font-medium' : 'text-muted-foreground'}`}
                >
                  new
                </Link>
                <Link 
                  href="/best" 
                  className={`text-base py-2 px-4 rounded-md hover:bg-secondary ${isActive('/best') ? 'font-medium' : 'text-muted-foreground'}`}
                >
                  best
                </Link>
                <Link 
                  href="/ask" 
                  className={`text-base py-2 px-4 rounded-md hover:bg-secondary ${isActive('/ask') ? 'font-medium' : 'text-muted-foreground'}`}
                >
                  ask
                </Link>
                <Link 
                  href="/show" 
                  className={`text-base py-2 px-4 rounded-md hover:bg-secondary ${isActive('/show') ? 'font-medium' : 'text-muted-foreground'}`}
                >
                  show
                </Link>
                <Link 
                  href="/jobs" 
                  className={`text-base py-2 px-4 rounded-md hover:bg-secondary ${isActive('/jobs') ? 'font-medium' : 'text-muted-foreground'}`}
                >
                  jobs
                </Link>
                <Link
                  href="/search"
                  className={`text-base py-2 px-4 rounded-md hover:bg-secondary ${isActive('/search') ? 'font-medium' : 'text-muted-foreground'}`}
                >
                  search
                </Link>
              </div>
            </SheetContent>
          </Sheet>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-4 text-sm font-medium">
            <Link href="/" className={`transition-colors hover:text-primary ${isActive('/') ? 'text-primary' : 'text-muted-foreground'}`}>
              top
            </Link>
            <Link href="/newest" className={`transition-colors hover:text-primary ${isActive('/newest') ? 'text-primary' : 'text-muted-foreground'}`}>
              new
            </Link>
            <Link href="/best" className={`transition-colors hover:text-primary ${isActive('/best') ? 'text-primary' : 'text-muted-foreground'}`}>
              best
            </Link>
            <Link href="/ask" className={`transition-colors hover:text-primary ${isActive('/ask') ? 'text-primary' : 'text-muted-foreground'}`}>
              ask
            </Link>
            <Link href="/show" className={`transition-colors hover:text-primary ${isActive('/show') ? 'text-primary' : 'text-muted-foreground'}`}>
              show
            </Link>
            <Link href="/jobs" className={`transition-colors hover:text-primary ${isActive('/jobs') ? 'text-primary' : 'text-muted-foreground'}`}>
              jobs
            </Link>
          </nav>
        </div>
        <div className="flex flex-1 items-center justify-end">
          <Link
            href="/search"
            className={`flex items-center gap-1 text-sm transition-colors hover:text-primary ${isActive('/search') ? 'text-primary' : 'text-muted-foreground'}`}
          >
            <SearchIcon className="h-4 w-4" />
            <span className="hidden sm:inline">search</span>
          </Link>
        </div>
      </div>
    </header>
  )
}
