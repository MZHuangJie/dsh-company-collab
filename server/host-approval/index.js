/**
 * DSH host approval bridge.
 *
 * Runs inside the server-side company-host DSH profile. When a tool requests
 * approval, it creates a Hub approval, announces it in the group, and waits
 * for an admin/requester decision. The DSH approval seam expects one of:
 * allowed-once, rejected, cancelled, unavailable.
 */

const SLEEP = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export function apply(ctx) {
  const token = String(process.env.COMPANY_HOST_TOKEN || '');
  const hub = String(process.env.COMPANY_HOST_URL || 'http://127.0.0.1:8477').replace(/\/+$/, '');
  const companyId = String(process.env.COMPANY_ID || '');
  const groupId = String(process.env.GROUP_ID || '');
  const requestedBy = String(process.env.REQUESTED_BY || '');
  if (!token || !companyId || !groupId || !requestedBy) return;

  const headers = { 'content-type': 'application/json', 'x-company-host-token': token };

  ctx.on('approval/request', async (request, next) => {
    try {
      if (request?.signal?.aborted) return 'cancelled';
      const createResponse = await fetch(`${hub}/api/host/approvals`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          companyId,
          groupId,
          requestedBy,
          toolName: String(request?.toolName || '工具调用'),
          reason: String(request?.reason || ''),
          callId: String(request?.callId || ''),
        }),
      });
      const created = await createResponse.json().catch(() => null);
      if (!createResponse.ok || !created?.id) return next();
      const deadline = Date.now() + 120_000;
      while (Date.now() < deadline) {
        if (request?.signal?.aborted) return 'cancelled';
        await SLEEP(2_000);
        const poll = await fetch(`${hub}/api/host/approvals/${encodeURIComponent(created.id)}`, {
          headers: { 'x-company-host-token': token },
        });
        const current = await poll.json().catch(() => null);
        if (current?.status === 'approved') return 'allowed-once';
        if (current?.status === 'rejected' || current?.status === 'expired') return 'rejected';
      }
      return 'rejected';
    } catch (error) {
      console.error('[company-host-approval] bridge failed', error);
      return next();
    }
  });
}
