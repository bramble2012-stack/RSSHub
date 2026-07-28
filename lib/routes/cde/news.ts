import { Route } from '@/types';
import ofetch from '@/utils/ofetch';
import { parseDate } from '@/utils/parse-date';
import logger from '@/utils/logger';

const HOST = 'https://www.cde.org.cn';

export const route: Route = {
    path: '/news/:classId',
    categories: ['government'],
    example: '/cde/news/8dc6aac86eb083759b1e01615617a347',
    parameters: {
        classId: '栏目 ID，注意不是列表页地址里那串，取自接口载荷中的 classId',
    },
    name: '新闻栏目',
    maintainers: [],
    handler,
};

async function handler(ctx) {
    const { classId } = ctx.req.param();
    const limit = Number(ctx.req.query('limit') ?? 20);

    const res = await ofetch(`${HOST}/main/news/getWorkList`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'X-Requested-With': 'XMLHttpRequest',
            Accept: 'application/json, text/javascript, */*; q=0.01',
            Referer: `${HOST}/main/news/listpage/${classId}`,
            Origin: HOST,
        },
        body: new URLSearchParams({
            pageNum: '1',
            pageSize: String(limit),
            classId,
        }).toString(),
    });

    // 被 WAF 拦下时返回的是 HTML 字符串而非对象
    if (typeof res === 'string') {
        logger.error(`CDE 返回了非 JSON 内容: ${res.slice(0, 500)}`);
        throw new Error('CDE 接口返回了 HTML，可能被拦截或路径有误');
    }

    if (res?.code !== 200) {
        logger.error(`CDE getWorkList 异常: ${JSON.stringify(res)?.slice(0, 500)}`);
        throw new Error(`CDE 接口返回异常: ${res?.msg ?? 'unknown'}`);
    }

    const records = res.data?.records ?? [];

    const items = records.map((r) => {
        let link: string;
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
            // publishDate 形如 20260724
            pubDate: r.publishDate ? parseDate(String(r.publishDate), 'YYYYMMDD') : undefined,
            guid: r.newsIdCode ?? link,
        };
    });

    return {
        title: `CDE - ${classId.slice(0, 8)}`,
        link: `${HOST}/main/news/listpage/${classId}`,
        description: '国家药品监督管理局药品审评中心',
        language: 'zh-cn',
        item: items,
    };
}
