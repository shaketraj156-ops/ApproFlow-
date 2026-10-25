import { useEffect, useState } from 'react';
import { alertsService, ALERTS_CHANGED_EVENT } from '../services/alertsService';
import { reportsService } from '../services/reportsService';

/**
 * Live numbers for the navigation: overdue applications beside "My Queue" and open alerts beside "Alerts".
 * Returns an object keyed by route, such as `{ '/officer/alerts': { count, tone, label } }`.
 */
export function useNavBadges(role) {
  const [badges, setBadges] = useState({});

  useEffect(() => {
    if (!['aicte_officer', 'system_admin'].includes(role)) return undefined;
    let alive = true;
    const refresh = async () => {
      try {
        const [kpis, summary] = await Promise.all([reportsService.getKpis(), alertsService.getSummary()]);
        if (!alive) return;
        setBadges({
          '/officer/dashboard': { count: kpis.overdue_count, tone: 'danger', label: 'overdue' },
          '/officer/alerts': { count: summary.open_count, tone: summary.critical_count > 0 ? 'danger' : 'warn', label: 'open alerts' },
        });
      } catch {
        // The badges are a convenience; a failed request just leaves them out.
      }
    };
    refresh();
    const interval = setInterval(refresh, 60000);
    window.addEventListener(ALERTS_CHANGED_EVENT, refresh);
    return () => {
      alive = false;
      clearInterval(interval);
      window.removeEventListener(ALERTS_CHANGED_EVENT, refresh);
    };
  }, [role]);

  return badges;
}
