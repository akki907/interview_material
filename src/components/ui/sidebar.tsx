// src/components/ui/sidebar.tsx
// Collapsible sidebar built on the shadcn/base-ui composition, themed with this
// app's design tokens. Note the Base UI `render` prop convention (not Radix
// `asChild`).
import * as React from "react";
import { useIsMobile } from "../../lib/use-mobile";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "./sheet";
import { Button } from "./button";
import { Skeleton } from "./skeleton";
import { PanelLeftIcon } from "lucide-react";
import { cn } from "../../lib/utils";

const SIDEBAR_WIDTH = "16rem";
const SIDEBAR_WIDTH_MOBILE = "18rem";
const SIDEBAR_KEYBOARD_SHORTCUT = "b";

type SidebarContextValue = {
    state: "expanded" | "collapsed";
    open: boolean;
    setOpen: (open: boolean) => void;
    openMobile: boolean;
    setOpenMobile: (open: boolean) => void;
    isMobile: boolean;
    toggleSidebar: () => void;
};

const SidebarContext = React.createContext<SidebarContextValue | null>(null);

function useSidebar(): SidebarContextValue {
    const ctx = React.useContext(SidebarContext);
    if (!ctx) {
        throw new Error("useSidebar must be used within a <SidebarProvider />");
    }
    return ctx;
}

function SidebarProvider({
    defaultOpen = true,
    open: openProp,
    onOpenChange: setOpenProp,
    className,
    style,
    children,
    ...props
}: React.ComponentProps<"div"> & {
    defaultOpen?: boolean;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
}) {
    const isMobile = useIsMobile();
    const [openMobile, setOpenMobile] = React.useState(false);
    const [internalOpen, setInternalOpen] = React.useState(defaultOpen);
    const open = openProp ?? internalOpen;

    const setOpen = React.useCallback(
        (value: boolean | ((v: boolean) => boolean)) => {
            const next = typeof value === "function" ? value(open) : value;
            if (setOpenProp) setOpenProp(next);
            else setInternalOpen(next);
        },
        [setOpenProp, open],
    );

    const toggleSidebar = React.useCallback(() => {
        if (isMobile) setOpenMobile((o) => !o);
        else setOpen((o) => !o);
    }, [isMobile, setOpen]);

    // Cmd/Ctrl+B toggles the sidebar, matching the shadcn convention.
    React.useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (
                event.key === SIDEBAR_KEYBOARD_SHORTCUT &&
                (event.metaKey || event.ctrlKey)
            ) {
                event.preventDefault();
                toggleSidebar();
            }
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [toggleSidebar]);

    const value = React.useMemo<SidebarContextValue>(
        () => ({
            state: open ? "expanded" : "collapsed",
            open,
            setOpen,
            isMobile,
            openMobile,
            setOpenMobile,
            toggleSidebar,
        }),
        [open, setOpen, isMobile, openMobile, toggleSidebar],
    );

    return (
        <SidebarContext.Provider value={value}>
            <div
                data-slot="sidebar-wrapper"
                style={
                    {
                        "--sidebar-width": SIDEBAR_WIDTH,
                        "--sidebar-width-mobile": SIDEBAR_WIDTH_MOBILE,
                        ...style,
                    } as React.CSSProperties
                }
                className={cn("flex min-h-svh w-full text-ink", className)}
                {...props}
            >
                {children}
            </div>
        </SidebarContext.Provider>
    );
}

