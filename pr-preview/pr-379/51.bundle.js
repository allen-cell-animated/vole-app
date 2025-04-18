"use strict";(self.webpackChunk_aics_vole_app=self.webpackChunk_aics_vole_app||[]).push([[51],{4850:(t,e,s)=>{s.d(e,{A:()=>n});class n{constructor(t){this.dataMinBin=0,this.dataMaxBin=0,this.maxBin=0,this.bins=new Uint32Array,this.min=0,this.max=0,this.binSize=0;const e=n.calculateHistogram(t,256);this.bins=e.bins,this.min=e.min,this.max=e.max,this.binSize=e.binSize;for(let t=0;t<this.bins.length;t++)if(this.bins[t]>0){this.dataMinBin=t;break}for(let t=this.bins.length-1;t>=0;t--)if(this.bins[t]>0){this.dataMaxBin=t;break}this.pixelCount=t.length,this.maxBin=1;let s=this.bins[1];for(let t=1;t<this.bins.length;t++)this.bins[t]>s&&(this.maxBin=t,s=this.bins[t])}static findBin(t,e,s,n){let r=Math.floor((t-e)/s);return r===n&&r--,r}findBinOfValue(t){return n.findBin(t,this.min,this.binSize,256)}getDataMin(){return this.min}getDataMax(){return this.max}getMin(){return this.dataMinBin}getMax(){return this.dataMaxBin}getNumBins(){return this.bins.length}getBin(t){return this.bins[t]}getBinRange(t){return[this.min+t*this.binSize,this.min+(t+1)*this.binSize]}findBinOfPercentile(t){const e=this.pixelCount*t;let s=0,n=0;for(s=0;s<this.bins.length&&(n+=this.bins[s],!(n>e));++s);return s}findBestFitBins(){const t=this.pixelCount/10;let e=0,s=0;for(e=1;e<this.bins.length&&(s+=this.bins[e],!(s>t));++e);const n=e;for(s=0,e=this.bins.length-1;e>=1&&(s+=this.bins[e],!(s>t));--e);return[n,e]}findAutoIJBins(){const t=this.pixelCount,e=t/10,s=t/5e3;let n=this.bins.length-1,r=1;for(let t=1;t<this.bins.length;++t)if(this.bins[t]>s&&this.bins[t]<=e){n=t;break}for(let t=this.bins.length-1;t>=1;--t)if(this.bins[t]>s&&this.bins[t]<=e){r=t;break}return r<n&&(n=0,r=255),[n,r]}findAutoMinMax(){const t=Math.floor(.1*this.bins[this.maxBin]);let e=0,s=this.bins.length-1;for(let s=1;s<this.bins.length;++s)if(this.bins[s]>t){e=s;break}for(let e=this.bins.length-1;e>=1;--e)if(this.bins[e]>t){s=e;break}return[e,s]}static calculateHistogram(t,e=1){e<1&&(e=1);let s=t[0],r=t[0];for(let e=1;e<t.length;e++)t[e]<s?s=t[e]:t[e]>r&&(r=t[e]);const i=new Uint32Array(e).fill(0),a=(r-s)/e==0?1:(r-s)/e;for(let r=0;r<t.length;r++){const o=t[r];i[n.findBin(o,s,a,e)]++}return{bins:i,min:s,max:r,binSize:a}}}},9519:(t,e,s)=>{s.d(e,{Nl:()=>a,QX:()=>o,jI:()=>i});var n=s(4922);function r(t){return new n.Pq0(t.shape[4],t.shape[3],t.shape[2])}function i(){return{name:"",atlasTileDims:[1,1],subregionSize:[1,1,1],subregionOffset:[0,0,0],combinedNumChannels:1,channelNames:["0"],channelColors:[[255,255,255]],multiscaleLevel:0,multiscaleLevelDims:[{shape:[1,1,1,1,1],spacing:[1,1,1,1,1],spaceUnit:"",timeUnit:"",dataType:"uint8"}],transform:{translation:[0,0,0],rotation:[0,0,0],scale:[1,1,1]}}}class a{constructor(t){this.imageInfo=t||{name:"",atlasTileDims:[1,1],subregionSize:[1,1,1],subregionOffset:[0,0,0],combinedNumChannels:1,channelNames:["0"],channelColors:[[255,255,255]],multiscaleLevel:0,multiscaleLevelDims:[{shape:[1,1,1,1,1],spacing:[1,1,1,1,1],spaceUnit:"",timeUnit:"",dataType:"uint8"}],transform:{translation:[0,0,0],rotation:[0,0,0],scale:[1,1,1]}}}get currentLevelDims(){return this.imageInfo.multiscaleLevelDims[this.imageInfo.multiscaleLevel]}get numChannels(){return this.imageInfo.combinedNumChannels}get originalSize(){return r(this.imageInfo.multiscaleLevelDims[0])}get volumeSize(){return r(this.currentLevelDims)}get physicalPixelSize(){return t=this.imageInfo.multiscaleLevelDims[0],new n.Pq0(t.spacing[4],t.spacing[3],t.spacing[2]);var t}get spatialUnit(){return this.imageInfo.multiscaleLevelDims[0].spaceUnit}get times(){return this.currentLevelDims.shape[0]}get timeScale(){return this.currentLevelDims.spacing[0]}get timeUnit(){return this.currentLevelDims.timeUnit}get numMultiscaleLevels(){return this.imageInfo.multiscaleLevelDims.length}get channelNames(){return this.imageInfo.channelNames}get channelColors(){return this.imageInfo.channelColors}get subregionSize(){return new n.Pq0(...this.imageInfo.subregionSize)}get subregionOffset(){return new n.Pq0(...this.imageInfo.subregionOffset)}get multiscaleLevel(){return this.imageInfo.multiscaleLevel}get atlasTileDims(){return new n.I9Y(...this.imageInfo.atlasTileDims)}get transform(){return{translation:new n.Pq0(...this.imageInfo.transform.translation),rotation:new n.Pq0(...this.imageInfo.transform.rotation),scale:new n.Pq0(...this.imageInfo.transform.scale)}}}function o(t){const{atlasTileDims:e}=t,s=t.multiscaleLevelDims[t.multiscaleLevel];return[e[0]*s.shape[4],e[1]*s.shape[3]]}},3487:(t,e,s)=>{s.d(e,{A:()=>o});const n=t=>t.every((e=>e===t[0])),r=(t,e,s)=>{for(let n=0;n<s;n++)t.push(e)},i=t=>{const e=t>>1;return e+Number(0!==e)};function a(t,e){t<e[0]&&(e[0]=t),t>e[1]&&(e[1]=t)}class o{constructor(t,e,s,o,u=!1){const h=[[1/0,-1/0],[1/0,-1/0],[1/0,-1/0],[1/0,-1/0]];for(const e of t)a(e[0],h[0]),a(e[2],h[1]),a(e[3],h[2]),a(e[4],h[3]);this.directionStates=[],this.priorityDirectionStates=[];for(const[t,i]of h.flat().entries()){const a=t>>1,h=a+Number(0!==a);let c;if(1&t){const t=s.map((t=>Math.min(i+e[a],t[h]-1)));if(n(t))c=t[0];else{c=[];for(const[e,n]of t.entries())r(c,n,s[e][1])}}else c=Math.max(i-e[a],0);const l={direction:t,start:i,end:c,chunks:[]};o&&o.includes(t)?this.priorityDirectionStates.push(l):u||this.directionStates.push(l)}for(const e of t){for(const t of this.directionStates)e[i(t.direction)]===t.start&&t.chunks.push(e);for(const t of this.priorityDirectionStates)e[i(t.direction)]===t.start&&t.chunks.push(e)}}static*iterateDirections(t){let e=1;for(;t.length>0;){t=t.filter((t=>{const s=Array.isArray(t.end)?Math.max(...t.end):t.end;return 1&t.direction?t.start+e<=s:t.start-e>=s}));for(const s of t){const t=e*(1&s.direction?1:-1);for(const e of s.chunks){if(Array.isArray(s.end)&&e[i(s.direction)]+t>s.end[e[1]])continue;const n=e.slice();n[i(s.direction)]+=t,yield n}}e+=1}}*[Symbol.iterator](){if(this.priorityDirectionStates.length>0)for(const t of o.iterateDirections(this.priorityDirectionStates))yield t;for(const t of o.iterateDirections(this.directionStates))yield t}}},9345:(t,e,s)=>{s.d(e,{A:()=>n});const n=class{constructor(t,e,s){this.baseStore=t,this.cache=e,this.queue=s}set(t,e){return Promise.resolve()}async getAndCache(t,e,s){const n=await this.baseStore.get(t,s);return this.cache&&n&&this.cache.insert(e,n),n}async get(t,e){if(!this.cache||[".zarray",".zgroup",".zattrs","zarr.json"].some((e=>t.endsWith(e))))return this.baseStore.get(t,e?.options);e?.reportKey&&e.reportKey(t,e.subscriber);let s=this.baseStore.url??"";""===s||s instanceof URL||s.endsWith("/")||(s+="/");const n=s+t.slice(1),r=this.cache.get(n);return r?new Uint8Array(r):this.queue&&e?this.queue.addRequest(n,e.subscriber,(()=>this.getAndCache(t,n,e?.options)),e.isPrefetch):this.getAndCache(t,n,e?.options)}}},7710:(t,e,s)=>{s.d(e,{Di:()=>r,U0:()=>a,WC:()=>i,WD:()=>o,X_:()=>h,mU:()=>f,yH:()=>u});var n=s(471);function r(t){if(t.omeroMetadata?.channels)return t.omeroMetadata.channels.map((({label:e},s)=>e??`Channel ${s+t.channelOffset}`));const e=t.scaleLevels[0].shape[t.axesTCZYX[1]];return Array.from({length:e},((e,s)=>`Channel ${s+t.channelOffset}`))}const i=([t,e,s])=>2+Number(t>-1)+Number(e>-1)+Number(s>-1);function a(t){const e=[-1,-1,-1,-1,-1],s=["t","c","z","y","x"];t.forEach(((t,r)=>{const i=s.indexOf(t.name);if(!(i>-1))throw new n.nu(`Unrecognized axis in zarr: ${t.name}`,{type:n.f8.INVALID_METADATA});e[i]=r}));const r=-1===e[4];if(r||-1===e[3])throw new n.nu(`Did not find ${r?"an X":"a Y"} axis in zarr`,{type:n.f8.INVALID_METADATA});return e}function o(t,e){const s=i(e),r=Array(s);return e.forEach(((e,i)=>{if(e>=0){if(e>=s)throw new n.nu(`Unexpected axis index in zarr: ${e}`,{type:n.f8.INVALID_METADATA});r[e]=t[i]}})),r}function u(t,e,s){const r=[s,s,s,s,s];return e.forEach(((e,s)=>{if(e>=0){if(e>=t.length)throw new n.nu(`Unexpected axis index in zarr: ${e}`,{type:n.f8.INVALID_METADATA});r[s]=t[e]}})),r}function h(t,e){const s=t.coordinateTransformations;if(void 0===s)return console.warn("WARNING: OMEZarrLoader: no coordinate transformations for scale level."),[1,1,1,1,1];const n=s.find((t=>"scale"===t.type));return n?u(n.scale.slice(),e,1):(console.warn('WARNING: OMEZarrLoader: no coordinate transformation of type "scale" for scale level.'),[1,1,1,1,1])}function c(t,e,s,n){const r=(e[2]>-1?t.shape[e[2]]:1)-(n[2]>-1?s.shape[n[2]]:1),i=t.shape[e[3]]-s.shape[n[3]],a=t.shape[e[4]]-s.shape[n[4]];return 0===r&&0===i&&0===a?0:r<=0&&i<=0&&a<=0?-1:r>=0&&i>=0&&a>=0?1:void 0}const l=(t,e)=>Math.abs(t-e)<1e-5;function d(t,e,s,n){const r=h(t.multiscaleMetadata.datasets[e],t.axesTCZYX),i=h(s.multiscaleMetadata.datasets[n],s.axesTCZYX);return l(r[2],i[2])&&l(r[3],i[3])&&l(r[4],i[4])}function f(t){if(t.length<2)return;const e=Array.from({length:t.length},(()=>[])),s=Array.from({length:t.length},(()=>[])),r=new Array(t.length).fill(0);for(;r.every(((e,s)=>e<t[s].scaleLevels.length));){let i=!0,a=0,o=t[0],u=o.scaleLevels[r[0]];for(let e=1;e<t.length;e++){const s=t[e],h=s.scaleLevels[r[e]],l=c(u,o.axesTCZYX,h,s.axesTCZYX);if(l)i=!1,l>0&&(a=e,o=s,u=h);else{if(void 0===l)throw new n.nu("Incompatible zarr arrays: pixel dimensions are mismatched",{type:n.f8.INVALID_MULTI_SOURCE_ZARR});d(o,r[a],s,r[e])||console.warn("Incompatible zarr arrays: scale levels of equal size have different scale transformations");const t=o.axesTCZYX[0]>-1?u.shape[o.axesTCZYX[0]]:1,i=s.axesTCZYX[0]>-1?h.shape[s.axesTCZYX[0]]:1;t!==i&&console.warn(`Incompatible zarr arrays: different numbers of timesteps: ${t} vs ${i}`)}}if(i)for(let n=0;n<r.length;n++){const i=t[n],a=r[n];e[n].push(i.scaleLevels[a]),s[n].push(i.multiscaleMetadata.datasets[a]),r[n]+=1}else for(const[e,s]of r.entries()){const n=t[e],i=n.scaleLevels[s];0!==c(u,o.axesTCZYX,i,n.axesTCZYX)&&(r[e]+=1)}}if(0===t[0].scaleLevels.length)throw new n.nu("Incompatible zarr arrays: no sets of scale levels found that matched in all sources",{type:n.f8.INVALID_MULTI_SOURCE_ZARR});for(let n=0;n<t.length;n++)t[n].scaleLevels=e[n],t[n].multiscaleMetadata.datasets=s[n]}},4296:(t,e,s)=>{s.d(e,{G:()=>o});var n=s(471);function r(t,e){return"object"==typeof t&&null!==t&&e in t}function i(t,e,s="zarr"){if(!r(t,e))throw new n.nu(`${s} metadata is missing required entry "${e}"`,{type:n.f8.INVALID_METADATA})}function a(t,e,s="zarr"){if(!Array.isArray(t[e]))throw new n.nu(`${s} metadata entry "${e}" is not an array`,{type:n.f8.INVALID_METADATA})}function o(t,e=0,s="zarr"){i(t,"multiscales",s),a(t,"multiscales",s);const o=t.multiscales[e];if(!o)throw new n.nu(`${s} metadata does not have requested multiscale level ${e}`,{type:n.f8.INVALID_METADATA});const u=`${s} multiscale ${e}${r(o,"name")?` ("${o.name})`:""}`;i(o,"axes",u),a(o,"axes",u),o.axes.forEach(((t,e)=>i(t,"name",`${u} axis ${e}`))),i(o,"datasets",s),a(o,"datasets",s),o.datasets.forEach(((t,e)=>i(t,"path",`${u} dataset ${e}`)))}},5448:(t,e,s)=>{s.d(e,{A:()=>r});const n="request cancelled";class r{constructor(t=10,e=5){this.allRequests=new Map,this.activeRequests=new Set,this.queue=[],this.queueLowPriority=[],this.maxActiveRequests=t,this.maxLowPriorityRequests=Math.min(t,e)}registerRequest(t,e){let s,n;const r=new Promise(((t,e)=>{s=t,n=e})),i={key:t,action:e,resolve:s,reject:n,promise:r};return this.allRequests.set(t,i),i}addRequestToQueue(t,e){if(this.allRequests.has(t)){const s=this.allRequests.get(t);s&&s.timeoutId&&(clearTimeout(s.timeoutId),s.timeoutId=void 0),this.queue.includes(t)||this.queueLowPriority.includes(t)||(e?this.queueLowPriority.push(t):this.queue.push(t),this.dequeue())}}addRequest(t,e,s=!1,n=0){if(this.allRequests.has(t)){const e=this.queueLowPriority.indexOf(t);e>-1&&!s?(this.queueLowPriority.splice(e,1),this.addRequestToQueue(t)):n<=0&&this.addRequestToQueue(t,s)}else{const r=this.registerRequest(t,e);if(n>0){const e=setTimeout((()=>this.addRequestToQueue(t,s)),n);r.timeoutId=e}else this.addRequestToQueue(t,s)}const r=this.allRequests.get(t)?.promise;if(!r)throw new Error("Found no promise to return when getting stored request data.");return r}addRequests(t,e=!1,s=10){const n=[];for(let r=0;r<t.length;r++){const i=t[r],a=this.addRequest(i.key,i.requestAction,e,s*r);n.push(a)}return n}async dequeue(){const t=this.activeRequests.size;if(t>=this.maxActiveRequests||0===this.queue.length&&(t>=this.maxLowPriorityRequests||0===this.queueLowPriority.length))return;const e=this.queue.shift()??this.queueLowPriority.shift();if(!e)return;if(this.activeRequests.has(e))return void this.dequeue();const s=this.allRequests.get(e);if(!s)return;const n=s.key;this.activeRequests.add(n),await s.action().then(s.resolve,s.reject),this.activeRequests.delete(n),this.allRequests.delete(n),this.dequeue()}cancelRequest(t,e=n){if(!this.allRequests.has(t))return;const s=this.allRequests.get(t);s&&(s.timeoutId&&clearTimeout(s.timeoutId),s.reject(e));const r=this.queue.indexOf(t);if(r>-1)this.queue.splice(r,1);else{const e=this.queueLowPriority.indexOf(t);e>-1&&this.queueLowPriority.splice(e,1)}this.allRequests.delete(t),this.activeRequests.delete(t)}cancelAllRequests(t=n){this.queue=[],this.queueLowPriority=[];for(const e of this.allRequests.keys())this.cancelRequest(e,t)}hasRequest(t){return this.allRequests.has(t)}requestRunning(t){return this.activeRequests.has(t)}}},9565:(t,e,s)=>{s.d(e,{A:()=>r});var n=s(5448);class r{constructor(t,e){this.queue="number"==typeof t||void 0===t?new n.A(t,e):t,this.nextSubscriberId=0,this.subscribers=new Map,this.requests=new Map}resolveAll(t,e){const s=this.requests.get(t);if(s){for(const{resolve:n,subscriberId:r}of s)n(e),this.subscribers.get(r)?.delete(t);this.requests.delete(t)}}rejectAll(t,e){const s=this.requests.get(t);if(s){for(const{reject:n,subscriberId:r}of s)n(e),this.subscribers.get(r)?.delete(t);this.requests.delete(t)}}addSubscriber(){const t=this.nextSubscriberId;return this.nextSubscriberId++,this.subscribers.set(t,new Map),t}addRequest(t,e,s,n,r){if(this.queue.addRequest(t,s,n,r).then((e=>this.resolveAll(t,e))).catch((e=>this.rejectAll(t,e))),this.requests.has(t)||this.requests.set(t,[]),e>=this.nextSubscriberId||e<0)throw new Error(`SubscribableRequestQueue: subscriber id ${e} has not been registered`);if(!this.subscribers.get(e))throw new Error(`SubscribableRequestQueue: subscriber id ${e} has been removed`);return new Promise(((s,n)=>{this.requests.get(t)?.push({resolve:s,reject:n,subscriberId:e});const r=this.subscribers.get(e),i=r?.get(t);i?i.push(n):r?.set(t,[n])}))}rejectSubscription(t,e,s){e(s);const n=this.requests.get(t);if(!n)return;const r=n.findIndex((t=>t.reject===e));r>=0&&n.splice(r,1),n.length<1&&!this.queue.requestRunning(t)&&(this.queue.cancelRequest(t,s),this.requests.delete(t))}cancelRequest(t,e,s){const n=this.subscribers.get(e);if(!n)return!1;const r=n.get(t);if(!r||!r.length)return!1;for(const e of r)this.rejectSubscription(t,e,s);return n.delete(t),!0}removeSubscriber(t,e){const s=this.subscribers.get(t);if(s){for(const[t,n]of s.entries())for(const s of n)this.rejectSubscription(t,s,e);this.subscribers.delete(t)}}hasRequest(t){return this.queue.hasRequest(t)}requestRunning(t){return this.queue.requestRunning(t)}hasSubscriber(t){return this.subscribers.has(t)}isSubscribed(t,e){return this.subscribers.get(t)?.has(e)??!1}}},9177:(t,e,s)=>{s.d(e,{K2:()=>n,VC:()=>r,dE:()=>i});let n=function(t){return t[t.INIT=0]="INIT",t[t.CREATE_LOADER=1]="CREATE_LOADER",t[t.CREATE_VOLUME=2]="CREATE_VOLUME",t[t.LOAD_DIMS=3]="LOAD_DIMS",t[t.LOAD_VOLUME_DATA=4]="LOAD_VOLUME_DATA",t[t.SET_PREFETCH_PRIORITY_DIRECTIONS=5]="SET_PREFETCH_PRIORITY_DIRECTIONS",t[t.SYNCHRONIZE_MULTICHANNEL_LOADING=6]="SYNCHRONIZE_MULTICHANNEL_LOADING",t[t.UPDATE_FETCH_OPTIONS=7]="UPDATE_FETCH_OPTIONS",t}({}),r=function(t){return t[t.SUCCESS=0]="SUCCESS",t[t.ERROR=1]="ERROR",t[t.EVENT=2]="EVENT",t}({}),i=function(t){return t[t.METADATA_UPDATE=0]="METADATA_UPDATE",t[t.CHANNEL_LOAD=1]="CHANNEL_LOAD",t}({})},6238:(t,e,s)=>{s.d(e,{N:()=>r});var n=s(4922);function r(t){return{...t,subregion:new n.NRn((new n.Pq0).copy(t.subregion.min),(new n.Pq0).copy(t.subregion.max))}}},2463:(t,e,s)=>{s.d(e,{O3:()=>E,YJ:()=>b,aZ:()=>p,JD:()=>A,zr:()=>_});var n=s(9245),r=s(4901);function i(t){return t instanceof r.OZ||t instanceof r.Lk||t instanceof r.so?new Proxy(t,{get:(t,e)=>t.get(Number(e)),set:(t,e,s)=>(t.set(Number(e),s),!0)}):t}class a{configuration;kind="array_to_array";constructor(t){this.configuration=t}static fromConfig(t){return new a(t)}encode(t){return function(t){if(!t.stride)return"C";let e=(0,n.uV)(t.shape,"C");return t.stride.every(((t,s)=>t===e[s]))?"C":"F"}(t)===this.configuration.order?t:function(t,e){let s=function(t,e){let s;return s=t.data instanceof r.Lk||t.data instanceof r.so?new t.constructor(t.data.length,t.data.chars):new t.constructor(t.data.length),{data:s,shape:t.shape,stride:(0,n.uV)(t.shape,e)}}(t,e),a=t.shape.length,o=t.data.length,u=Array(a).fill(0),h=i(t.data),c=i(s.data);for(let e=0;e<o;e++){let n=0;for(let t=0;t<a;t++)n+=u[t]*s.stride[t];c[n]=h[e],u[0]+=1;for(let e=0;e<a;e++)if(u[e]===t.shape[e]){if(e+1===a)break;u[e]=0,u[e+1]+=1}}return s}(t,this.configuration.order)}decode(t){return t}}const o=function(){const t=new Uint32Array([305419896]);return!(18===new Uint8Array(t.buffer,t.byteOffset,t.byteLength)[0])}();function u(t){return"BYTES_PER_ELEMENT"in t?t.BYTES_PER_ELEMENT:4}class h{configuration;kind="array_to_bytes";#t;#e;#s;#n;constructor(t,e){this.configuration=t,this.#e=(0,n.zA)(e.data_type),this.#n=e.shape,this.#t=(0,n.uV)(e.shape,(0,n.Wd)(e.codecs)),this.#s=new this.#e(0).BYTES_PER_ELEMENT}static fromConfig(t,e){return new h(t,e)}encode(t){let e=new Uint8Array(t.data.buffer);return o&&"big"===this.configuration.endian&&(0,n.dq)(e,u(this.#e)),e}decode(t){return o&&"big"===this.configuration.endian&&(0,n.dq)(t,u(this.#e)),{data:new this.#e(t.buffer,t.byteOffset,t.byteLength/this.#s),shape:this.#n,stride:this.#t}}}class c{kind="bytes_to_bytes";constructor(){}static fromConfig(){return new c}encode(t){throw new Error("Not implemented")}decode(t){return new Uint8Array(t.buffer,t.byteOffset,t.byteLength-4)}}class l{kind="array_to_bytes";#n;#t;constructor(t){this.#n=t,this.#t=(0,n.uV)(t,"C")}static fromConfig(t,e){return new l(e.shape)}encode(t){throw new Error("Method not implemented.")}decode(t){let e=new TextDecoder,s=new DataView(t.buffer),n=Array(s.getUint32(0,!0)),r=4;for(let i=0;i<n.length;i++){let a=s.getUint32(r,!0);r+=4,n[i]=e.decode(t.buffer.slice(r,r+a)),r+=a}return{data:n,shape:this.#n,stride:this.#t}}}const d=(new Map).set("blosc",(()=>s.e(646).then(s.bind(s,5646)).then((t=>t.default)))).set("gzip",(()=>Promise.all([s.e(56),s.e(175)]).then(s.bind(s,9175)).then((t=>t.default)))).set("lz4",(()=>s.e(985).then(s.bind(s,8985)).then((t=>t.default)))).set("zlib",(()=>Promise.all([s.e(56),s.e(954)]).then(s.bind(s,6954)).then((t=>t.default)))).set("zstd",(()=>s.e(632).then(s.bind(s,5632)).then((t=>t.default)))).set("transpose",(()=>a)).set("endian",(()=>h)).set("crc32c",(()=>c)).set("vlen-utf8",(()=>l));function f(t){let e;return{async encode(s){e||(e=await g(t));for(const t of e.array_to_array)s=await t.encode(s);let n=await e.array_to_bytes.encode(s);for(const t of e.bytes_to_bytes)n=await t.encode(n);return n},async decode(s){e||(e=await g(t));for(let t=e.bytes_to_bytes.length-1;t>=0;t--)s=await e.bytes_to_bytes[t].decode(s);let n=await e.array_to_bytes.decode(s);for(let t=e.array_to_array.length-1;t>=0;t--)n=await e.array_to_array[t].decode(n);return n}}}async function g(t){let e=t.codecs.map((async t=>{let e=await(d.get(t.name)?.());if(!e)throw new Error(`Unknown codec: ${t.name}`);return{Codec:e,meta:t}})),s=[],n=h.fromConfig({endian:"little"},t),r=[];for await(let{Codec:i,meta:a}of e){let e=i.fromConfig(a.configuration,t);switch(e.kind){case"array_to_array":s.push(e);break;case"array_to_bytes":n=e;break;default:r.push(e)}}return{array_to_array:s,array_to_bytes:n,bytes_to_bytes:r}}const m=18446744073709551615n;function y(t,e,s,n){if(void 0===t.store.getRange)throw new Error("Store does not support range requests");let r=t.store.getRange.bind(t.store),i=e.map(((t,e)=>t/n.chunk_shape[e])),a=f({data_type:"uint64",shape:[...i,2],codecs:n.index_codecs}),o={};return async e=>{let n,u=e.map(((t,e)=>Math.floor(t/i[e]))),h=t.resolve(s(u)).path;if(h in o)n=o[h];else{let t=4,e=16*i.reduce(((t,e)=>t*e),1),s=await r(h,{suffixLength:e+t});n=o[h]=s?await a.decode(s):null}if(null===n)return;let{data:c,shape:l,stride:d}=n,f=e.map(((t,e)=>t%l[e])).reduce(((t,e,s)=>t+e*d[s]),0),g=c[f],y=c[f+1];return g!==m||y!==m?r(h,{offset:Number(g),length:Number(y)}):void 0}}class p{store;path;constructor(t,e="/"){this.store=t,this.path=e}resolve(t){let e=new URL(`file://${this.path.endsWith("/")?this.path:`${this.path}/`}`);return new p(this.store,new URL(t,e).pathname)}}function _(t){return new p(t??new Map)}class b extends p{kind="group";#r;constructor(t,e,s){super(t,e),this.#r=s}get attrs(){return this.#r.attributes}}const w=Symbol("zarrita.context");function A(t){return t[w]}class E extends p{kind="array";#r;[w];constructor(t,e,s){super(t,e),this.#r={...s,fill_value:(0,n.HM)(s)},this[w]=function(t,e){let{configuration:s}=e.codecs.find(n.X)??{},r={encode_chunk_key:(0,n.c7)(e.chunk_key_encoding),TypedArray:(0,n.zA)(e.data_type),fill_value:e.fill_value};if(s){let i=(0,n.Wd)(s.codecs);return{...r,kind:"sharded",chunk_shape:s.chunk_shape,codec:f({data_type:e.data_type,shape:s.chunk_shape,codecs:s.codecs}),get_strides:(t,e)=>(0,n.uV)(t,e??i),get_chunk_bytes:y(t,e.chunk_grid.configuration.chunk_shape,r.encode_chunk_key,s)}}let i=(0,n.Wd)(e.codecs);return{...r,kind:"regular",chunk_shape:e.chunk_grid.configuration.chunk_shape,codec:f({data_type:e.data_type,shape:e.chunk_grid.configuration.chunk_shape,codecs:e.codecs}),get_strides:(t,e)=>(0,n.uV)(t,e??i),async get_chunk_bytes(e,s){let n=r.encode_chunk_key(e),i=t.resolve(n).path;return t.store.get(i,s)}}}(this,s)}get attrs(){return this.#r.attributes}get shape(){return this.#r.shape}get chunks(){return this[w].chunk_shape}get dtype(){return this.#r.data_type}async getChunk(t,e){let s=this[w],n=await s.get_chunk_bytes(t,e);if(!n){let t=s.chunk_shape.reduce(((t,e)=>t*e),1),e=new s.TypedArray(t);return e.fill(s.fill_value),{data:e,shape:s.chunk_shape,stride:s.get_strides(s.chunk_shape)}}return s.codec.decode(n)}is(t){return(0,n.mf)(this.dtype,t)}}},649:(t,e,s)=>{s.d(e,{h:()=>c});var n=s(2463),r=s(9698),i=s(9245);async function a(t,e={}){let s="store"in t?t:new n.aZ(t),a={};return(e.attrs??1)&&(a=await async function(t){let e=await t.store.get(t.resolve(".zattrs").path);return e?(0,i.eg)(e):{}}(s)),"array"===e.kind?o(s,a):"group"===e.kind?u(s,a):o(s,a).catch((t=>{if(t instanceof r._)return u(s,a);throw t}))}async function o(t,e){let{path:s}=t.resolve(".zarray"),a=await t.store.get(s);if(!a)throw new r._(s);return new n.O3(t.store,t.path,(0,i.PQ)((0,i.eg)(a),e))}async function u(t,e){let{path:s}=t.resolve(".zgroup"),a=await t.store.get(s);if(!a)throw new r._(s);return new n.YJ(t.store,t.path,(0,i.NO)((0,i.eg)(a),e))}async function h(t,e={}){let s="store"in t?t:new n.aZ(t),a=await async function(t){let{store:e,path:s}=t.resolve("zarr.json"),a=await t.store.get(s);if(!a)throw new r._(s);let o=(0,i.eg)(a);return"array"!==o.node_type||"uint64"!==o.data_type&&"int64"!==o.data_type||null==o.fill_value||(o.fill_value=BigInt(o.fill_value)),"array"===o.node_type?new n.O3(e,t.path,o):new n.YJ(e,t.path,o)}(s);if(void 0===e.kind)return a;if("array"===e.kind&&a instanceof n.O3)return a;if("group"===e.kind&&a instanceof n.YJ)return a;let o=a instanceof n.O3?"array":"group";throw new Error(`Expected node of kind ${e.kind}, found ${o}.`)}async function c(t,e={}){return h(t,e).catch((s=>{if(s instanceof r._)return a(t,e);throw s}))}c.v2=a,c.v3=h},9245:(t,e,s)=>{s.d(e,{HM:()=>b,NO:()=>y,PQ:()=>m,Wd:()=>f,X:()=>_,c7:()=>d,dq:()=>i,eg:()=>r,mf:()=>p,uV:()=>h,zA:()=>u});var n=s(4901);function r(t){const e=(new TextDecoder).decode(t);return JSON.parse(e)}function i(t,e){const s=e/2,n=e-1;let r=0;for(let i=0;i<t.length;i+=e)for(let e=0;e<s;e+=1)r=t[i+e],t[i+e]=t[i+n-e],t[i+n-e]=r}const a={int8:Int8Array,int16:Int16Array,int32:Int32Array,int64:globalThis.BigInt64Array,uint8:Uint8Array,uint16:Uint16Array,uint32:Uint32Array,uint64:globalThis.BigUint64Array,float32:Float32Array,float64:Float64Array,bool:n.OZ},o=/v2:([US])(\d+)/;function u(t){if("v2:object"===t)return globalThis.Array;let e=t.match(o);if(e){let[,t,s]=e;return("U"===t?n.so:n.Lk).bind(null,Number(s))}let s=a[t];if(!s)throw new Error(`Unknown or unsupported data_type: ${t}`);return s}function h(t,e){return("C"===e?c:l)(t)}function c(t){const e=t.length,s=globalThis.Array(e);for(let n=e-1,r=1;n>=0;n--)s[n]=r,r*=t[n];return s}function l(t){const e=t.length,s=globalThis.Array(e);for(let n=0,r=1;n<e;n++)s[n]=r,r*=t[n];return s}function d({name:t,configuration:e}){if("default"===t)return t=>["c",...t].join(e.separator);if("v2"===t)return t=>t.join(e.separator)||"0";throw new Error(`Unknown chunk key encoding: ${t}`)}function f(t){const e=t.find((t=>"transpose"===t.name));return"F"===e?.configuration?.order?"F":"C"}const g=/^([<|>])(.*)$/;function m(t,e={}){let s=[],n=function(t){if("|O"===t)return{data_type:"v2:object"};let e=t.match(g);if(!e)throw new Error(`Invalid dtype: ${t}`);let[,s,n]=e,r={b1:"bool",i1:"int8",u1:"uint8",i2:"int16",u2:"uint16",i4:"int32",u4:"uint32",i8:"int64",u8:"uint64",f4:"float32",f8:"float64"}[n]??(n.startsWith("S")||n.startsWith("U")?`v2:${n}`:void 0);if(!r)throw new Error(`Unsupported or unknown dtype: ${t}`);return"|"===s?{data_type:r}:{data_type:r,endian:"<"===s?"little":"big"}}(t.dtype);"F"===t.order&&s.push({name:"transpose",configuration:{order:"F"}}),"endian"in n&&"big"===n.endian&&s.push({name:"endian",configuration:{endian:"big"}});for(let{id:e,...n}of t.filters??[])s.push({name:e,configuration:n});if(t.compressor){let{id:e,...n}=t.compressor;s.push({name:e,configuration:n})}return{zarr_format:3,node_type:"array",shape:t.shape,data_type:n.data_type,chunk_grid:{name:"regular",configuration:{chunk_shape:t.chunks}},chunk_key_encoding:{name:"v2",configuration:{separator:t.dimension_separator??"."}},codecs:s,fill_value:t.fill_value,attributes:e}}function y(t,e={}){return{zarr_format:3,node_type:"group",attributes:e}}function p(t,e){if("number"!==e&&"bigint"!==e&&"boolean"!==e&&"object"!==e&&"string"!==e)return t===e;let s="bool"===t;if("boolean"===e)return s;let n=t.startsWith("v2:U")||t.startsWith("v2:S");if("string"===e)return n;let r="int64"===t||"uint64"===t;if("bigint"===e)return r;let i="v2:object"===t;return"object"===e?i:!(n||r||s||i)}function _(t){return"sharding_indexed"===t?.name}function b(t){return"uint64"!==t.data_type&&"int64"!==t.data_type||null==t.fill_value?t.fill_value:BigInt(t.fill_value)}Symbol("v2")},1548:(t,e,s)=>{s.d(e,{Jt:()=>m});var n=s(4901),r=s(2463),i=s(9698),a=s(8634);class o extends Error{constructor(t){super(t),this.name="IndexError"}}class u{dim_sel;dim_len;dim_chunk_len;nitems;constructor({dim_sel:t,dim_len:e,dim_chunk_len:s}){t=function(t,e){return(t=Math.trunc(t))<0&&(t=e+t),(t>=e||t<0)&&function(t){throw new o(`index out of bounds for dimension with length ${t}`)}(e),t}(t,e),this.dim_sel=t,this.dim_len=e,this.dim_chunk_len=s,this.nitems=1}*[Symbol.iterator](){const t=Math.floor(this.dim_sel/this.dim_chunk_len),e=t*this.dim_chunk_len,s=this.dim_sel-e;yield{dim_chunk_ix:t,dim_chunk_sel:s}}}class h{start;stop;step;dim_len;dim_chunk_len;nitems;nchunks;constructor({dim_sel:t,dim_len:e,dim_chunk_len:s}){const[n,r,i]=t.indices(e);this.start=n,this.stop=r,this.step=i,this.step<1&&function(){throw new o("only slices with step >= 1 are supported")}(),this.dim_len=e,this.dim_chunk_len=s,this.nitems=Math.max(0,Math.ceil((this.stop-this.start)/this.step)),this.nchunks=Math.ceil(this.dim_len/this.dim_chunk_len)}*[Symbol.iterator](){const t=Math.floor(this.start/this.dim_chunk_len),e=Math.ceil(this.stop/this.dim_chunk_len);for(const s of(0,a.y1)(t,e)){const t=s*this.dim_chunk_len,e=Math.min(this.dim_len,(s+1)*this.dim_chunk_len),n=e-t;let r=0,i=0;if(this.start<t){const e=(t-this.start)%this.step;e&&(i+=this.step-e),r=Math.ceil((t-this.start)/this.step)}else i=this.start-t;const a=this.stop>e?n:this.stop-t,o=[i,a,this.step],u=[r,r+Math.ceil((a-i)/this.step),1];yield{dim_chunk_ix:s,dim_chunk_sel:o,dim_out_sel:u}}}}class c{dim_indexers;shape;constructor({selection:t,shape:e,chunk_shape:s}){this.dim_indexers=function(t,e){let s=[];return null===t?s=e.map((t=>(0,a.di)(null))):Array.isArray(t)&&(s=t.map((t=>t??(0,a.di)(null)))),function(t,e){t.length>e.length&&function(t,e){throw new o(`too many indicies for array; expected ${e.length}, got ${t.length}`)}(t,e)}(s,e),s}(t,e).map(((t,n)=>new("number"==typeof t?u:h)({dim_sel:t,dim_len:e[n],dim_chunk_len:s[n]}))),this.shape=this.dim_indexers.filter((t=>t instanceof h)).map((t=>t.nitems))}*[Symbol.iterator](){for(const t of(0,a.qM)(...this.dim_indexers)){const e=t.map((t=>t.dim_chunk_ix)),s=t.map((t=>"dim_out_sel"in t?{from:t.dim_chunk_sel,to:t.dim_out_sel}:{from:t.dim_chunk_sel,to:null}));yield{chunk_coords:e,mapping:s}}}}function l(t,e=0,s){let n=s??t.length-e;return new Proxy(t,{get(t,s){let r=+s;return Number.isNaN(r)?"subarray"===s?(s,r=n)=>l(t,e+s,r-s):"set"===s?(s,n)=>{for(let r=0;r<s.length;r++)t[e+n+r]=s[r]}:Reflect.get(t,s):t[e+r]},set:(t,s,n)=>(t[e+Number(s)]=n,!0)})}function d(t){const e=t.constructor.bind(null,t.chars);return new Proxy(t,{get(s,n){let r=+n;return Number.isNaN(r)?"subarray"===n?(n,r=t.length)=>d(new e(s.buffer,s.byteOffset+t.BYTES_PER_ELEMENT*n,r-n)):"set"===n?(t,e)=>{for(let n=0;n<t.length;n++)s.set(e+n,t.get(n))}:"fill"===n?(t,e,n)=>{for(let r=e;r<n;r++)s.set(r,t)}:Reflect.get(s,n):s.get(r)},set:(t,e,s)=>(t.set(Number(e),s),!0)})}function f(t){let e=t.data;return t.data instanceof n.OZ?e=new Uint8Array(t.data.buffer):t.data instanceof n.Lk||t.data instanceof n.so?e=d(t.data):t.data instanceof globalThis.Array&&(e=l(t.data)),{data:e,stride:t.stride}}const g={prepare:(t,e,s)=>({data:t,shape:e,stride:s}),set_scalar(t,e,s){p(f(t),e,function(t,e){return t.data instanceof n.OZ?e?1:0:e}(t,s))},set_from_chunk(t,e,s){_(f(t),f(e),s)}};async function m(t,e=null,s={}){return async function(t,e,s,n){const o=(0,r.JD)(t),u=new c({selection:e,shape:t.shape,chunk_shape:t.chunks}),h=n.prepare(new o.TypedArray(u.shape.reduce(((t,e)=>t*e),1)),u.shape,o.get_strides(u.shape,s.order)),l=s.create_queue?.()??(0,a.XB)();for(const{chunk_coords:e,mapping:r}of u)l.add((()=>t.getChunk(e,s.opts).then((({data:t,shape:e,stride:s})=>{const i=n.prepare(t,e,s);n.set_from_chunk(h,i,r)})).catch((t=>{if(!(t instanceof i.e))throw t;o.fill_value&&n.set_scalar(h,r.map((t=>t.to)).filter((t=>null!==t)),o.fill_value)}))));return await l.onIdle(),0===u.shape.length?function(t){return"get"in t?t.get(0):t[0]}(h.data):h}(t,e,s,g)}function y(t,e,s){return s<0&&e<t?Math.floor((t-e-1)/-s)+1:t<e?Math.floor((e-t-1)/s)+1:0}function p(t,e,s){if(0===e.length)return void(t.data[0]=s);const[n,...r]=e,[i,...a]=t.stride;if("number"==typeof n)return void p({data:t.data.subarray(i*n),stride:a},r,s);const[o,u,h]=n,c=y(o,u,h);if(0!==r.length)for(let e=0;e<c;e++)p({data:t.data.subarray(i*(o+h*e)),stride:a},r,s);else if(1===h&&1===i)t.data.fill(s,o,o+c);else for(let e=0;e<c;e++)t.data[i*(o+h*e)]=s}function _(t,e,s){const[n,...r]=s,[i,...a]=t.stride,[o,...u]=e.stride;if(null===n.from)return 0===r.length?void(t.data[n.to]=e.data[0]):void _({data:t.data.subarray(i*n.to),stride:a},e,r);if(null===n.to)return 0===r.length?void(t.data[0]=e.data[n.from]):void _(t,{data:e.data.subarray(o*n.from),stride:u},r);const[h,c,l]=n.to,[d,f,g]=n.from,m=y(h,c,l);if(0!==r.length)for(let s=0;s<m;s++)_({data:t.data.subarray(i*(h+s*l)),stride:a},{data:e.data.subarray(o*(d+s*g)),stride:u},r);else if(1===l&&1===g&&1===i&&1===o)t.data.set(e.data.subarray(d,d+m),h);else for(let s=0;s<m;s++)t.data[i*(h+l*s)]=e.data[o*(d+g*s)]}},8634:(t,e,s)=>{function*n(t,e,s=1){void 0===e&&(e=t,t=0);for(let n=t;n<e;n+=s)yield n}function*r(...t){if(0===t.length)return;const e=t.map((t=>t[Symbol.iterator]())),s=e.map((t=>t.next()));if(s.some((t=>t.done)))throw new Error("Input contains an empty iterator.");for(let n=0;;){if(s[n].done){if(e[n]=t[n][Symbol.iterator](),s[n]=e[n].next(),++n>=e.length)return}else yield s.map((({value:t})=>t)),n=0;s[n]=e[n].next()}}function i(t,e,s=null){return void 0===e&&(e=t,t=null),{start:t,stop:e,step:s,indices(t){return function(t,e,s,n){if(0===s)throw new Error("slice step cannot be zero");const r=(s=s??1)<0,[i,a]=r?[-1,n-1]:[0,n];return null===t?t=r?a:i:t<0?(t+=n)<i&&(t=i):t>a&&(t=a),null===e?e=r?i:a:e<0?(e+=n)<i&&(e=i):e>a&&(e=a),[t,e,s]}(this.start,this.stop,this.step,t)}}}function a(){const t=[];return{add:e=>t.push(e()),onIdle:()=>Promise.all(t)}}s.d(e,{XB:()=>a,di:()=>i,qM:()=>r,y1:()=>n})},3586:(t,e,s)=>{function n(t,e,s,n={}){return void 0!==e&&void 0!==s&&(n={...n,headers:{...n.headers,Range:`bytes=${e}-${e+s-1}`}}),fetch(t,n)}function r(t,e){const s="string"==typeof t?new URL(t):t;s.pathname.endsWith("/")||(s.pathname+="/");const n=new URL(e.slice(1),s);return n.search=s.search,n}async function i(t){if(404!==t.status&&403!==t.status){if(200==t.status||206==t.status)return new Uint8Array(await t.arrayBuffer());throw new Error(`Unexpected response status ${t.status} ${t.statusText}`)}}s.d(e,{A:()=>a});const a=class{url;#i;#a;constructor(t,e={}){this.url=t,this.#i=e.overrides??{},this.#a=e.useSuffixRequest??!1}#o(t){return{...this.#i,...t,headers:{...this.#i.headers,...t.headers}}}async get(t,e={}){let s=r(this.url,t).href;return i(await fetch(s,this.#o(e)))}async getRange(t,e,s={}){let a,o=r(this.url,t),u=this.#o(s);return a="suffixLength"in e?await async function(t,e,s,r){if(r)return fetch(t,{...s,headers:{...s.headers,Range:`bytes=-${e}`}});let i=await fetch(t,{...s,method:"HEAD"});if(!i.ok)return i;let a=i.headers.get("Content-Length"),o=Number(a);return n(t,o-e,o,s)}(o,e.suffixLength,u,this.#a):await n(o,e.offset,e.length,u),i(a)}}},4901:(t,e,s)=>{s.d(e,{Lk:()=>r,OZ:()=>n,so:()=>i});class n{#u;constructor(t,e,s){"number"==typeof t?this.#u=new Uint8Array(t):t instanceof ArrayBuffer?this.#u=new Uint8Array(t,e,s):this.#u=new Uint8Array(Array.from(t,(t=>t?1:0)))}get BYTES_PER_ELEMENT(){return 1}get byteOffset(){return this.#u.byteOffset}get byteLength(){return this.#u.byteLength}get buffer(){return this.#u.buffer}get length(){return this.#u.length}get(t){let e=this.#u[t];return"number"==typeof e?0!==e:e}set(t,e){this.#u[t]=e?1:0}fill(t){this.#u.fill(t?1:0)}*[Symbol.iterator](){for(let t=0;t<this.length;t++)yield this.get(t)}}class r{_data;constructor(t,e,s,n){if(this.chars=t,"number"==typeof e)this._data=new Uint8Array(e*t);else if(e instanceof ArrayBuffer)n&&(n*=t),this._data=new Uint8Array(e,s,n);else{let s=Array.from(e);this._data=new Uint8Array(s.length*t);for(let t=0;t<s.length;t++)this.set(t,s[t])}}get BYTES_PER_ELEMENT(){return this.chars}get byteOffset(){return this._data.byteOffset}get byteLength(){return this._data.byteLength}get buffer(){return this._data.buffer}get length(){return this.byteLength/this.BYTES_PER_ELEMENT}get(t){const e=new Uint8Array(this.buffer,this.byteOffset+this.chars*t,this.chars);return(new TextDecoder).decode(e).replace(/\x00/g,"")}_encode(t){return(new TextEncoder).encode(t)}set(t,e){const s=new Uint8Array(this.buffer,this.byteOffset+this.chars*t,this.chars);s.fill(0),s.set(this._encode(e))}fill(t){const e=this._encode(t);for(let t=0;t<this.length;t++)this._data.set(e,t*this.chars)}*[Symbol.iterator](){for(let t=0;t<this.length;t++)yield this.get(t)}}class i{_data;constructor(t,e,s,n){if(this.chars=t,"number"==typeof e)this._data=new Int32Array(e*t);else if(e instanceof ArrayBuffer)n&&(n*=t),this._data=new Int32Array(e,s,n);else{const t=e,s=this._encode.bind(this);this._data=new Int32Array(function*(){for(let e of t){let t=s(e);yield*t}}())}}get BYTES_PER_ELEMENT(){return this._data.BYTES_PER_ELEMENT*this.chars}get byteLength(){return this._data.byteLength}get byteOffset(){return this._data.byteOffset}get buffer(){return this._data.buffer}get length(){return this._data.length/this.chars}_encode(t){let e=new Int32Array(this.chars);for(let s=0;s<this.chars;s++)e[s]=t.codePointAt(s)??0;return e}get(t){const e=this.chars*t;let s="";for(let t=0;t<this.chars;t++)s+=String.fromCodePoint(this._data[e+t]);return s.replace(/\u0000/g,"")}set(t,e){const s=this.chars*t,n=this._data.subarray(s,s+this.chars);n.fill(0),n.set(this._encode(e))}fill(t){const e=this._encode(t);for(let t=0;t<this.length;t++)this._data.set(e,t*this.chars)}*[Symbol.iterator](){for(let t=0;t<this.length;t++)yield this.get(t)}}}}]);
//# sourceMappingURL=51.bundle.js.map