import{a as e}from"./rolldown-runtime-B0Z9INg1.js";import{B as t,C as n,S as r,n as i,r as a,t as o}from"./LoadModal-Od5Y5SEh.js";import{G as s,Tt as c,X as l,_ as u,c as d,d as f,fn as p,g as m,gn as h,i as g,lt as _,m as v,mn as y,n as b,o as x,on as S,s as C,tt as w,u as T,w as E}from"./main-BbByPK12.js";var D=e=>{let{componentCls:t}=e;return{[t]:{"&-horizontal":{[`&${t}`]:{"&-sm":{marginBlock:e.marginXS},"&-md":{marginBlock:e.margin}}}}}},O=e=>{let{componentCls:t,sizePaddingEdgeHorizontal:n,colorSplit:r,lineWidth:i,textPaddingInline:a,orientationMargin:o,verticalMarginInline:s}=e;return{[t]:Object.assign(Object.assign({},l(e)),{borderBlockStart:`${c(i)} solid ${r}`,"&-vertical":{position:`relative`,top:`-0.06em`,display:`inline-block`,height:`0.9em`,marginInline:s,marginBlock:0,verticalAlign:`middle`,borderTop:0,borderInlineStart:`${c(i)} solid ${r}`},"&-horizontal":{display:`flex`,clear:`both`,width:`100%`,minWidth:`100%`,margin:`${c(e.marginLG)} 0`},[`&-horizontal${t}-with-text`]:{display:`flex`,alignItems:`center`,margin:`${c(e.dividerHorizontalWithTextGutterMargin)} 0`,color:e.colorTextHeading,fontWeight:500,fontSize:e.fontSizeLG,whiteSpace:`nowrap`,textAlign:`center`,borderBlockStart:`0 ${r}`,"&::before, &::after":{position:`relative`,width:`50%`,borderBlockStart:`${c(i)} solid transparent`,borderBlockStartColor:`inherit`,borderBlockEnd:0,transform:`translateY(50%)`,content:`''`}},[`&-horizontal${t}-with-text-start`]:{"&::before":{width:`calc(${o} * 100%)`},"&::after":{width:`calc(100% - ${o} * 100%)`}},[`&-horizontal${t}-with-text-end`]:{"&::before":{width:`calc(100% - ${o} * 100%)`},"&::after":{width:`calc(${o} * 100%)`}},[`${t}-inner-text`]:{display:`inline-block`,paddingBlock:0,paddingInline:a},"&-dashed":{background:`none`,borderColor:r,borderStyle:`dashed`,borderWidth:`${c(i)} 0 0`},[`&-horizontal${t}-with-text${t}-dashed`]:{"&::before, &::after":{borderStyle:`dashed none none`}},[`&-vertical${t}-dashed`]:{borderInlineStartWidth:i,borderInlineEnd:0,borderBlockStart:0,borderBlockEnd:0},"&-dotted":{background:`none`,borderColor:r,borderStyle:`dotted`,borderWidth:`${c(i)} 0 0`},[`&-horizontal${t}-with-text${t}-dotted`]:{"&::before, &::after":{borderStyle:`dotted none none`}},[`&-vertical${t}-dotted`]:{borderInlineStartWidth:i,borderInlineEnd:0,borderBlockStart:0,borderBlockEnd:0},[`&-plain${t}-with-text`]:{color:e.colorText,fontWeight:`normal`,fontSize:e.fontSize},[`&-horizontal${t}-with-text-start${t}-no-default-orientation-margin-start`]:{"&::before":{width:0},"&::after":{width:`100%`},[`${t}-inner-text`]:{paddingInlineStart:n}},[`&-horizontal${t}-with-text-end${t}-no-default-orientation-margin-end`]:{"&::before":{width:`100%`},"&::after":{width:0},[`${t}-inner-text`]:{paddingInlineEnd:n}}})}},k=s(`Divider`,e=>{let t=w(e,{dividerHorizontalWithTextGutterMargin:e.margin,sizePaddingEdgeHorizontal:0});return[O(t),D(t)]},e=>({textPaddingInline:`1em`,orientationMargin:.05,verticalMarginInline:e.marginXS}),{unitless:{orientationMargin:!0}}),A=e(h()),ee=e(S()),j=function(e,t){var n={};for(var r in e)Object.prototype.hasOwnProperty.call(e,r)&&t.indexOf(r)<0&&(n[r]=e[r]);if(e!=null&&typeof Object.getOwnPropertySymbols==`function`)for(var i=0,r=Object.getOwnPropertySymbols(e);i<r.length;i++)t.indexOf(r[i])<0&&Object.prototype.propertyIsEnumerable.call(e,r[i])&&(n[r[i]]=e[r[i]]);return n},M={small:`sm`,middle:`md`},N=e=>{let{getPrefixCls:t,direction:n,className:r,style:i}=_(`divider`),{prefixCls:a,type:o=`horizontal`,orientation:s=`center`,orientationMargin:c,className:l,rootClassName:u,children:d,dashed:f,variant:p=`solid`,plain:m,style:h,size:g}=e,v=j(e,[`prefixCls`,`type`,`orientation`,`orientationMargin`,`className`,`rootClassName`,`children`,`dashed`,`variant`,`plain`,`style`,`size`]),y=t(`divider`,a),[b,x,S]=k(y),C=M[E(g)],w=!!d,T=A.useMemo(()=>s===`left`?n===`rtl`?`end`:`start`:s===`right`?n===`rtl`?`start`:`end`:s,[n,s]),D=T===`start`&&c!=null,O=T===`end`&&c!=null,N=(0,ee.default)(y,r,x,S,`${y}-${o}`,{[`${y}-with-text`]:w,[`${y}-with-text-${T}`]:w,[`${y}-dashed`]:!!f,[`${y}-${p}`]:p!==`solid`,[`${y}-plain`]:!!m,[`${y}-rtl`]:n===`rtl`,[`${y}-no-default-orientation-margin-start`]:D,[`${y}-no-default-orientation-margin-end`]:O,[`${y}-${C}`]:!!C},l,u),P=A.useMemo(()=>typeof c==`number`?c:/^\d+$/.test(c)?Number(c):c,[c]),F={marginInlineStart:D?P:void 0,marginInlineEnd:O?P:void 0};return b(A.createElement(`div`,Object.assign({className:N,style:Object.assign(Object.assign({},i),h)},v,{role:`separator`}),d&&o!==`vertical`&&A.createElement(`span`,{className:`${y}-inner-text`,style:F},d)))},P=new URL(`banner-video-CC9MkvaF.mp4`,import.meta.url).href,F=v(),I={viewerChannelSettings:{maskChannelName:``,groups:[{name:`Channels`,channels:[{match:[0],enabled:!0,lut:[`autoij`,`autoij`],color:`C3C3C3`},{match:[1],enabled:!1},{match:[2],enabled:!0,colorizeEnabled:!0}]}]},viewerSettings:{viewMode:r.xy,density:2.5}},L=[{name:`hiPSC FOV-nuclei timelapse datasets`,inReview:!1,description:(0,F.jsxs)(`p`,{children:[`3D timelapses of nuclei in growing hiPS cell colonies of three different starting sizes. Timelapse datasets include 3D transmitted-light bright-field and lamin B1-mEGFP fluorescence 20x images and 3D nuclear segmentation images. These datasets are`,` `,(0,F.jsx)(x,{href:`https://open.quiltdata.com/b/allencell/tree/aics/nuc-morph-dataset/hipsc_fov_nuclei_timelapse_dataset/hipsc_fov_nuclei_timelapse_data_used_for_analysis/baseline_colonies_fov_timelapse_dataset/`,children:`available for download on Quilt`}),` `,`.`]}),publicationInfo:{url:new URL(`https://doi.org/10.1016/j.cels.2025.101265`),name:`Colony context and size-dependent compensation mechanisms give rise to variations in nuclear growth trajectories`,citation:`Cell Systems, May 2025`},datasets:[{name:`Small colony`,loadParams:{imageUrl:{scenes:[[`https://allencell.s3.amazonaws.com/aics/nuc-morph-dataset/hipsc_fov_nuclei_timelapse_dataset/hipsc_fov_nuclei_timelapse_data_used_for_analysis/baseline_colonies_fov_timelapse_dataset/20200323_09_small/raw.ome.zarr`,`https://allencell.s3.amazonaws.com/aics/nuc-morph-dataset/hipsc_fov_nuclei_timelapse_dataset/hipsc_fov_nuclei_timelapse_data_used_for_analysis/baseline_colonies_fov_timelapse_dataset/20200323_09_small/seg.ome.zarr`]]},cellId:``,imageDownloadHref:``,parentImageDownloadHref:``,...I},hideTitle:!0},{name:`Medium colony`,loadParams:{imageUrl:{scenes:[[`https://allencell.s3.amazonaws.com/aics/nuc-morph-dataset/hipsc_fov_nuclei_timelapse_dataset/hipsc_fov_nuclei_timelapse_data_used_for_analysis/baseline_colonies_fov_timelapse_dataset/20200323_06_medium/raw.ome.zarr`,`https://allencell.s3.amazonaws.com/aics/nuc-morph-dataset/hipsc_fov_nuclei_timelapse_dataset/hipsc_fov_nuclei_timelapse_data_used_for_analysis/baseline_colonies_fov_timelapse_dataset/20200323_06_medium/seg.ome.zarr`]]},cellId:``,imageDownloadHref:``,parentImageDownloadHref:``,...I},hideTitle:!0},{name:`Large colony`,loadParams:{imageUrl:{scenes:[[`https://allencell.s3.amazonaws.com/aics/nuc-morph-dataset/hipsc_fov_nuclei_timelapse_dataset/hipsc_fov_nuclei_timelapse_data_used_for_analysis/baseline_colonies_fov_timelapse_dataset/20200323_05_large/raw.ome.zarr`,`https://allencell.s3.amazonaws.com/aics/nuc-morph-dataset/hipsc_fov_nuclei_timelapse_dataset/hipsc_fov_nuclei_timelapse_data_used_for_analysis/baseline_colonies_fov_timelapse_dataset/20200323_05_large/seg.ome.zarr`]]},cellId:``,imageDownloadHref:``,parentImageDownloadHref:``,...I},hideTitle:!0}]}];function R(e){let t={name:`AICS-10_5_5`,sizeX:64,sizeY:64,sizeZ:64,sizeC:3,physicalPixelSize:[1,1,1],spatialUnit:``,channelNames:[`DRAQ5`,`EGFP`,`SEG_Memb`]},r=[n.createSphere(64,64,64,24,e),n.createTorus(64,64,64,24,8,e),n.createCone(64,64,64,24,24,e)],i=n.concatenateArrays(r,e);return{metadata:t,data:{dtype:e,shape:[r.length,64,64,64],buffer:new DataView(i.buffer)}}}var z=R(`uint8`),B=R(`uint16`),V=R(`float32`),H={viewerChannelSettings:{maskChannelName:``,groups:[{name:`Channels`,channels:[{match:[0],enabled:!0,lut:[`autoij`,`autoij`]},{match:[1],enabled:!0,lut:[`autoij`,`autoij`]},{match:[2],enabled:!0,lut:[`autoij`,`autoij`]}]}]},viewerSettings:{viewMode:r.threeD,density:2.5}};z.data,z.metadata,{...H},B.data,B.metadata,{...H},V.data,V.metadata,{...H},{...H},{...H},{...H},{...H},{...H},{...H},{...H},{...H},{...H},{...H},{...H},{...H},{...H},{...H},{...H},{...H};var U=m.ul`
  padding: 0;
  width: 100%;
  display: grid;

  // Use grid + subgrid to align the title, description, and button for each horizontal
  // row of cards. repeat is used to tile the layout if the cards wrap to a new line.
  grid-template-rows: repeat(3, auto);
  grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
  justify-content: space-around;
  text-align: start;
  gap: 0px 20px;
`,W=m.li`
  display: grid;
  grid-template-rows: subgrid;
  grid-row: span 3;
  grid-row-gap: 2px;
  min-width: 180px;
  margin-top: 20px;

  & > h3 {
    display: grid;
    margin: 0;
  }
  & > p {
    display: grid;
  }
  & > a,
  & > button {
    margin: 4px auto 0 0;
    display: grid;
  }
`;function G(e){let{dataset:t,index:n,onClickLoad:r}=e;return(0,F.jsxs)(W,{children:[(0,F.jsx)(`h3`,{children:t.name}),(0,F.jsx)(`p`,{children:t.description}),(0,F.jsx)(`div`,{children:(0,F.jsxs)(u,{type:`primary`,onClick:()=>r(t.loadParams,t.hideTitle),style:{paddingTop:5},children:[`Load`,(0,F.jsxs)(f,{children:[` dataset `,t.name]})]})})]},n)}function K(e){let{datasets:t,onClickLoad:n}=e;return(0,F.jsx)(U,{children:t.map((e,t)=>(0,F.jsx)(G,{dataset:e,index:t,onClickLoad:n},t))})}var q=m.li`
  display: flex;
  width: 100%;
  flex-direction: column;
  gap: 10px;

  & h3 {
    font-weight: 600;
  }

  & h2 {
    font-size: 20px;
  }

  & p,
  & h2,
  & span {
    margin: 0;
  }

  & a {
    // Add 2px margin to maintain the same visual gap that text has
    margin-top: 2px;
    text-decoration: underline;
  }

  & :first-child {
    // Add some visual separation beneath title element
    margin-bottom: 2px;
  }
`,J=m(T)`
  border-radius: 4px;
  padding: 1px 6px;
  border: 1px solid var(--color-flag-background);
  height: 23px;
  flex-wrap: wrap;

  && > p {
    color: var(--color-flag-text);
    font-size: 11px;
    font-weight: 500;
    margin-bottom: 0;
    white-space: nowrap;
  }
`;function Y(e){let{project:n,index:r,onClickLoad:i}=e,a=n.inReview?(0,F.jsxs)(T,{$gap:10,children:[(0,F.jsx)(`h2`,{children:n.name}),(0,F.jsx)(t,{title:`Final version of dataset will be released when associated paper is published`,children:(0,F.jsx)(J,{children:(0,F.jsx)(`p`,{children:`IN REVIEW`})})})]}):(0,F.jsx)(`h2`,{children:n.name}),o=n.publicationInfo,s=o?(0,F.jsxs)(`p`,{children:[`Related publication: `,(0,F.jsx)(x,{href:o.url.toString(),children:o.name}),` (`,o.citation,`)`]}):null,c=n.loadParams?(0,F.jsx)(`div`,{children:(0,F.jsxs)(u,{onClick:()=>i(n.loadParams,n.hideTitle),style:{paddingTop:5},children:[`Load`,(0,F.jsxs)(f,{children:[` dataset `,n.name]})]})}):null,l=n.datasets?(0,F.jsx)(K,{datasets:n.datasets,onClickLoad:i}):null;return(0,F.jsxs)(q,{children:[a,(0,F.jsx)(`p`,{children:n.description}),s,c,l]},r)}var X=m.ul`
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 0;
  margin-top: 0;

  // Add a pseudo-element line between cards
  & > li:not(:first-child)::before {
    content: "";
    display: block;
    width: 100%;
    height: 1px;
    background-color: var(--color-layout-dividers);
    margin-bottom: 15px;
  }
`;function te(e){return(0,F.jsx)(X,{children:e.projects.map((t,n)=>(0,F.jsx)(Y,{project:t,index:n,onClickLoad:e.onClickLoad},n))})}var Z=1060,ne=m(d)`
  position: relative;
  --container-padding-x: 20px;
  padding: 40px var(--container-padding-x);
  overflow: hidden;
  margin: 0;
`,re=m(d)`
  --padding-x: 30px;
  padding: 26px var(--padding-x);
  max-width: calc(${Z}px - 2 * var(--padding-x));

  --total-padding-x: calc(2 * var(--padding-x) + 2 * var(--container-padding-x));
  width: calc(90vw - var(--total-padding-x));
  border-radius: 5px;
  background-color: var(--color-landingpage-banner-highlight-bg);
  gap: 20px;

  & h1 {
    margin: 0;
  }

  & h2 {
    color: var(--color-text-body);
    margin: 0;
  }

  && > p {
    font-size: 16px;
    margin: 0;
  }
`,ie=m.div`
  position: absolute;
  top: 0;
  right: 0;
  width: 100%;
  height: 100%;
  background-color: #000;
  z-index: -1;

  & > div {
    position: absolute;
    width: 100%;
    height: 100%;
    background-image: linear-gradient(90deg, rgba(35, 25, 50, 0.5) 50%, rgba(0, 0, 0, 0) 70%);
    z-index: 3;
  }

  & > video {
    position: absolute;
    width: 100%;
    max-width: 1400px;
    height: 100%;
    left: 35%;
    object-fit: cover;
  }
`,Q=m(C)`
  max-width: ${Z}px;
  width: calc(90vw - 40px);
  margin: auto;
  padding: 0 20px;
  gap: 20px;

  h2 {
    color: var(--color-text-header);
  }
`,ae=m.li`
  display: grid;
  width: 100%;
  grid-template-rows: repeat(2, auto);
  grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
  padding: 0;
  justify-content: space-evenly;
  column-gap: 20px;
  margin: 30px 0 0 0;
`,$=m(C)`
  display: grid;
  grid-template-rows: subgrid;
  grid-row: span 2;
  margin-bottom: 20px;

  & > h3 {
    font-weight: 600;
    margin: 0 0 4px 0;
  }

  & > p {
    margin: 0;
  }
`,oe=m(d)`
  background-color: var(--color-landingpage-bg-alt);
  // The lower margin on the top is required because of the 20px margin after FeatureHighlightsItem
  margin: 10px 0 30px 0;
  padding: 30px;
  & h2 {
    color: var(--color-text-header);
  }
`,se=m(u)`
  color: var(--color-text-body);
  &:focus-visible > span,
  &:hover > span {
    text-decoration: underline;
  }
`;function ce(e){let t=y(),[n]=p();(0,A.useEffect)(()=>{a(window.location.search).then(({args:e})=>{Object.keys(e).length>0&&(console.log(`Detected URL parameters. Redirecting from landing page to viewer.`),t(`viewer?`+n.toString(),{state:e,replace:!0}))})},[t,n]);let r=(e,n)=>{let r=n?`&hideTitle=true`:``;t(`/viewer?url=${b(e.imageUrl)}${r}`,{state:e})},[s,c]=(0,A.useState)(window.matchMedia(`(prefers-reduced-motion: no-preference)`).matches);return(0,A.useEffect)(()=>{let e=window.matchMedia(`(prefers-reduced-motion: no-preference)`);return e.addEventListener(`change`,()=>{c(e.matches)}),()=>{e.removeEventListener(`change`,()=>{c(e.matches)})}},[]),(0,F.jsxs)(`div`,{style:{backgroundColor:`var(--color-landingpage-bg)`,minHeight:`100%`},children:[(0,F.jsx)(g,{children:(0,F.jsxs)(T,{$gap:12,children:[(0,F.jsx)(T,{$gap:2,children:(0,F.jsx)(o,{onLoad:r})}),(0,F.jsx)(i,{})]})}),(0,F.jsxs)(ne,{children:[(0,F.jsxs)(ie,{style:{zIndex:1},children:[(0,F.jsx)(`video`,{autoPlay:s,loop:!0,muted:!0,children:(0,F.jsx)(`source`,{src:P,type:`video/mp4`})}),(0,F.jsx)(`div`,{})]}),(0,F.jsxs)(re,{style:{zIndex:1},children:[(0,F.jsxs)(d,{children:[(0,F.jsx)(`h1`,{children:`Vol-E`}),(0,F.jsx)(`h2`,{children:`An interactive, web-based viewer for 3D volume data`})]}),(0,F.jsx)(`p`,{children:`Vol-E (Volume Explorer) is an open-use online tool designed to visualize, analyze, and interpret multi-channel 3D microscopy data. Ideal for researchers, educators, and students, the viewer offers powerful interactive tools to extract key insights from imaging data.`})]})]}),(0,F.jsx)(Q,{children:(0,F.jsxs)(ae,{children:[(0,F.jsxs)($,{children:[(0,F.jsx)(`h3`,{children:`Multiresolution OME-Zarr support`}),(0,F.jsx)(`p`,{children:`Load your cloud-hosted OME-Zarr v0.4 and v0.5 images via http(s).`})]}),(0,F.jsxs)($,{children:[(0,F.jsx)(`h3`,{children:`Multiple viewing modes`}),(0,F.jsx)(`p`,{children:`Rotate and examine the volume in 3D, or focus on single Z slices in 2D at higher resolution.`})]}),(0,F.jsxs)($,{children:[(0,F.jsx)(`h3`,{children:`Time-series playthrough`}),(0,F.jsx)(`p`,{children:`Interactively explore dynamics and manipulate timelapse videos realtime in 2D or 3D.`})]}),(0,F.jsxs)($,{children:[(0,F.jsx)(`h3`,{children:`Customizable settings`}),(0,F.jsx)(`p`,{children:`Switch colors, toggle channels, and apply thresholds to reveal interesting features in data.`})]})]})}),(0,F.jsx)(oe,{children:(0,F.jsx)(`h2`,{style:{margin:0},children:`Load a dataset below or your own data to get started.`})}),(0,F.jsx)(Q,{style:{paddingBottom:`400px`},children:(0,F.jsx)(te,{projects:L,onClickLoad:r})}),(0,F.jsxs)(Q,{style:{padding:`0 30px 40px 30px`,display:`block`},children:[(0,F.jsx)(N,{}),(0,F.jsx)(d,{style:{paddingTop:`20px`},children:(0,F.jsxs)(se,{type:`text`,className:`ot-sdk-show-settings`,children:[`Cookie settings`,(0,F.jsx)(f,{children:`(opens popup menu)`})]})})]})]})}export{ce as default};