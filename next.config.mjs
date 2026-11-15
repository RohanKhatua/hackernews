/** @type {import('next').NextConfig} */
const nextConfig = {
	// Prisma's generated client must go through OpenNext's workerd patching
	// (opennext.js.org/cloudflare/howtos/db).
	serverExternalPackages: ["@prisma/client", ".prisma/client"],
	images: {
		unoptimized: true,
	},
};

export default nextConfig;
