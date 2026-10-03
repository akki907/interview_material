import { StatTiles } from "../../components/app/StatTiles";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { PageHeader } from "../../components/app/PageHeader";

/**
 * HeroContent — the content region inside a hero section.
 * Header, stat tiles, insight cards, footer controls.
 */
function HeroContent({
    title,
    subtitle,
    primaryColor = "#3b82f6",
    secondaryColor = "#6366f1",
    hasInsights = true,
}: {
    title: string;
    subtitle: string;
    primaryColor?: string;
    secondaryColor?: string;
    hasInsights?: boolean;
}) {
    return (
        <div className="relative max-w-4xl mx-auto">
            <PageHeader title={title} intro={subtitle} />

            <StatTiles
                tiles={[
                    { label: "Problems Solved", value: "142", tone: "text-focus" },
                    { label: "Topics Completed", value: "89", tone: "text-c1i" },
                    { label: "Streak", value: "14 days 🔥", tone: "text-c3i" },
                    { label: "Learning Hours", value: "128", tone: "text-c5i" },
                ]}
                className="mb-8"
            />

            <h2 className="mb-3 text-lg font-semibold">{title}</h2>
            <p className="text-base text-muted max-w-md mx-auto">{subtitle}</p>

            {hasInsights && (
                <div className="grid gap-4 mb-8">
                    {[1, 2, 3].map((num) => (
                        <Card key={num} className="rounded-lg shadow-lg p-6 hover:shadow-xl transition-all duration-300">
                            <CardHeader>
                                <CardTitle>Insight {num}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted leading-relaxed">
                                    Detailed insight content goes here. This demonstrates the ability to present
                                    structured data in a visually appealing way.
                                </p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            <div className="flex items-center justify-center gap-3">
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

export { HeroContent };
