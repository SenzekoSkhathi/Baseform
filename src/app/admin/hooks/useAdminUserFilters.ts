import { useCallback, useState } from "react";

type UserSortKey = "full_name" | "email" | "tier" | "created_at";
type UserSortDirection = "asc" | "desc";

export function useAdminUserFilters(pageSize: number) {
  const [userQuery, setUserQuery] = useState("");
  const [tierFilter, setTierFilter] = useState("all");
  const [userPage, setUserPage] = useState(1);
  const [userHasMore, setUserHasMore] = useState(false);

  const buildUserQueryParams = useCallback((sortKey: UserSortKey, sortDirection: UserSortDirection) => {
    const params = new URLSearchParams();
    params.set("limit", String(pageSize));
    params.set("page", String(userPage));
    params.set("sortKey", sortKey);
    params.set("sortDirection", sortDirection);
    if (userQuery.trim()) params.set("q", userQuery.trim());
    if (tierFilter !== "all") params.set("tier", tierFilter);

    return params;
  }, [pageSize, tierFilter, userPage, userQuery]);

  const resetUserPaging = useCallback(() => {
    setUserPage(1);
    setUserHasMore(false);
  }, []);

  const goToPreviousUserPage = useCallback(() => {
    if (userPage <= 1) return;
    setUserPage((current) => Math.max(1, current - 1));
  }, [userPage]);

  const goToNextUserPage = useCallback(() => {
    if (!userHasMore) return;
    setUserPage((current) => current + 1);
  }, [userHasMore]);

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
    userHasMore,
    setUserHasMore,
    buildUserQueryParams,
    goToPreviousUserPage,
    goToNextUserPage,
    resetUserPaging,
    setUserFilters,
  };
}
