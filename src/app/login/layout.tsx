import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Login | Quiosque8",
  description: "Acesse a plataforma Quiosque8",
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
