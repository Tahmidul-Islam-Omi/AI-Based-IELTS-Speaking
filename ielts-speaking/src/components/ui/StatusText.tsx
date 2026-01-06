interface StatusTextProps {
  isActive: boolean;
}

export function StatusText({ isActive }: StatusTextProps) {
  return (
    <p className="text-lg text-gray-600 dark:text-gray-300">
      {isActive ? "Listening..." : "Tap to start"}
    </p>
  );
}
