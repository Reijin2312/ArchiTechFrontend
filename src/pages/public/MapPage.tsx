import { Seo } from '@/shared/seo/seo';
import { routesMeta } from '@/shared/seo/routesMeta';
import { ONLINE_MAP_URL } from '@/shared/constants';

export default function MapPage() {
  return (
    <>
      <Seo {...routesMeta['/map']} />
      <section>
        <iframe
          src={ONLINE_MAP_URL}
          title="Онлайн-карта ArchiTech MC"
          className="block h-[calc(100dvh-56px)] min-h-[560px] w-full border-0"
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </section>
    </>
  );
}