function Sidebar({
    side = "left",
    variant = "sidebar",
    collapsible = "offcanvas",
    className,
    children,
    ...props
}: React.ComponentProps<"div"> & {
    side?: "left" | "right";
    variant?: "sidebar" | "floating" | "inset";
    collapsible?: "offcanvas" | "icon" | "none";
}) {
    const { isMobile, state, openMobile, setOpenMobile } = useSidebar();

    if (collapsible === "none") {
        return (
            <aside
                data-slot="sidebar"
                className={cn(
                    "flex h-full w-(--sidebar-width) flex-col bg-surface",
                    className,
                )}
                {...props}
            >
                {children}
            </aside>
        );
    }

    if (isMobile) {
        return (
            <Sheet open={openMobile} onOpenChange={setOpenMobile} {...props}>
                <SheetContent
                    data-sidebar="sidebar"
                    data-slot="sidebar"
                    data-mobile="true"
                    side={side}
                    className="w-(--sidebar-width) p-0"
                    style={
                        {
                            "--sidebar-width": SIDEBAR_WIDTH_MOBILE,
                        } as React.CSSProperties
                    }
                >
                    <SheetHeader className="sr-only">
                        <SheetTitle>Sidebar</SheetTitle>
                        <SheetDescription>
                            Displays the mobile sidebar.
                        </SheetDescription>
                    </SheetHeader>
                    <div className="flex h-full w-full flex-col">
                        {children}
                    </div>
                </SheetContent>
            </Sheet>
        );
    }

    return (
        <div
            data-slot="sidebar-container"
            data-side={side}
            data-collapsible={state}
            className="hidden shrink-0 md:flex"
        >
            <aside
                data-slot="sidebar"
                className={cn(
                    "flex h-svh flex-col transition-[width] duration-200 ease-linear",
                    variant === "floating"
                        ? "m-2 w-(--sidebar-width) rounded-card border border-rule shadow-soft"
                        : "w-(--sidebar-width) border-r border-rule bg-surface",
                    variant === "inset" && "bg-paper",
                    variant !== "floating" && "bg-surface",
                    "data-[collapsible=icon]:w-14",
                    className,
                )}
                {...props}
            >
                {children}
            </aside>
        </div>
    );
}

function SidebarHeader({ className, ...props }: React.ComponentProps<"div">) {
    return (
        <div
            data-slot="sidebar-header"
            className={cn(
                "flex flex-col gap-2 border-b border-rule p-3",
                className,
            )}
            {...props}
        />
    );
}

function SidebarContent({ className, ...props }: React.ComponentProps<"div">) {
    return (
        <div
            data-slot="sidebar-content"
            className={cn(
                "flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto p-2",
                className,
            )}
            {...props}
        />
    );
}

function SidebarFooter({ className, ...props }: React.ComponentProps<"div">) {
    return (
        <div
            data-slot="sidebar-footer"
            className={cn(
                "flex flex-col gap-2 border-t border-rule p-3",
                className,
            )}
            {...props}
        />
    );
}

function SidebarGroup({ className, ...props }: React.ComponentProps<"div">) {
    return (
        <div
            data-slot="sidebar-group"
            className={cn("relative flex w-full flex-col", className)}
            {...props}
        />
    );
}

function SidebarGroupLabel({
    className,
    ...props
}: React.ComponentProps<"div">) {
    return (
        <div
            data-slot="sidebar-group-label"
            className={cn(
                "flex h-8 shrink-0 items-center px-2 text-xs font-semibold tracking-wider text-muted uppercase",
                className,
            )}
            {...props}
        />
    );
}

function SidebarGroupContent({
    className,
    ...props
}: React.ComponentProps<"div">) {
    return (
        <div
            data-slot="sidebar-group-content"
            className={cn("w-full text-sm", className)}
            {...props}
        />
    );
}

function SidebarMenu({ className, ...props }: React.ComponentProps<"ul">) {
    return (
        <ul
            data-slot="sidebar-menu"
            className={cn("flex w-full flex-col gap-0.5", className)}
            {...props}
        />
    );
}

function SidebarMenuItem({ className, ...props }: React.ComponentProps<"li">) {
    return (
        <li
            data-slot="sidebar-menu-item"
            className={cn("group/menu-item relative", className)}
            {...props}
        />
    );
}

function SidebarMenuButton({
    className,
    isActive = false,
    render,
    ...props
}: React.ComponentProps<"button"> & {
    isActive?: boolean;
    render?: React.ReactElement;
}) {
    // The active row is the sidebar's answer to "where am I?", so it gets three
    // signals rather than one: a tinted fill, ink text, and a left accent bar
    // that stays visible even when the row is scrolled against the edge.
    const classes = cn(
        "group/menu-button relative flex w-full cursor-pointer items-center gap-2 rounded-md py-1.5 pr-2 pl-2 text-left text-sm outline-none transition-colors",
        "hover:bg-neutral focus-visible:ring-[3px] focus-visible:ring-focus/30",
        isActive
            ? "bg-c2 font-semibold text-c2i before:absolute before:inset-y-1.5 before:left-0 before:w-0.5 before:rounded-full before:bg-c2i"
            : "text-muted hover:text-ink",
        className,
    );

    // Base UI's `render` prop swaps the element that gets rendered, which is
    // how a link or a react-router <NavLink> is produced instead of a button.
    if (render) {
        return React.cloneElement(render, {
            ...props,
            "data-slot": "sidebar-menu-button",
            "data-active": isActive,
            className: cn(
                classes,
                (render.props as { className?: string }).className,
            ),
        } as React.HTMLAttributes<HTMLElement>);
    }

    return (
        <button
            data-slot="sidebar-menu-button"
            data-active={isActive}
            className={classes}
            {...props}
        />
    );
}

