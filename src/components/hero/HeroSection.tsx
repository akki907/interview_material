import { DotPattern } from "../../components/animated/DotPattern";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { PageHeader } from "../../components/app/PageHeader";
import { StatTiles } from "../../components/app/StatTiles";

/**
 * HeroSection — a full-width hero block with interactive dot-pattern
 * background (Aceternity-style), title/subtitle, stat tiles, insight
 * cards, and footer controls.
 */
function HeroSection({
    title,
    subtitle,
    primaryColor = "#3b82f6",
    secondaryColor = "#6366f1",
    hasAnimations = true,
    animationType = "dots",
}: {
    title: string;
    subtitle: string;
    primaryColor?: string;
    secondaryColor?: string;
    hasAnimations?: boolean;
    animationType?: "dots" | "grid" | "none";
}) {
    return (
        <div className="relative min-h-[600px] flex flex-col items-center justify-center p-4">
            {/* Background pattern — three layered dot patterns for a dynamic mesh */}
            {hasAnimations && animationType === "dots" && (
                <>
                    <DotPattern
                        className="fixed inset-0 z-[-1]"
                        gap={18}
                        radius={1}
                        color={primaryColor}
                        glow="var(--focus)"
                    />
                    <DotPattern
                        className="fixed inset-0 z-[-2]"
                        gap={24}
                        radius={0.5}
                        color={secondaryColor}
                        glow="var(--focus)"
                    />
                    <DotPattern
                        className="fixed inset-0 z-[-3]"
                        gap={32}
                        radius={0.8}
                        color="var(--rule)"
                        glow="var(--focus)"
                    />
                </>
            )}

            {/* Header */}
            <PageHeader title={title} intro={subtitle} />

            {/* Stat tiles */}
            <StatTiles
                tiles={[
                    { label: "Problems Solved", value: "142", tone: "text-focus" },
                    { label: "Topics Completed", value: "89", tone: "text-c1i" },
                    { label: "Streak", value: "14 days 🔥", tone: "text-c3i" },
                    { label: "Learning Hours", value: "128", tone: "text-c5i" },
                ]}
                className="mb-8"
            />

            {/* Insights cards grid */}
            <div className="grid gap-4 w-full max-w-4xl">
                {[1, 2, 3].map((num) => (
                    <Card
                        key={num}
                        className="rounded-lg shadow-lg p-6 hover:shadow-xl transition-all duration-300"
                    >
                        <CardHeader>
                            <CardTitle>Quick Insight {num}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted leading-relaxed">
                                This is a sample insight card. In a real scenario, this would display
                                detailed information about the selected metric.
                            </p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Footer controls */}
            <div className="mt-8 flex items-center justify-center gap-3">
                <Button
                    variant="primary"
                    size="sm"
                    onClick={() => console.log("Explore More clicked")}
                >
                    Explore More
                </Button>
                <Button variant="ghost" size="icon" aria-label="Back">
                    ← Back
                </Button>
            </div>
        </div>
    );
}

export { HeroSection };
