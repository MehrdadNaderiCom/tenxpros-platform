"use client";

import type { ButtonHTMLAttributes, AnchorHTMLAttributes, ReactNode } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const variants = {
  primary: "bg-navy-900 text-white hover:bg-navy-700",
  secondary: "border border-navy-900 bg-white text-navy-900 hover:bg-navy-50",
  ghost: "text-navy-900 hover:bg-navy-50",
  danger: "bg-red-600 text-white hover:bg-red-700",
};

const sizes = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-5 text-sm",
  lg: "h-12 px-6 text-base",
};

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
};

/**
 * Shared button with built-in action feedback: a tactile press effect, and —
 * for submit buttons inside a form action — an automatic spinner + disabled
 * state while the action runs (via useFormStatus, no call-site changes needed).
 */
export function Button({ className, variant = "primary", size = "md", children, disabled, ...props }: ButtonProps) {
  // Safe outside a <form>: pending is simply false there.
  const { pending } = useFormStatus();
  // Native default button type is "submit", so anything not explicitly
  // type="button"/"reset" participates in form pending state.
  const isSubmit = (props.type ?? "submit") === "submit";
  const busy = pending && isSubmit;

  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-md font-medium transition active:scale-[0.97] focus:outline-none focus:ring-2 focus:ring-navy-500 focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-60",
        variants[variant],
        sizes[size],
        className,
      )}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      {...props}
    >
      {busy ? <Loader2 className="mr-2 h-4 w-4 flex-none animate-spin" aria-hidden="true" /> : null}
      {children}
    </button>
  );
}

type ButtonLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  children: ReactNode;
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
};

export function ButtonLink({
  className,
  href,
  variant = "primary",
  size = "md",
  children,
  ...props
}: ButtonLinkProps) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center justify-center rounded-md font-medium transition active:scale-[0.97] focus:outline-none focus:ring-2 focus:ring-navy-500 focus:ring-offset-2",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {children}
    </Link>
  );
}
