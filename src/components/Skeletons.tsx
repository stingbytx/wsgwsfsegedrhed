export function RowSkeleton() {
  return (
    <div className="px-4 sm:px-8 py-3">
      <div className="mb-3 h-6 w-40 rounded skeleton" />
      <div className="flex gap-3 overflow-hidden">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="aspect-[2/3] w-[160px] sm:w-[190px] md:w-[210px] shrink-0 rounded-xl skeleton" />
        ))}
      </div>
    </div>
  );
}

export function HeroSkeleton() {
  return <div className="h-[70vh] min-h-[520px] w-full skeleton sm:h-[88vh]" />;
}
