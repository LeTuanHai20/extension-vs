"use strict";Object.defineProperty(exports,"__esModule",{value:!0});const t=require("vscode");class xr{constructor(t,r){this.proxy=t,this.strictSSL=r}}function Sr(){return()=>{const r=t.workspace.getConfiguration(),e=r.get("http.proxy"),s=r.get("http.proxyStrictSSL",!0);return new xr(e,s)}}exports.default=xr,exports.vscodeNetworkSettingsProvider=Sr;