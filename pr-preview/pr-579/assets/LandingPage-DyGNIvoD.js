import{a as e}from"./rolldown-runtime-B0Z9INg1.js";import{I as t,b as n,n as r,r as i,t as a,y as o}from"./LoadModal-C2iE-qWz.js";import{Ct as s,G as c,X as l,_ as u,an as d,c as f,d as p,dn as m,et as h,h as g,i as _,in as v,ln as y,m as b,n as x,o as S,ot as C,pn as w,s as T,u as E}from"./main-CFWi5Xt2.js";var D=e=>{let{componentCls:t,sizePaddingEdgeHorizontal:n,colorSplit:r,lineWidth:i,textPaddingInline:a,orientationMargin:o,verticalMarginInline:c}=e;return{[t]:Object.assign(Object.assign({},l(e)),{borderBlockStart:`${s(i)} solid ${r}`,"&-vertical":{position:`relative`,top:`-0.06em`,display:`inline-block`,height:`0.9em`,marginInline:c,marginBlock:0,verticalAlign:`middle`,borderTop:0,borderInlineStart:`${s(i)} solid ${r}`},"&-horizontal":{display:`flex`,clear:`both`,width:`100%`,minWidth:`100%`,margin:`${s(e.dividerHorizontalGutterMargin)} 0`},[`&-horizontal${t}-with-text`]:{display:`flex`,alignItems:`center`,margin:`${s(e.dividerHorizontalWithTextGutterMargin)} 0`,color:e.colorTextHeading,fontWeight:500,fontSize:e.fontSizeLG,whiteSpace:`nowrap`,textAlign:`center`,borderBlockStart:`0 ${r}`,"&::before, &::after":{position:`relative`,width:`50%`,borderBlockStart:`${s(i)} solid transparent`,borderBlockStartColor:`inherit`,borderBlockEnd:0,transform:`translateY(50%)`,content:`''`}},[`&-horizontal${t}-with-text-left`]:{"&::before":{width:`calc(${o} * 100%)`},"&::after":{width:`calc(100% - ${o} * 100%)`}},[`&-horizontal${t}-with-text-right`]:{"&::before":{width:`calc(100% - ${o} * 100%)`},"&::after":{width:`calc(${o} * 100%)`}},[`${t}-inner-text`]:{display:`inline-block`,paddingBlock:0,paddingInline:a},"&-dashed":{background:`none`,borderColor:r,borderStyle:`dashed`,borderWidth:`${s(i)} 0 0`},[`&-horizontal${t}-with-text${t}-dashed`]:{"&::before, &::after":{borderStyle:`dashed none none`}},[`&-vertical${t}-dashed`]:{borderInlineStartWidth:i,borderInlineEnd:0,borderBlockStart:0,borderBlockEnd:0},"&-dotted":{background:`none`,borderColor:r,borderStyle:`dotted`,borderWidth:`${s(i)} 0 0`},[`&-horizontal${t}-with-text${t}-dotted`]:{"&::before, &::after":{borderStyle:`dotted none none`}},[`&-vertical${t}-dotted`]:{borderInlineStartWidth:i,borderInlineEnd:0,borderBlockStart:0,borderBlockEnd:0},[`&-plain${t}-with-text`]:{color:e.colorText,fontWeight:`normal`,fontSize:e.fontSize},[`&-horizontal${t}-with-text-left${t}-no-default-orientation-margin-left`]:{"&::before":{width:0},"&::after":{width:`100%`},[`${t}-inner-text`]:{paddingInlineStart:n}},[`&-horizontal${t}-with-text-right${t}-no-default-orientation-margin-right`]:{"&::before":{width:`100%`},"&::after":{width:0},[`${t}-inner-text`]:{paddingInlineEnd:n}}})}},O=c(`Divider`,e=>[D(h(e,{dividerHorizontalWithTextGutterMargin:e.margin,dividerHorizontalGutterMargin:e.marginLG,sizePaddingEdgeHorizontal:0}))],e=>({textPaddingInline:`1em`,orientationMargin:.05,verticalMarginInline:e.marginXS}),{unitless:{orientationMargin:!0}}),k=e(w()),ee=e(v()),te=function(e,t){var n={};for(var r in e)Object.prototype.hasOwnProperty.call(e,r)&&t.indexOf(r)<0&&(n[r]=e[r]);if(e!=null&&typeof Object.getOwnPropertySymbols==`function`)for(var i=0,r=Object.getOwnPropertySymbols(e);i<r.length;i++)t.indexOf(r[i])<0&&Object.prototype.propertyIsEnumerable.call(e,r[i])&&(n[r[i]]=e[r[i]]);return n},A=e=>{let{getPrefixCls:t,direction:n,divider:r}=k.useContext(C),{prefixCls:i,type:a=`horizontal`,orientation:o=`center`,orientationMargin:s,className:c,rootClassName:l,children:u,dashed:d,variant:f=`solid`,plain:p,style:m}=e,h=te(e,[`prefixCls`,`type`,`orientation`,`orientationMargin`,`className`,`rootClassName`,`children`,`dashed`,`variant`,`plain`,`style`]),g=t(`divider`,i),[_,v,y]=O(g),b=!!u,x=o===`left`&&s!=null,S=o===`right`&&s!=null,w=(0,ee.default)(g,r?.className,v,y,`${g}-${a}`,{[`${g}-with-text`]:b,[`${g}-with-text-${o}`]:b,[`${g}-dashed`]:!!d,[`${g}-${f}`]:f!==`solid`,[`${g}-plain`]:!!p,[`${g}-rtl`]:n===`rtl`,[`${g}-no-default-orientation-margin-left`]:x,[`${g}-no-default-orientation-margin-right`]:S},c,l),T=k.useMemo(()=>typeof s==`number`?s:/^\d+$/.test(s)?Number(s):s,[s]),E=Object.assign(Object.assign({},x&&{marginLeft:T}),S&&{marginRight:T});return _(k.createElement(`div`,Object.assign({className:w,style:Object.assign(Object.assign({},r?.style),m)},h,{role:`separator`}),u&&a!==`vertical`&&k.createElement(`span`,{className:`${g}-inner-text`,style:E},u)))},j=`/vole-app/pr-preview/pr-579/assets/banner-video-CC9MkvaF.mp4`,M=b(),N={viewerChannelSettings:{maskChannelName:``,groups:[{name:`Channels`,channels:[{match:[0],enabled:!0,lut:[`autoij`,`autoij`],color:`C3C3C3`},{match:[1],enabled:!1},{match:[2],enabled:!0,colorizeEnabled:!0}]}]},viewerSettings:{viewMode:o.xy,density:2.5}},P=[{name:`hiPSC FOV-nuclei timelapse datasets`,inReview:!1,description:(0,M.jsxs)(`p`,{children:[`3D timelapses of nuclei in growing hiPS cell colonies of three different starting sizes. Timelapse datasets include 3D transmitted-light bright-field and lamin B1-mEGFP fluorescence 20x images and 3D nuclear segmentation images. These datasets are`,` `,(0,M.jsx)(S,{href:`https://open.quiltdata.com/b/allencell/tree/aics/nuc-morph-dataset/hipsc_fov_nuclei_timelapse_dataset/hipsc_fov_nuclei_timelapse_data_used_for_analysis/baseline_colonies_fov_timelapse_dataset/`,children:`available for download on Quilt`}),` `,`.`]}),publicationInfo:{url:new URL(`https://doi.org/10.1016/j.cels.2025.101265`),name:`Colony context and size-dependent compensation mechanisms give rise to variations in nuclear growth trajectories`,citation:`Cell Systems, May 2025`},datasets:[{name:`Small colony`,loadParams:{imageUrl:{scenes:[[`https://allencell.s3.amazonaws.com/aics/nuc-morph-dataset/hipsc_fov_nuclei_timelapse_dataset/hipsc_fov_nuclei_timelapse_data_used_for_analysis/baseline_colonies_fov_timelapse_dataset/20200323_09_small/raw.ome.zarr`,`https://allencell.s3.amazonaws.com/aics/nuc-morph-dataset/hipsc_fov_nuclei_timelapse_dataset/hipsc_fov_nuclei_timelapse_data_used_for_analysis/baseline_colonies_fov_timelapse_dataset/20200323_09_small/seg.ome.zarr`]]},cellId:``,imageDownloadHref:``,parentImageDownloadHref:``,...N},hideTitle:!0},{name:`Medium colony`,loadParams:{imageUrl:{scenes:[[`https://allencell.s3.amazonaws.com/aics/nuc-morph-dataset/hipsc_fov_nuclei_timelapse_dataset/hipsc_fov_nuclei_timelapse_data_used_for_analysis/baseline_colonies_fov_timelapse_dataset/20200323_06_medium/raw.ome.zarr`,`https://allencell.s3.amazonaws.com/aics/nuc-morph-dataset/hipsc_fov_nuclei_timelapse_dataset/hipsc_fov_nuclei_timelapse_data_used_for_analysis/baseline_colonies_fov_timelapse_dataset/20200323_06_medium/seg.ome.zarr`]]},cellId:``,imageDownloadHref:``,parentImageDownloadHref:``,...N},hideTitle:!0},{name:`Large colony`,loadParams:{imageUrl:{scenes:[[`https://allencell.s3.amazonaws.com/aics/nuc-morph-dataset/hipsc_fov_nuclei_timelapse_dataset/hipsc_fov_nuclei_timelapse_data_used_for_analysis/baseline_colonies_fov_timelapse_dataset/20200323_05_large/raw.ome.zarr`,`https://allencell.s3.amazonaws.com/aics/nuc-morph-dataset/hipsc_fov_nuclei_timelapse_dataset/hipsc_fov_nuclei_timelapse_data_used_for_analysis/baseline_colonies_fov_timelapse_dataset/20200323_05_large/seg.ome.zarr`]]},cellId:``,imageDownloadHref:``,parentImageDownloadHref:``,...N},hideTitle:!0}]}];function F(e){let t={name:`AICS-10_5_5`,sizeX:64,sizeY:64,sizeZ:64,sizeC:3,physicalPixelSize:[1,1,1],spatialUnit:``,channelNames:[`DRAQ5`,`EGFP`,`SEG_Memb`]},r=[n.createSphere(64,64,64,24,e),n.createTorus(64,64,64,24,8,e),n.createCone(64,64,64,24,24,e)],i=n.concatenateArrays(r,e);return{metadata:t,data:{dtype:e,shape:[r.length,64,64,64],buffer:new DataView(i.buffer)}}}var I=F(`uint8`),L=F(`uint16`),R=F(`float32`),z={viewerChannelSettings:{maskChannelName:``,groups:[{name:`Channels`,channels:[{match:[0],enabled:!0,lut:[`autoij`,`autoij`]},{match:[1],enabled:!0,lut:[`autoij`,`autoij`]},{match:[2],enabled:!0,lut:[`autoij`,`autoij`]}]}]},viewerSettings:{viewMode:o.threeD,density:2.5}},B=[{name:`Developer test data`,inReview:!1,description:`Various test data for dev only.`,datasets:[{name:`procedural uint8`,loadParams:{imageUrl:``,rawData:I.data,rawDims:I.metadata,cellId:``,imageDownloadHref:``,parentImageDownloadHref:``,...z}},{name:`procedural uint16`,loadParams:{imageUrl:``,rawData:L.data,rawDims:L.metadata,cellId:``,imageDownloadHref:``,parentImageDownloadHref:``,...z}},{name:`procedural float32`,loadParams:{imageUrl:``,rawData:R.data,rawDims:R.metadata,cellId:``,imageDownloadHref:``,parentImageDownloadHref:``,...z}},{name:`CellPainting`,loadParams:{imageUrl:{scenes:[[`https://cellpainting-gallery.s3.us-east-1.amazonaws.com/cpg0000-jump-pilot/source_4/images/2020_12_08_CPJUMP1_Bleaching/images/BR00116992E__2020-11-12T01_22_40-Measurement1/Images/r01c01f01p01-ch1sk5fk1fl1.tiff`,`https://cellpainting-gallery.s3.us-east-1.amazonaws.com/cpg0000-jump-pilot/source_4/images/2020_12_08_CPJUMP1_Bleaching/images/BR00116992E__2020-11-12T01_22_40-Measurement1/Images/r01c01f01p01-ch2sk5fk1fl1.tiff`,`https://cellpainting-gallery.s3.us-east-1.amazonaws.com/cpg0000-jump-pilot/source_4/images/2020_12_08_CPJUMP1_Bleaching/images/BR00116992E__2020-11-12T01_22_40-Measurement1/Images/r01c01f01p01-ch3sk5fk1fl1.tiff`,`https://cellpainting-gallery.s3.us-east-1.amazonaws.com/cpg0000-jump-pilot/source_4/images/2020_12_08_CPJUMP1_Bleaching/images/BR00116992E__2020-11-12T01_22_40-Measurement1/Images/r01c01f01p01-ch4sk5fk1fl1.tiff`,`https://cellpainting-gallery.s3.us-east-1.amazonaws.com/cpg0000-jump-pilot/source_4/images/2020_12_08_CPJUMP1_Bleaching/images/BR00116992E__2020-11-12T01_22_40-Measurement1/Images/r01c01f01p01-ch5sk5fk1fl1.tiff`,`https://cellpainting-gallery.s3.us-east-1.amazonaws.com/cpg0000-jump-pilot/source_4/images/2020_12_08_CPJUMP1_Bleaching/images/BR00116992E__2020-11-12T01_22_40-Measurement1/Images/r01c01f01p01-ch6sk5fk1fl1.tiff`,`https://cellpainting-gallery.s3.us-east-1.amazonaws.com/cpg0000-jump-pilot/source_4/images/2020_12_08_CPJUMP1_Bleaching/images/BR00116992E__2020-11-12T01_22_40-Measurement1/Images/r01c01f01p01-ch7sk5fk1fl1.tiff`,`https://cellpainting-gallery.s3.us-east-1.amazonaws.com/cpg0000-jump-pilot/source_4/images/2020_12_08_CPJUMP1_Bleaching/images/BR00116992E__2020-11-12T01_22_40-Measurement1/Images/r01c01f01p01-ch8sk5fk1fl1.tiff`]]},cellId:``,imageDownloadHref:``,parentImageDownloadHref:``,...z}},{name:`Test pick`,loadParams:{imageUrl:{scenes:[[`https://allencell.s3.amazonaws.com/aics/nuc-morph-dataset/hipsc_fov_nuclei_timelapse_dataset/hipsc_fov_nuclei_timelapse_data_used_for_analysis/baseline_colonies_fov_timelapse_dataset/20200323_09_small/seg.ome.zarr`]]},cellId:``,imageDownloadHref:``,parentImageDownloadHref:``,...z}},{name:`OME TIFF variance`,loadParams:{imageUrl:{scenes:[[`https://animatedcell-test-data.s3.us-west-2.amazonaws.com/AICS-12_881.ome.tif`]]},cellId:``,imageDownloadHref:``,parentImageDownloadHref:``,...z}},{name:`Time series mitosis zarr`,loadParams:{imageUrl:{scenes:[[`https://animatedcell-test-data.s3.us-west-2.amazonaws.com/timelapse/timeseries_mitosis.zarr`]]},cellId:``,imageDownloadHref:``,parentImageDownloadHref:``,...z}},{name:`Zarr EMT (internal)`,loadParams:{imageUrl:{scenes:[[`https://dev-aics-dtp-001.int.allencell.org/users/danielt/3500005818_20230811__20x_Timelapse-02(P27-E7).ome.zarr`]]},cellId:``,imageDownloadHref:``,parentImageDownloadHref:``,...z}},{name:`Zarr IDR 1`,loadParams:{imageUrl:{scenes:[[`https://uk1s3.embassy.ebi.ac.uk/idr/zarr/v0.4/idr0076A/10501752.zarr`]]},cellId:``,imageDownloadHref:``,parentImageDownloadHref:``,...z}},{name:`Zarr IDR 2`,loadParams:{imageUrl:{scenes:[[`https://uk1s3.embassy.ebi.ac.uk/idr/zarr/v0.4/idr0054A/5025553.zarr`]]},cellId:``,imageDownloadHref:``,parentImageDownloadHref:``,...z}},{name:`Zarr Variance 2-scene`,loadParams:{imageUrl:{scenes:[[`https://animatedcell-test-data.s3.us-west-2.amazonaws.com/variance/1.zarr`],[`https://animatedcell-test-data.s3.us-west-2.amazonaws.com/variance/2.zarr`]]},cellId:``,imageDownloadHref:``,parentImageDownloadHref:``,...z}},{name:`Zarr Nucmorph 0`,loadParams:{imageUrl:{scenes:[[`https://animatedcell-test-data.s3.us-west-2.amazonaws.com/20200323_F01_001/P13-C4.zarr`]]},cellId:``,imageDownloadHref:``,parentImageDownloadHref:``,...z}},{name:`Zarr Nucmorph 1`,loadParams:{imageUrl:{scenes:[[`https://animatedcell-test-data.s3.us-west-2.amazonaws.com/20200323_F01_001/P15-C3.zarr`]]},cellId:``,imageDownloadHref:``,parentImageDownloadHref:``,...z}},{name:`Zarr Nucmorph 2`,loadParams:{imageUrl:{scenes:[[`https://animatedcell-test-data.s3.us-west-2.amazonaws.com/20200323_F01_001/P7-B4.zarr`]]},cellId:``,imageDownloadHref:``,parentImageDownloadHref:``,...z}},{name:`Zarr Nucmorph 3`,loadParams:{imageUrl:{scenes:[[`https://animatedcell-test-data.s3.us-west-2.amazonaws.com/20200323_F01_001/P8-B4.zarr`]]},cellId:``,imageDownloadHref:``,parentImageDownloadHref:``,...z}},{name:`Zarr fly brain`,loadParams:{imageUrl:{scenes:[[`https://uk1s3.embassy.ebi.ac.uk/idr/zarr/v0.4/idr0048A/9846152.zarr`]]},cellId:``,imageDownloadHref:``,parentImageDownloadHref:``,...z}},{name:`Zarr UK`,loadParams:{imageUrl:{scenes:[[`https://uk1s3.embassy.ebi.ac.uk/idr/zarr/v0.4/idr0062A/6001240.zarr`]]},cellId:``,imageDownloadHref:``,parentImageDownloadHref:``,...z}},{name:`CFE Json`,loadParams:{imageUrl:{scenes:[[`https://s3-us-west-2.amazonaws.com/bisque.allencell.org/v2.0.0/Cell-Viewer_Thumbnails/AICS-61/AICS-61_139803_atlas.json`]]},cellId:``,imageDownloadHref:``,parentImageDownloadHref:``,...z}},{name:`ABM tiff`,loadParams:{imageUrl:{scenes:[[`https://animatedcell-test-data.s3.us-west-2.amazonaws.com/HAMILTONIAN_TERM_FOV_VSAHJUP_0000_000192.ome.tif`]]},cellId:``,imageDownloadHref:``,parentImageDownloadHref:``,...z}}]}],V=g.ul`
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
`,H=g.li`
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
`;function U(e){let{dataset:t,index:n,onClickLoad:r}=e;return(0,M.jsxs)(H,{children:[(0,M.jsx)(`h3`,{children:t.name}),(0,M.jsx)(`p`,{children:t.description}),(0,M.jsx)(`div`,{children:(0,M.jsxs)(u,{type:`primary`,onClick:()=>r(t.loadParams,t.hideTitle),style:{paddingTop:5},children:[`Load`,(0,M.jsxs)(p,{children:[` dataset `,t.name]})]})})]},n)}function W(e){let{datasets:t,onClickLoad:n}=e;return(0,M.jsx)(V,{children:t.map((e,t)=>(0,M.jsx)(U,{dataset:e,index:t,onClickLoad:n},t))})}var G=g.li`
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
`,K=g(E)`
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
`;function q(e){let{project:n,index:r,onClickLoad:i}=e,a=n.inReview?(0,M.jsxs)(E,{$gap:10,children:[(0,M.jsx)(`h2`,{children:n.name}),(0,M.jsx)(t,{title:`Final version of dataset will be released when associated paper is published`,children:(0,M.jsx)(K,{children:(0,M.jsx)(`p`,{children:`IN REVIEW`})})})]}):(0,M.jsx)(`h2`,{children:n.name}),o=n.publicationInfo,s=o?(0,M.jsxs)(`p`,{children:[`Related publication: `,(0,M.jsx)(S,{href:o.url.toString(),children:o.name}),` (`,o.citation,`)`]}):null,c=n.loadParams?(0,M.jsx)(`div`,{children:(0,M.jsxs)(u,{onClick:()=>i(n.loadParams,n.hideTitle),style:{paddingTop:5},children:[`Load`,(0,M.jsxs)(p,{children:[` dataset `,n.name]})]})}):null,l=n.datasets?(0,M.jsx)(W,{datasets:n.datasets,onClickLoad:i}):null;return(0,M.jsxs)(G,{children:[a,(0,M.jsx)(`p`,{children:n.description}),s,c,l]},r)}var J=g.ul`
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
`;function Y(e){return(0,M.jsx)(J,{children:e.projects.map((t,n)=>(0,M.jsx)(q,{project:t,index:n,onClickLoad:e.onClickLoad},n))})}var X=1060,Z=g(f)`
  position: relative;
  --container-padding-x: 20px;
  padding: 40px var(--container-padding-x);
  overflow: hidden;
  margin: 0;
`,ne=g(f)`
  --padding-x: 30px;
  padding: 26px var(--padding-x);
  max-width: calc(${X}px - 2 * var(--padding-x));

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
`,re=g.div`
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
`,Q=g(T)`
  max-width: ${X}px;
  width: calc(90vw - 40px);
  margin: auto;
  padding: 0 20px;
  gap: 20px;

  h2 {
    color: var(--color-text-header);
  }
`,ie=g.li`
  display: grid;
  width: 100%;
  grid-template-rows: repeat(2, auto);
  grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
  padding: 0;
  justify-content: space-evenly;
  column-gap: 20px;
  margin: 30px 0 0 0;
`,$=g(T)`
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
`,ae=g(f)`
  background-color: var(--color-landingpage-bg-alt);
  // The lower margin on the top is required because of the 20px margin after FeatureHighlightsItem
  margin: 10px 0 30px 0;
  padding: 30px;
  & h2 {
    color: var(--color-text-header);
  }
`,oe=g(u)`
  color: var(--color-text-body);
  &:focus-visible > span,
  &:hover > span {
    text-decoration: underline;
  }
`;function se(e){let t=m(),[n]=y();(0,k.useEffect)(()=>{i(window.location.search,e.firestore).then(({args:e})=>{Object.keys(e).length>0&&(console.log(`Detected URL parameters. Redirecting from landing page to viewer.`),t(`viewer?`+n.toString(),{state:e,replace:!0}))})},[t,n,e.firestore]);let o=(e,n)=>{let r=n?`&hideTitle=true`:``;t(`/viewer?url=${x(e.imageUrl)}${r}`,{state:e})},[s,c]=(0,k.useState)(window.matchMedia(`(prefers-reduced-motion: no-preference)`).matches);return(0,k.useEffect)(()=>{let e=window.matchMedia(`(prefers-reduced-motion: no-preference)`);return e.addEventListener(`change`,()=>{c(e.matches)}),()=>{e.removeEventListener(`change`,()=>{c(e.matches)})}},[]),(0,M.jsxs)(`div`,{style:{backgroundColor:`var(--color-landingpage-bg)`,minHeight:`100%`},children:[(0,M.jsx)(_,{children:(0,M.jsxs)(E,{$gap:12,children:[(0,M.jsx)(E,{$gap:2,children:(0,M.jsx)(a,{onLoad:o})}),(0,M.jsx)(r,{})]})}),(0,M.jsxs)(Z,{children:[(0,M.jsxs)(re,{style:{zIndex:1},children:[(0,M.jsx)(`video`,{autoPlay:s,loop:!0,muted:!0,children:(0,M.jsx)(`source`,{src:j,type:`video/mp4`})}),(0,M.jsx)(`div`,{})]}),(0,M.jsxs)(ne,{style:{zIndex:1},children:[(0,M.jsxs)(f,{children:[(0,M.jsx)(`h1`,{children:`Vol-E`}),(0,M.jsx)(`h2`,{children:`An interactive, web-based viewer for 3D volume data`})]}),(0,M.jsx)(`p`,{children:`Vol-E (Volume Explorer) is an open-use online tool designed to visualize, analyze, and interpret multi-channel 3D microscopy data. Ideal for researchers, educators, and students, the viewer offers powerful interactive tools to extract key insights from imaging data.`})]})]}),(0,M.jsx)(Q,{children:(0,M.jsxs)(ie,{children:[(0,M.jsxs)($,{children:[(0,M.jsx)(`h3`,{children:`Multiresolution OME-Zarr support`}),(0,M.jsx)(`p`,{children:`Load your cloud-hosted OME-Zarr v0.4 and v0.5 images via http(s).`})]}),(0,M.jsxs)($,{children:[(0,M.jsx)(`h3`,{children:`Multiple viewing modes`}),(0,M.jsx)(`p`,{children:`Rotate and examine the volume in 3D, or focus on single Z slices in 2D at higher resolution.`})]}),(0,M.jsxs)($,{children:[(0,M.jsx)(`h3`,{children:`Time-series playthrough`}),(0,M.jsx)(`p`,{children:`Interactively explore dynamics and manipulate timelapse videos realtime in 2D or 3D.`})]}),(0,M.jsxs)($,{children:[(0,M.jsx)(`h3`,{children:`Customizable settings`}),(0,M.jsx)(`p`,{children:`Switch colors, toggle channels, and apply thresholds to reveal interesting features in data.`})]})]})}),(0,M.jsx)(ae,{children:(0,M.jsx)(`h2`,{style:{margin:0},children:`Load a dataset below or your own data to get started.`})}),(0,M.jsx)(Q,{style:{paddingBottom:`400px`},children:(0,M.jsx)(Y,{projects:d===`dev`?[...P,...B]:P,onClickLoad:o})}),(0,M.jsxs)(Q,{style:{padding:`0 30px 40px 30px`},children:[(0,M.jsx)(A,{}),(0,M.jsx)(f,{style:{paddingTop:`20px`},children:(0,M.jsxs)(oe,{type:`text`,className:`ot-sdk-show-settings`,children:[`Cookie settings`,(0,M.jsx)(p,{children:`(opens popup menu)`})]})})]})]})}export{se as default};