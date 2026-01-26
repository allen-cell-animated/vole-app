import type { FirebaseFirestore } from "@firebase/firestore-types";
import { Button, Divider } from "antd";
import React, { type ReactElement, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useSearchParams } from "react-router-dom";
import styled from "styled-components";

import { parseViewerUrlParams } from "../../../src";
import { BannerVideo } from "../../assets/videos";
import type { AppDataProps } from "../../types";
import { encodeImageUrlProp } from "../../utils/urls";
import { LANDING_PAGE_CONTENT } from "./content";
import { TEST_DATA_CONTENT } from "./testData";
import { FlexColumn, FlexColumnAlignCenter, FlexRowAlignCenter, VisuallyHidden } from "./utils";

import Header from "../Header";
import HelpDropdown from "../HelpDropdown";
import LoadModal from "../Modals/LoadModal";
import ProjectList from "./components/ProjectList";

const MAX_CONTENT_WIDTH_PX = 1060;

const Banner = styled(FlexColumnAlignCenter)`
  position: relative;
  --container-padding-x: 20px;
  padding: 40px var(--container-padding-x);
  overflow: hidden;
  margin: 0;
`;

const BannerTextContainer = styled(FlexColumnAlignCenter)`
  --padding-x: 30px;
  padding: 26px var(--padding-x);
  max-width: calc(${MAX_CONTENT_WIDTH_PX}px - 2 * var(--padding-x));

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
`;

const BannerVideoContainer = styled.div`
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
`;

const ContentContainer = styled(FlexColumn)`
  max-width: ${MAX_CONTENT_WIDTH_PX}px;
  width: calc(90vw - 40px);
  margin: auto;
  padding: 0 20px;
  gap: 20px;

  h2 {
    color: var(--color-text-header);
  }
`;

const FeatureHighlightsContainer = styled.li`
  display: grid;
  width: 100%;
  grid-template-rows: repeat(2, auto);
  grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
  padding: 0;
  justify-content: space-evenly;
  column-gap: 20px;
  margin: 30px 0 0 0;
`;

const FeatureHighlightsItem = styled(FlexColumn)`
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
`;

const LoadPromptContainer = styled(FlexColumnAlignCenter)`
  background-color: var(--color-landingpage-bg-alt);
  // The lower margin on the top is required because of the 20px margin after FeatureHighlightsItem
  margin: 10px 0 30px 0;
  padding: 30px;
  & h2 {
    color: var(--color-text-header);
  }
`;

const CookieSettingsButton = styled(Button)`
  color: var(--color-text-body);
  &:focus-visible > span,
  &:hover > span {
    text-decoration: underline;
  }
`;

type LandingPageProps = {
  firestore?: FirebaseFirestore;
};

export default function LandingPage(props: LandingPageProps): ReactElement {
  // Rendering
  const navigation = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    // Check if the URL used to open the landing page has arguments;
    // if so, assume that this is an old URL intended to go to the viewer.
    // Navigate to the viewer while preserving URL arguments.
    parseViewerUrlParams(window.location.search, props.firestore).then(({ args }) => {
      if (Object.keys(args).length > 0) {
        console.log("Detected URL parameters. Redirecting from landing page to viewer.");
        navigation("viewer" + "?" + searchParams.toString(), {
          state: args,
          replace: true,
        });
      }
    });
  }, [navigation, searchParams, props.firestore]);

  const onClickLoad = (appProps: AppDataProps, hideTitle?: boolean): void => {
    // TODO: Make URL search params from the appProps and append it to the viewer URL so the URL can be shared directly.
    // Alternatively, AppWrapper should manage syncing URL and viewer props.
    const hideTitleParam = hideTitle ? "&hideTitle=true" : "";
    navigation(`/viewer?url=${encodeImageUrlProp(appProps.imageUrl)}${hideTitleParam}`, {
      state: appProps,
    });
  };

  const [allowMotion, setAllowMotion] = useState(window.matchMedia("(prefers-reduced-motion: no-preference)").matches);
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: no-preference)");
    mediaQuery.addEventListener("change", () => {
      setAllowMotion(mediaQuery.matches);
    });
    return () => {
      mediaQuery.removeEventListener("change", () => {
        setAllowMotion(mediaQuery.matches);
      });
    };
  }, []);

  return (
    <div style={{ backgroundColor: "var(--color-landingpage-bg)", minHeight: "100%" }}>
      <Header>
        <FlexRowAlignCenter $gap={12}>
          <FlexRowAlignCenter $gap={2}>
            <LoadModal onLoad={onClickLoad} />
          </FlexRowAlignCenter>
          <HelpDropdown />
        </FlexRowAlignCenter>
      </Header>
      <Banner>
        <BannerVideoContainer style={{ zIndex: 1 }}>
          <video autoPlay={allowMotion} loop muted>
            <source src={BannerVideo} type="video/mp4" />
          </video>
          <div></div>
        </BannerVideoContainer>
        <BannerTextContainer style={{ zIndex: 1 }}>
          <FlexColumnAlignCenter>
            <h1>Vol-E</h1>
            <h2>An interactive, web-based viewer for 3D volume data</h2>
          </FlexColumnAlignCenter>
          <p>
            Vol-E (Volume Explorer) is an open-use online tool designed to visualize, analyze, and interpret
            multi-channel 3D microscopy data. Ideal for researchers, educators, and students, the viewer offers powerful
            interactive tools to extract key insights from imaging data.
          </p>
        </BannerTextContainer>
      </Banner>

      <ContentContainer>
        <FeatureHighlightsContainer>
          <FeatureHighlightsItem>
            <h3>Multiresolution OME-Zarr support</h3>
            <p>Load your cloud-hosted OME-Zarr v0.4 and v0.5 images via http(s).</p>
          </FeatureHighlightsItem>
          <FeatureHighlightsItem>
            <h3>Multiple viewing modes</h3>
            <p>Rotate and examine the volume in 3D, or focus on single Z slices in 2D at higher resolution.</p>
          </FeatureHighlightsItem>
          <FeatureHighlightsItem>
            <h3>Time-series playthrough</h3>
            <p>Interactively explore dynamics and manipulate timelapse videos realtime in 2D or 3D.</p>
          </FeatureHighlightsItem>
          <FeatureHighlightsItem>
            <h3>Customizable settings</h3>
            <p>Switch colors, toggle channels, and apply thresholds to reveal interesting features in data.</p>
          </FeatureHighlightsItem>
        </FeatureHighlightsContainer>
      </ContentContainer>

      <LoadPromptContainer>
        <h2 style={{ margin: 0 }}>Load a dataset below or your own data to get started.</h2>
      </LoadPromptContainer>

      <ContentContainer style={{ paddingBottom: "400px" }}>
        <ProjectList
          projects={
            VOLEAPP_BUILD_ENVIRONMENT === "dev" ? [...LANDING_PAGE_CONTENT, ...TEST_DATA_CONTENT] : LANDING_PAGE_CONTENT
          }
          onClickLoad={onClickLoad}
        />
      </ContentContainer>

      <ContentContainer style={{ padding: "0 30px 40px 30px" }}>
        <Divider />
        <FlexColumnAlignCenter style={{ paddingTop: "20px" }}>
          <CookieSettingsButton type="text" className="ot-sdk-show-settings">
            Cookie settings
            <VisuallyHidden>(opens popup menu)</VisuallyHidden>
          </CookieSettingsButton>
        </FlexColumnAlignCenter>
      </ContentContainer>
    </div>
  );
}
