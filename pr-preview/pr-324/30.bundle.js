"use strict";(self.webpackChunk_aics_web_3d_viewer=self.webpackChunk_aics_web_3d_viewer||[]).push([[30],{2132:(e,t,r)=>{function n(e,t){let r=e.length-t,n=0;do{for(let r=t;r>0;r--)e[n+t]+=e[n],n++;r-=t}while(r>0)}function i(e,t,r){let n=0,i=e.length;const o=i/r;for(;i>t;){for(let r=t;r>0;--r)e[n+t]+=e[n],++n;i-=t}const s=e.slice();for(let t=0;t<o;++t)for(let n=0;n<r;++n)e[r*t+n]=s[(r-n-1)*o+t]}r.d(t,{A:()=>o});class o{async decode(e,t){const r=await this.decodeBlock(t),o=e.Predictor||1;if(1!==o){const t=!e.StripOffsets;return function(e,t,r,o,s,l){if(!t||1===t)return e;for(let e=0;e<s.length;++e){if(s[e]%8!=0)throw new Error("When decoding with predictor, only multiple of 8 bits are supported.");if(s[e]!==s[0])throw new Error("When decoding with predictor, all samples must have the same size.")}const a=s[0]/8,c=2===l?1:s.length;for(let l=0;l<o&&!(l*c*r*a>=e.byteLength);++l){let o;if(2===t){switch(s[0]){case 8:o=new Uint8Array(e,l*c*r*a,c*r*a);break;case 16:o=new Uint16Array(e,l*c*r*a,c*r*a/2);break;case 32:o=new Uint32Array(e,l*c*r*a,c*r*a/4);break;default:throw new Error(`Predictor 2 not allowed with ${s[0]} bits per sample.`)}n(o,c)}else 3===t&&(o=new Uint8Array(e,l*c*r*a,c*r*a),i(o,c,a))}return e}(r,o,t?e.TileWidth:e.ImageWidth,t?e.TileLength:e.RowsPerStrip||e.ImageLength,e.BitsPerSample,e.PlanarConfiguration)}return r}}},1030:(e,t,r)=>{r.r(t),r.d(t,{default:()=>i});var n=r(2132);class i extends n.A{decodeBlock(e){const t=new DataView(e),r=[];for(let n=0;n<e.byteLength;++n){let e=t.getInt8(n);if(e<0){const i=t.getUint8(n+1);e=-e;for(let t=0;t<=e;++t)r.push(i);n+=1}else{for(let i=0;i<=e;++i)r.push(t.getUint8(n+i+1));n+=e+1}}return new Uint8Array(r).buffer}}}}]);
//# sourceMappingURL=30.bundle.js.map