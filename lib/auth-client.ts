"use client";

import { signIn, signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function useAuth() {
	const { data: session, status } = useSession();
	const user = session?.user;
	const isAuthenticated = !!user;
	const isAdmin = user?.role === "admin";

	return {
		user,
		isAuthenticated,
		isAdmin,
		status,
	};
}

export function useLogin() {
	const router = useRouter();
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	async function login(email: string, password: string) {
		try {
			setIsLoading(true);
			setError(null);

			const result = await signIn("credentials", {
				redirect: false,
				email,
				password,
			});

			if (result?.error) {
				setError("Invalid email or password");
				return false;
			}

			router.push("/admin/newsletter");
			router.refresh();
			return true;
		} catch (e) {
			setError("An unexpected error occurred");
			return false;
		} finally {
			setIsLoading(false);
		}
	}

	return {
		login,
		isLoading,
		error,
	};
}

export function useLogout() {
	const router = useRouter();

	async function logout() {
		await signOut({ redirect: false });
		router.push("/");
		router.refresh();
	}

	return { logout };
}
