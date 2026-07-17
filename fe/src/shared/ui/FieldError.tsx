export function FieldError({ message }: { message?: string }) {
  return message ? <p className="mt-2 text-xs text-rose-300">{message}</p> : null;
}