function SidebarMenuSub({ className, ...props }: React.ComponentProps<"ul">) {
    return (
        <ul
            data-slot="sidebar-menu-sub"
            className={cn(
                "ml-3 flex flex-col gap-0.5 border-l border-rule py-0.5 pr-0 pl-2.5",
                className,
            )}
            {...props}
        />
    );
}

function SidebarMenuSubItem({
    className,
    render,
    isActive = false,
    ...props
}: React.ComponentProps<"li"> & {
    render?: React.ReactElement;
    isActive?: boolean;
}) {
    const classes = cn("group/menu-sub-item relative", className);

    if (render) {
        return React.cloneElement(render, {
            ...props,
            "data-slot": "sidebar-menu-sub-item",
            "data-active": isActive,
            className: cn(
                classes,
                (render.props as { className?: string }).className,
            ),
        } as React.HTMLAttributes<HTMLElement>);
    }

    return (
        <li
            data-slot="sidebar-menu-sub-item"
            data-active={isActive}
            className={classes}
            {...props}
        />
    );
}

function SidebarMenuBadge({
    className,
    ...props
}: React.ComponentProps<"div">) {
    return (
        <div
            data-slot="sidebar-menu-badge"
            className={cn(
                "pointer-events-none absolute right-2 flex h-5 min-w-5 items-center justify-center rounded-md px-1 text-[10px] font-medium text-muted tabular-nums select-none",
                className,
            )}
            {...props}
        />
    );
}

function SidebarMenuSkeleton({
    className,
    showIcon = false,
    ...props
}: React.ComponentProps<"div"> & { showIcon?: boolean }) {
    return (
        <div
            data-slot="sidebar-menu-skeleton"
            className={cn("flex h-8 items-center gap-2 px-2", className)}
            {...props}
        >
            {showIcon && <Skeleton className="size-4 rounded-md" />}
            <Skeleton className="h-4 max-w-(--skeleton-width) flex-1" />
        </div>
    );
}

function SidebarInset({ className, ...props }: React.ComponentProps<"div">) {
    return (
        <div
            data-slot="sidebar-inset"
            className={cn(
                "relative flex w-full flex-1 flex-col bg-paper",
                className,
            )}
            {...props}
        />
    );
}

function SidebarRail({ className, ...props }: React.ComponentProps<"button">) {
    const { toggleSidebar } = useSidebar();
    return (
        <button
            data-slot="sidebar-rail"
            type="button"
            onClick={toggleSidebar}
            aria-label="Toggle Sidebar"
            tabIndex={-1}
            title="Toggle Sidebar"
            className={cn(
                "absolute inset-y-0 z-20 hidden w-4 -translate-x-1/2 transition-all ease-linear sm:flex",
                "after:absolute after:inset-y-0 after:start-1/2 after:w-[2px] hover:after:bg-rule",
                className,
            )}
            {...props}
        />
    );
}

function SidebarTrigger({
    className,
    onClick,
    ...props
}: React.ComponentProps<"button">) {
    const { toggleSidebar } = useSidebar();
    return (
        <Button
            data-slot="sidebar-trigger"
            data-sidebar="trigger"
            variant="ghost"
            size="icon"
            className={cn("size-8", className)}
            onClick={(e) => {
                onClick?.(e);
                toggleSidebar();
            }}
            {...props}
        >
            <PanelLeftIcon />
            <span className="sr-only">Toggle Sidebar</span>
        </Button>
    );
}

export {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarInset,
    SidebarMenu,
    SidebarMenuBadge,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSkeleton,
    SidebarMenuSub,
    SidebarMenuSubItem,
    SidebarProvider,
    SidebarRail,
    SidebarTrigger,
    useSidebar,
};
