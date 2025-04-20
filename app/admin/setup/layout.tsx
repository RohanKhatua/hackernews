import { Header } from "@/components/header";

// This layout overrides the parent admin layout for just the setup page
// to bypass authentication requirements for initial admin user creation
export default function AdminSetupLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<div className="min-h-screen flex flex-col">
			<Header />
			<main className="flex-1 container py-6">{children}</main>
		</div>
	);
}
