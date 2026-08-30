import { redirect } from 'next/navigation';
import { canonicalCityName, getHub, guideBoardHref } from '../../../lib/settlementTowns';

export const dynamic = 'force-dynamic';

/** Alias for the settlement-guide map. Canonical URL is `/board/guide`. */
export default function GuideMapPage({ searchParams = {} }) {
  const city = canonicalCityName(searchParams.city);
  if (city) redirect(guideBoardHref({ city }));
  const hubName = canonicalCityName(searchParams.hub);
  if (hubName && getHub(hubName)?.satellites?.length) {
    redirect(guideBoardHref({ hub: hubName }));
  }
  redirect(guideBoardHref());
}
