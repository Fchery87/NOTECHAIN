// Utility function to combine class names
export function cn(...classes: (string | undefined | false)[]) {
  return classes.filter(Boolean).join(' ');
}
