import Link from 'next/link';
import { formatNewsDate, hostnameOf, isExampleLocalNews } from '../../lib/localNews';
import { supabaseRestPaged } from '../../lib/supabaseRest';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 20;

function buildPageHref(page) {
  return page <= 1 ? '/news' : `/news?page=${page}`;
}

export default async function NewsArchivePage({ searchParams }) {
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
      <section className="wf-box news-archive" aria-label="지역뉴스 전체">
        <div className="panel-header">
          <h1 className="panel-title">지역 뉴스</h1>
          <span className="panel-more" aria-hidden="true">
            {total ? `${total}건` : ''}
          </span>
        </div>

        <p className="news-archive-lead">
          West Michigan 지역 소식을 모았습니다. 글쓰기는 관리자만 등록할 수 있습니다.
        </p>

        {rows.length ? (
          <ul className="news-archive-list">
            {rows.map((item) => {
              const host = hostnameOf(item.url);
              const inner = (
                <>
                  <div className="wf-featured-meta">
                    <span>{item.source || '지역 뉴스'}</span>
                    {item.published_at ? <time dateTime={item.published_at}>{formatNewsDate(item.published_at)}</time> : null}
                  </div>
                  <div className="wf-featured-name">{item.title}</div>
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
          <div className="wf-empty wf-empty--grow">등록된 지역 뉴스가 아직 없습니다.</div>
        )}

        {totalPages > 1 ? (
          <nav className="news-archive-pager" aria-label="페이지 이동">
            {page > 1 ? (
              <Link href={buildPageHref(page - 1)} className="news-archive-page-link">
                이전
              </Link>
            ) : (
              <span className="news-archive-page-link is-disabled">이전</span>
            )}

            <span className="news-archive-page-status">
              {page} / {totalPages}
            </span>

            {page < totalPages ? (
              <Link href={buildPageHref(page + 1)} className="news-archive-page-link">
                다음
              </Link>
            ) : (
              <span className="news-archive-page-link is-disabled">다음</span>
            )}
          </nav>
        ) : null}
      </section>
    </div>
  );
}
