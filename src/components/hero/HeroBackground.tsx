import { cn } from "../../lib/utils";

/**
 * Hero background component providing decorative gradient mesh and animated dots
 * for the hero section. Uses Aceternity-style patterns.
 */
export function HeroBackground({
    gradient = "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
}: {
    gradient?: string;
}) {
    return (
        <div
            className="fixed inset-0 z-[-1]"
            style={{
                backgroundImage: `linear-gradient(135deg, ${gradient} 0%, ${gradient} 100%)`,
                backgroundSize: "cover",
            }}
        />
    );
}
