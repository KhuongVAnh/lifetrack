import { useState } from "react";

export function ImageWithFallback({
  src,
  alt,
  className = "",
  fallback = "https://via.placeholder.com/400x400/e5e9eb/004976?text=LifeTrack",
}) {
  const [currentSrc, setCurrentSrc] = useState(src || fallback);

  return (
    <img
      alt={alt}
      className={className}
      src={currentSrc}
      onError={() => {
        if (currentSrc !== fallback) {
          setCurrentSrc(fallback);
        }
      }}
    />
  );
}
