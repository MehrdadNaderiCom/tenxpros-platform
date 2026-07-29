type FormMessageProps = {
  message?: string;
  tone?: "error" | "success" | "info";
};

const toneClasses = {
  error: "border-rose-400/25 bg-rose-400/10 text-rose-100",
  success: "border-emerald-400/25 bg-emerald-400/10 text-emerald-100",
  info: "border-iris-400/25 bg-iris-400/10 text-iris-100",
};

export function FormMessage({ message, tone = "info" }: FormMessageProps) {
  if (!message) return null;

  return (
    <p
      aria-live="polite"
      className={`rounded-lg border px-4 py-3 text-sm leading-7 ${toneClasses[tone]}`}
    >
      {message}
    </p>
  );
}
