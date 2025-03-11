(()=>{var e,r,t={8625:()=>{},6504:()=>{},6580:()=>{},4389:(e,r,t)=>{"use strict";var n=t(4276),o=t(205);Error;const a=[{property:"name",enumerable:!1},{property:"message",enumerable:!1},{property:"stack",enumerable:!1},{property:"code",enumerable:!0},{property:"cause",enumerable:!1}],i=new WeakSet,s=({from:e,seen:r,to:t,forceEnumerable:n,maxDepth:u,depth:l,useToJSON:p,serialize:c})=>{var y;if(t||(t=Array.isArray(e)?[]:!c&&f(e)?new(y=e.name,o.A.get(y)??Error):{}),r.push(e),l>=u)return t;if(p&&"function"==typeof e.toJSON&&!i.has(e))return(e=>{i.add(e);const r=e.toJSON();return i.delete(e),r})(e);const d=e=>s({from:e,seen:[...r],forceEnumerable:n,maxDepth:u,depth:l,useToJSON:p,serialize:c});for(const[n,o]of Object.entries(e))if(o&&o instanceof Uint8Array&&"Buffer"===o.constructor.name)t[n]="[object Buffer]";else if(null===o||"object"!=typeof o||"function"!=typeof o.pipe){if("function"!=typeof o)if(o&&"object"==typeof o)r.includes(e[n])?t[n]="[Circular]":(l++,t[n]=d(e[n]));else try{t[n]=o}catch{}}else t[n]="[object Stream]";for(const{property:r,enumerable:o}of a)void 0!==e[r]&&null!==e[r]&&Object.defineProperty(t,r,{value:f(e[r])?d(e[r]):e[r],enumerable:!!n||o,configurable:!0,writable:!0});return t};function u(e,r={}){const{maxDepth:t=Number.POSITIVE_INFINITY,useToJSON:n=!0}=r;return"object"==typeof e&&null!==e?s({from:e,seen:[],forceEnumerable:!0,maxDepth:t,depth:0,useToJSON:n,serialize:!0}):"function"==typeof e?`[Function: ${e.name||"anonymous"}]`:e}function f(e){return Boolean(e)&&"object"==typeof e&&"name"in e&&"message"in e&&"stack"in e}var l=t(9698);let p=function(e){return e.UNKNOWN="unknown",e.NOT_FOUND="not_found",e.TOO_LARGE="too_large",e.LOAD_DATA_FAILED="load_data_failed",e.INVALID_METADATA="invalid_metadata",e.INVALID_MULTI_SOURCE_ZARR="invalid_multi_source_zarr",e}({});class c extends Error{constructor(e,r){super(e,r),this.name="VolumeLoadError",this.type=r?.type??p.UNKNOWN}}o.A.set("NodeNotFoundError",l._),o.A.set("KeyError",l.e),o.A.set("VolumeLoadError",c),self.onmessage=async e=>{try{const r=await async function(e){const r=e.data.channel,t=e.data.tilesizex,o=e.data.tilesizey,a=e.data.sizez,i=e.data.sizec,s=e.data.dimensionOrder,u=e.data.bytesPerSample,f=await(0,n.uz)(e.data.url,{allowFullFile:!0});let l=0,y=1;"XYZCT"===s?(l=a*r,y=1):"XYCZT"===s&&(l=r,y=i);const d=await f.getImage(l),m=d.getSampleFormat(),b=d.getBytesPerPixel(),E=new ArrayBuffer(t*o*a*b),A=new Uint8Array(E);for(let e=l,r=0;r<a;e+=y,++r){const n=await f.getImage(e),a=await n.readRasters({width:t,height:o}),i=Array.isArray(a)?a[0]:a,s=r*t*o;if(i.BYTES_PER_ELEMENT>4)throw new c("byte size not supported yet: "+i.BYTES_PER_ELEMENT,{type:p.INVALID_METADATA});if(i.BYTES_PER_ELEMENT!==u)throw new c("tiff bytes per element mismatch with OME metadata",{type:p.INVALID_METADATA});A.set(new Uint8Array(i.buffer),s*i.BYTES_PER_ELEMENT)}const _=function(e,r,t){if(3===t){if(4===r)return new Float32Array(e)}else if(2===t){if(1===r)return new Int8Array(e);if(2===r)return new Int16Array(e);if(4===r)return new Int32Array(e)}else if(1===t){if(1===r)return new Uint8Array(e);if(2===r)return new Uint16Array(e);if(4===r)return new Uint32Array(e)}return console.error(`TIFF Worker: unsupported sample format ${t} and bytes per pixel ${r}`),new Uint8Array(e)}(E,b,m),h=function(e,r){if(3===e){if(4===r)return"float32"}else if(2===e){if(1===r)return"int8";if(2===r)return"int16";if(4===r)return"int32"}else if(1===e){if(1===r)return"uint8";if(2===r)return"uint16";if(4===r)return"uint32"}return console.error(`TIFF Worker: unsupported sample format ${e} and bytes per pixel ${r}`),"uint8"}(m,b);let w=_[0],O=_[0];for(let e=0;e<_.length;++e){const r=_[e];r<w&&(w=r),r>O&&(O=r)}return{data:_,channel:r,range:[w,O],dtype:h,isError:!1}}(e);self.postMessage(r,[r.data.buffer])}catch(e){self.postMessage({isError:!0,error:u(e)})}}}},n={};function o(e){var r=n[e];if(void 0!==r)return r.exports;var a=n[e]={exports:{}};return t[e](a,a.exports,o),a.exports}o.m=t,o.x=()=>{var e=o.O(void 0,[961],(()=>o(4389)));return o.O(e)},e=[],o.O=(r,t,n,a)=>{if(!t){var i=1/0;for(l=0;l<e.length;l++){for(var[t,n,a]=e[l],s=!0,u=0;u<t.length;u++)(!1&a||i>=a)&&Object.keys(o.O).every((e=>o.O[e](t[u])))?t.splice(u--,1):(s=!1,a<i&&(i=a));if(s){e.splice(l--,1);var f=n();void 0!==f&&(r=f)}}return r}a=a||0;for(var l=e.length;l>0&&e[l-1][2]>a;l--)e[l]=e[l-1];e[l]=[t,n,a]},o.d=(e,r)=>{for(var t in r)o.o(r,t)&&!o.o(e,t)&&Object.defineProperty(e,t,{enumerable:!0,get:r[t]})},o.f={},o.e=e=>Promise.all(Object.keys(o.f).reduce(((r,t)=>(o.f[t](e,r),r)),[])),o.u=e=>e+".bundle.js",o.miniCssF=e=>{},o.o=(e,r)=>Object.prototype.hasOwnProperty.call(e,r),o.r=e=>{"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(e,"__esModule",{value:!0})},o.p="/vole-app/pr-preview/pr-367/",(()=>{var e={283:1,647:1};o.f.i=(r,t)=>{e[r]||importScripts(o.p+o.u(r))};var r=self.webpackChunk_aics_vole_app=self.webpackChunk_aics_vole_app||[],t=r.push.bind(r);r.push=r=>{var[n,a,i]=r;for(var s in a)o.o(a,s)&&(o.m[s]=a[s]);for(i&&i(o);n.length;)e[n.pop()]=1;t(r)}})(),r=o.x,o.x=()=>o.e(961).then(r),o.x()})();
//# sourceMappingURL=647.bundle.js.map