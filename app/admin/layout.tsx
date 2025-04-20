import { requireAdmin } from "@/lib/auth-utils";
import { Header } from "@/components/header";

export default async function AdminLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	// This will redirect to login if not authenticated or to home if not admin
	await requireAdmin();

	return (
		<div className="min-h-screen flex flex-col">
			<Header />
			<main className="flex-1 container py-6">{children}</main>
		</div>
	);
}
