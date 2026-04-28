import { useMemo } from "react";

export function GlitchText({ text, intensity = 1 }: { text: string; intensity?: number }) {
  const className = useMemo(() => {
    if (intensity >= 3) return "echo-glitch echo-glitch--high";
    if (intensity === 2) return "echo-glitch echo-glitch--mid";
    return "echo-glitch";
  }, [intensity]);

  return (
    <span className={className} data-text={text}>
      {text}
    </span>
  );
}
