'use client';

import { useMemo } from 'react';
import { useLocale } from './LocaleProvider';
import { localizePostFields } from '../lib/i18n/postLocale';

/** List-row title that prefers title_en when locale is English. */
export default function LocalizedPostTitle({ post, className = '' }) {
  const { locale } = useLocale();
  const { title } = useMemo(() => localizePostFields(post, locale), [post, locale]);
  return <span className={className}>{title}</span>;
}
