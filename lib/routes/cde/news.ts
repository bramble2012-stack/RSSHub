import { Route } from '@/types';
import ofetch from '@/utils/ofetch';
import { parseDate } from '@/utils/parse-date';

const HOST = 'https://www.cde.org.cn';

export const route: Route = {
    path: '/news/:classId',
    categories: ['government'],
    example: '/cde/news/3cc45b396497b598341ce3af000490e5',
    parameters: { classId: '栏目 ID，取自 listpage/ 后面那串' },
    name: '新闻栏目',
    maintainers: [],
    handler,
};

async function handler(ctx) {
    const { classId } = ctx.req.param();
    const limit = Number(ctx.req.query('limit') ?? 20);

    const res = await ofetch(`${HOST}/main/getList`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'X-Requested-With': 'XMLHttpRequest',
            Referer: `${HOST}/main/news/listpage/${classId}`,
        },
        body: new URLSearchParams({
            classId,
            pageNum: '1',
            pageSize: String(limit),
        }).toString(),
    });

    if (res?.code !== 200) {
        throw new Error(`CDE 接口返回异常: ${res?.msg ?? 'unknown'}`);
    }

    const items = (res.data?.records ?? []).map((r) => {
        let link;
        if (r.externalLinks) {
            link = r.externalLinks;
        } else if (r.isPic === 1) {
            link = `${HOST}/main/newspic/view/${r.newsIdCode}`;
        } else {
            link = `${HOST}/main/news/viewInfoCommon/${r.newsIdCode}`;
        }
        return {
            title: r.title,
            link,
            description: r.content ?? '',
            pubDate: parseDate(`${r.ymValue}.${r.dValue}`, 'YYYY.MM.DD'),
            guid: r.newsIdCode,
        };
    });

    return {
        title: `CDE - ${classId.slice(0, 8)}`,
        link: `${HOST}/main/news/listpage/${classId}`,
        item: items,
    };
}
