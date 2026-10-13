import 'server-only';
import { phpPost, isTrue } from './php';
import { cached } from './cache';

/** Homepage banners from PHP, cached for an hour. */
export const getBanners = () =>
    cached('banners', 60 * 60 * 1000, async () => {
        const payload = await phpPost('get_banner.php');
        if (!isTrue(payload) || !Array.isArray(payload?.data?.bannerData)) throw new Error('No banners returned');
        return payload.data.bannerData
            .filter((b) => b?.bannerUrl)
            .map((b) => ({ ...b, bannerUrl: b.bannerUrl.replace('/app_api/API/bannerimg/', '/app_api/bannerimg/') }));
    });
