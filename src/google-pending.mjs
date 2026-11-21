export function pendingGoogleRequest(
  stored,
  { native = false, returned = false, hasDraft = false } = {},
) {
  if (stored?.ticket) return { method: 'POST', body: { ticket: stored.ticket } };
  // Web OAuth keeps its ticket in an HttpOnly cookie; native OAuth uses PKCE
  // and an explicit ticket. A fresh anonymous start needs neither request.
  return !native && (returned || hasDraft) ? {} : null;
}
