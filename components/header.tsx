import Link from "next/link"
import { Triangle, SearchIcon, Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"

export function Header() {
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
                <Link href="/" className="text-base font-medium py-2 px-4 rounded-md hover:bg-secondary">
                  top
                </Link>
                <Link
                  href="/newest"
                  className="text-base text-muted-foreground py-2 px-4 rounded-md hover:bg-secondary"
                >
                  new
                </Link>
                <Link href="/best" className="text-base text-muted-foreground py-2 px-4 rounded-md hover:bg-secondary">
                  best
                </Link>
                <Link href="/ask" className="text-base text-muted-foreground py-2 px-4 rounded-md hover:bg-secondary">
                  ask
                </Link>
                <Link href="/show" className="text-base text-muted-foreground py-2 px-4 rounded-md hover:bg-secondary">
                  show
                </Link>
                <Link href="/jobs" className="text-base text-muted-foreground py-2 px-4 rounded-md hover:bg-secondary">
                  jobs
                </Link>
                <Link
                  href="/search"
                  className="text-base text-muted-foreground py-2 px-4 rounded-md hover:bg-secondary"
                >
                  search
                </Link>
              </div>
            </SheetContent>
          </Sheet>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-4 text-sm font-medium">
            <Link href="/" className="transition-colors hover:text-primary">
              top
            </Link>
            <Link href="/newest" className="text-muted-foreground transition-colors hover:text-primary">
              new
            </Link>
            <Link href="/best" className="text-muted-foreground transition-colors hover:text-primary">
              best
            </Link>
            <Link href="/ask" className="text-muted-foreground transition-colors hover:text-primary">
              ask
            </Link>
            <Link href="/show" className="text-muted-foreground transition-colors hover:text-primary">
              show
            </Link>
            <Link href="/jobs" className="text-muted-foreground transition-colors hover:text-primary">
              jobs
            </Link>
          </nav>
        </div>
        <div className="flex flex-1 items-center justify-end">
          <Link
            href="/search"
            className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-primary"
          >
            <SearchIcon className="h-4 w-4" />
            <span className="hidden sm:inline">search</span>
          </Link>
        </div>
      </div>
    </header>
  )
}
