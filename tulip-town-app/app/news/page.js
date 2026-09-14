import Link from 'next/link';
import { formatNewsDate, hostnameOf, isExampleLocalNews } from '../../lib/localNews';
import { createServerT, getServerLocale } from '../../lib/i18n/server';
import { supabaseRestPaged } from '../../lib/supabaseRest';
import AutoTranslatedText from '../../components/AutoTranslatedText';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 20;

function buildPageHref(page) {
  return page <= 1 ? '/news' : `/news?page=${page}`;
}

export default async function NewsArchivePage({ searchParams }) {
  const locale = getServerLocale();
  const t = createServerT(locale);
  const requested = Math.max(1, Number(searchParams?.page) || 1);

  let rows = [];
  let total = 0;
  let page = requested;

  try {
    // Fetch a padded window so placeholder rows can be filtered without breaking paging.
    // For a clean archive we page on the server and then drop example inserts.
    const result = await supabaseRestPaged(
      'local_news?select=id,title,source,url,published_at,is_active&is_active=eq.true&order=published_at.desc',
      { page: requested, pageSize: PAGE_SIZE }
    );
    rows = (result.data || []).filter((row) => !isExampleLocalNews(row));
    total = result.total || 0;
    page = result.page;
  } catch {
    rows = [];
    total = 0;
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (page > totalPages) page = totalPages;

  return (
    <div className="container">
      <section className="wf-box news-archive" aria-label={t('news.archiveAria')}>
        <div className="panel-header">
          <h1 className="panel-title">{t('news.title')}</h1>
          <span className="panel-more" aria-hidden="true">
            {total ? t('news.count', { total }) : ''}
          </span>
        </div>

        <p className="news-archive-lead">{t('news.lead')}</p>

        {rows.length ? (
          <ul className="news-archive-list">
            {rows.map((item) => {
              const host = hostnameOf(item.url);
              const inner = (
                <>
                  <div className="wf-featured-meta">
                    <span>{item.source || t('news.fallbackSource')}</span>
                    {item.published_at ? (
                      <time dateTime={item.published_at}>{formatNewsDate(item.published_at)}</time>
                    ) : null}
                  </div>
                  <div className="wf-featured-name">
                    <AutoTranslatedText text={item.title} />
                  </div>
                  {host ? <div className="news-archive-host">{host}</div> : null}
                </>
              );

              return (
                <li key={item.id}>
                  {item.url ? (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="wf-featured-row news-archive-row"
                    >
                      {inner}
                    </a>
                  ) : (
                    <div className="wf-featured-row news-archive-row">{inner}</div>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="wf-empty wf-empty--grow">{t('news.empty')}</div>
        )}

        {totalPages > 1 ? (
          <nav className="news-archive-pager" aria-label={t('news.pager')}>
            {page > 1 ? (
              <Link href={buildPageHref(page - 1)} className="news-archive-page-link">
                {t('news.prev')}
              </Link>
            ) : (
              <span className="news-archive-page-link is-disabled">{t('news.prev')}</span>
            )}

            <span className="news-archive-page-status">
              {page} / {totalPages}
            </span>

            {page < totalPages ? (
              <Link href={buildPageHref(page + 1)} className="news-archive-page-link">
                {t('news.next')}
              </Link>
            ) : (
              <span className="news-archive-page-link is-disabled">{t('news.next')}</span>
            )}
          </nav>
        ) : null}
      </section>
    </div>
  );
}
