export function RatingStars({ rating, className = "" }) {
  const fullStars = Math.floor(rating);
  const hasHalf = rating - fullStars >= 0.5;

  return (
    <div className={`flex items-center gap-1 text-amber-500 ${className}`}>
      {Array.from({ length: 5 }).map((_, index) => {
        let icon = "star_outline";

        if (index < fullStars) {
          icon = "star";
        } else if (index === fullStars && hasHalf) {
          icon = "star_half";
        }

        return (
          <span
            key={index}
            className="material-symbols-outlined text-sm"
            style={{ fontVariationSettings: "'FILL' 1, 'wght' 500, 'GRAD' 0, 'opsz' 20" }}
          >
            {icon}
          </span>
        );
      })}
    </div>
  );
}
