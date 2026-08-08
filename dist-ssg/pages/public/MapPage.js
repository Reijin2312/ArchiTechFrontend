import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { Seo } from '../../shared/seo/seo.js';
import { routesMeta } from '../../shared/seo/routesMeta.js';
import { ONLINE_MAP_URL } from '../../shared/constants.js';
export default function MapPage() {
    return (_jsxs(_Fragment, { children: [_jsx(Seo, { ...routesMeta['/map'] }), _jsx("section", { children: _jsx("iframe", { src: ONLINE_MAP_URL, title: "\u041E\u043D\u043B\u0430\u0439\u043D-\u043A\u0430\u0440\u0442\u0430 ArchiTech MC", className: "block h-[calc(100dvh-56px)] min-h-[560px] w-full border-0", referrerPolicy: "strict-origin-when-cross-origin" }) })] }));
}
