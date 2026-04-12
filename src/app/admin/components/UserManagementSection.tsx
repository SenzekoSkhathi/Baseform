import type { AdminUser, SortDirection } from "../types";

type UserSortKey = "full_name" | "email" | "tier";

type UserManagementSectionProps = {
  userQuery: string;
  onUserQueryChange: (value: string) => void;
  tierFilter: string;
  onTierFilterChange: (value: string) => void;
  userLoading: boolean;
  users: AdminUser[];
  userPage: number;
  onPreviousPage: () => void;
  onNextPage: () => void;
  canGoPrevious: boolean;
  canGoNext: boolean;
  selectedUserIds: string[];
  onToggleSelectAll: (checked: boolean) => void;
  onToggleSelectOne: (userId: string, checked: boolean) => void;
  onBulkDisable: () => void;
  isBulkDisableDisabled: boolean;
  userSortKey: UserSortKey;
  userSortDirection: SortDirection;
  onSortByName: () => void;
  onSortByEmail: () => void;
  onSortByTier: () => void;
  onDraftTierChange: (userId: string, tier: string) => void;
  onSaveTier: (userId: string, tier: string) => void;
  onDisableUser: (userId: string) => void;
  isSavingUser: (userId: string) => boolean;
};

function SortButton({
  label,
  active,
  direction,
  onClick,
}: {
  label: string;
  active: boolean;
  direction: SortDirection;
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} className="inline-flex items-center gap-1 rounded px-1 py-0.5 hover:bg-gray-100">
      {label}
      <span className="text-[10px] text-gray-400">{active ? (direction === "asc" ? "▲" : "▼") : "↕"}</span>
    </button>
  );
}

export function UserManagementSection(props: UserManagementSectionProps) {
  const userAllChecked = props.users.length > 0 && props.users.every((u) => props.selectedUserIds.includes(u.id));

  return (
    <section className="rounded-3xl border border-gray-100 bg-white/95 p-5 shadow-sm">
      <h2 className="text-lg font-black text-gray-900">User Management</h2>
      <p className="mt-1 text-xs text-gray-500">Search, filter, sort, bulk disable, and update tiers.</p>

      <div className="mt-4 mb-3 grid gap-2 md:grid-cols-[1fr_160px]">
        <input
          value={props.userQuery}
          onChange={(e) => props.onUserQueryChange(e.target.value)}
          placeholder="Search by name or email"
          className="rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-900 placeholder:text-gray-400"
        />
        <select
          value={props.tierFilter}
          onChange={(e) => props.onTierFilterChange(e.target.value)}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-900"
        >
          <option value="all">All tiers</option>
          <option value="free">free</option>
          <option value="pro">pro</option>
          <option value="admin">admin</option>
          <option value="disabled">disabled</option>
        </select>
      </div>

      <div className="mb-2 flex items-center justify-between gap-3 text-xs text-gray-500">
        <p>{props.userLoading ? "Loading users..." : `${props.users.length} users on this page`}</p>
        <div className="flex items-center gap-2">
          <button type="button" onClick={props.onPreviousPage} disabled={!props.canGoPrevious} className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 font-semibold text-gray-700 disabled:opacity-50">Previous</button>
          <span>Page {props.userPage}</span>
          <button type="button" onClick={props.onNextPage} disabled={!props.canGoNext} className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 font-semibold text-gray-700 disabled:opacity-50">Next</button>
        </div>
      </div>

      <div className="mb-2 flex items-center justify-end">
        <button type="button" onClick={props.onBulkDisable} disabled={props.isBulkDisableDisabled} className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">Disable selected ({props.selectedUserIds.length})</button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-xs">
          <thead>
            <tr className="border-b border-gray-100 text-gray-500">
              <th className="px-2 py-2">
                <input
                  type="checkbox"
                  checked={userAllChecked}
                  onChange={(e) => props.onToggleSelectAll(e.target.checked)}
                />
              </th>
              <th className="px-2 py-2">
                <SortButton label="Name" active={props.userSortKey === "full_name"} direction={props.userSortDirection} onClick={props.onSortByName} />
              </th>
              <th className="px-2 py-2">
                <SortButton label="Email" active={props.userSortKey === "email"} direction={props.userSortDirection} onClick={props.onSortByEmail} />
              </th>
              <th className="px-2 py-2">
                <SortButton label="Tier" active={props.userSortKey === "tier"} direction={props.userSortDirection} onClick={props.onSortByTier} />
              </th>
              <th className="px-2 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {props.users.map((user) => (
              <tr key={user.id} className="border-b border-gray-50">
                <td className="px-2 py-2">
                  <input
                    type="checkbox"
                    checked={props.selectedUserIds.includes(user.id)}
                    onChange={(e) => props.onToggleSelectOne(user.id, e.target.checked)}
                  />
                </td>
                <td className="px-2 py-2 font-medium text-gray-800">{user.full_name || "-"}</td>
                <td className="px-2 py-2 text-gray-600">{user.email || "-"}</td>
                <td className="px-2 py-2">
                  <select
                    value={user.tier ?? "free"}
                    onChange={(e) => props.onDraftTierChange(user.id, e.target.value)}
                    className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-gray-900"
                  >
                    <option value="free">free</option>
                    <option value="pro">pro</option>
                    <option value="admin">admin</option>
                    <option value="disabled">disabled</option>
                  </select>
                </td>
                <td className="px-2 py-2">
                  <div className="flex gap-1">
                    <button type="button" onClick={() => props.onSaveTier(user.id, user.tier ?? "free")} disabled={props.isSavingUser(user.id)} className="rounded-lg bg-orange-500 px-2 py-1 text-white disabled:opacity-50">Save</button>
                    <button type="button" onClick={() => props.onDisableUser(user.id)} disabled={props.isSavingUser(user.id)} className="rounded-lg bg-red-600 px-2 py-1 text-white disabled:opacity-50">Disable</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex items-center justify-end gap-2 text-xs">
        <button type="button" onClick={props.onPreviousPage} disabled={!props.canGoPrevious} className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 disabled:opacity-50">Prev</button>
        <span className="text-gray-600">Page {props.userPage}</span>
        <button type="button" onClick={props.onNextPage} disabled={!props.canGoNext} className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 disabled:opacity-50">Next</button>
      </div>
    </section>
  );
}
