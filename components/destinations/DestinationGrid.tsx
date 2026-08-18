import Image from "next/image";
import { Link } from "@/i18n/navigation";
import type { Destination } from "@/lib/content/schema";

export function DestinationGrid({ destinations }: { destinations: Destination[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
      {destinations.map((d, i) => (
        <Link
          key={d.slug}
          href={`/destinations/${d.slug}`}
          className={`group relative aspect-[3/4] overflow-hidden rounded-sm ${
            i % 5 === 0 ? "lg:col-span-2 lg:row-span-2 lg:aspect-square" : ""
          }`}
        >
          <Image
            src={d.image}
            alt={d.name}
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-charcoal/70 via-transparent to-transparent" />
          <span className="absolute bottom-4 left-4 font-display text-lg text-warm-white">
            {d.name}
          </span>
        </Link>
      ))}
    </div>
  );
}
