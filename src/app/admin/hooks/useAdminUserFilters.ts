import { useCallback, useState } from "react";

export function useAdminUserFilters(pageSize: number) {
  const [userQuery, setUserQuery] = useState("");
  const [tierFilter, setTierFilter] = useState("all");
  const [userPage, setUserPage] = useState(1);
  const [userCursorStack, setUserCursorStack] = useState<string[]>([]);
  const [userNextCursor, setUserNextCursor] = useState<string | null>(null);
  const [userHasMore, setUserHasMore] = useState(false);

  const buildUserQueryParams = useCallback(() => {
    const params = new URLSearchParams();
    params.set("limit", String(pageSize));
    if (userQuery.trim()) params.set("q", userQuery.trim());
    if (tierFilter !== "all") params.set("tier", tierFilter);

    const currentCursor = userCursorStack.at(-1);
    if (currentCursor) params.set("cursor", currentCursor);

    return params;
  }, [pageSize, tierFilter, userCursorStack, userQuery]);

  const resetUserPaging = useCallback(() => {
    setUserPage(1);
    setUserCursorStack([]);
    setUserHasMore(false);
    setUserNextCursor(null);
  }, []);

  const goToPreviousUserPage = useCallback(() => {
    if (userPage <= 1) return;
    setUserPage((current) => Math.max(1, current - 1));
    setUserCursorStack((current) => current.slice(0, -1));
  }, [userPage]);

  const goToNextUserPage = useCallback(() => {
    if (!userHasMore || !userNextCursor) return;
    setUserPage((current) => current + 1);
    setUserCursorStack((current) => [...current, userNextCursor]);
  }, [userHasMore, userNextCursor]);

  const setUserFilters = useCallback((query: string, tier: string) => {
    setUserQuery(query);
    setTierFilter(tier);
    resetUserPaging();
  }, [resetUserPaging]);

  return {
    userQuery,
    setUserQuery,
    tierFilter,
    setTierFilter,
    userPage,
    setUserPage,
    userCursorStack,
    setUserCursorStack,
    userNextCursor,
    setUserNextCursor,
    userHasMore,
    setUserHasMore,
    buildUserQueryParams,
    goToPreviousUserPage,
    goToNextUserPage,
    resetUserPaging,
    setUserFilters,
  };
}
