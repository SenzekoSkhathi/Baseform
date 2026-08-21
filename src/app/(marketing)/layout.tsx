import "./marketing-theme.css";

/**
 * Marketing (public site) layout.
 *
 * Owns the editorial design system for every public page — landing, about,
 * how-it-works, plans, contact, waitlist, legal — via the scoped
 * `.marketing-root` class (see marketing-theme.css). This is the seam that
 * separates the public website from the authenticated app: the app's route
 * groups ((dashboard), (auth), admin...) never load this theme.
 *
 * Note: the shared <MarketingHeader>/<MarketingFooter> are used directly by
 * sub-pages (see about/page.tsx) rather than rendered here, because the
 * landing page still ships its own bespoke nav/footer. Once the landing page
 * is migrated onto the shared chrome, they can be hoisted into this layout.
 */
export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="marketing-root min-h-screen">{children}</div>;
}
