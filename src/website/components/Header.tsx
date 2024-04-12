import React, { PropsWithChildren, ReactElement } from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";

import { AicsLogoAndNameSVG, AicsLogoSVG } from "../assets/icons";
import { FlexRowAlignCenter } from "./LandingPage/utils";

const AICS_LOGO_RESIZE_THRESHOLD_PX = 540;

const AicsLogoLink = styled.a`
  position: relative;
  width: 140px;
  height: 36px;

  div > svg:last-child {
    display: none;
  }

  // Toggle between the two logos based on the currently available screen real estate
  // Width is determined here experimentally to prevent popping as the other buttons in the header wrap.
  @media only screen and (max-width: ${AICS_LOGO_RESIZE_THRESHOLD_PX}px) {
    & {
      max-width: 30px;
      max-height: 30px;
    }

    & > div > svg:first-child {
      display: none;
    }

    & > div > svg:last-child {
      display: block;
      visibility: visible;
    }
  }
`;

const VerticalDivider = styled.div`
  height: 24px;
  width: 1px;
  background-color: var(--color-dividers);
  display: inline-block;
  margin: 0 20px;

  @media only screen and (max-width: ${AICS_LOGO_RESIZE_THRESHOLD_PX}px) {
    margin: 0 10px;
  }
`;

/**
 * The logo and title of the app, to be used with the Header component.
 * Both the logo and app title are links that can be used for navigation.
 */
function HeaderLogo(): ReactElement {
  return (
    <FlexRowAlignCenter>
      <AicsLogoLink href="https://www.allencell.org/" rel="noopener noreferrer" target="_blank">
        <div title={"https://www.allencell.org"}>
          <AicsLogoSVG />
          <AicsLogoAndNameSVG />
        </div>
      </AicsLogoLink>
      <VerticalDivider />
      <Link to="/" aria-label="Go to home page" style={{ color: "var(--color-header-text)" }}>
        <h1 style={{ fontSize: "20px", color: "var(--color-header-text)" }}>3D Volume Viewer</h1>
      </Link>
    </FlexRowAlignCenter>
  );
}

const StickyContainer = styled.div`
  position: sticky;
  z-index: 2000;
  top: 0;
  left: 0;
`;

/**
 * Top title bar for the app, which will stick to the top of the page.
 * Child components will be spaced apart evenly.
 * */
const HeaderContainer = styled(FlexRowAlignCenter)`
  flex-wrap: wrap;
  justify-content: space-between;
  width: auto;
  height: fit-content;
  min-height: var(--header-content-height);
  padding: 12px 30px;
  border-bottom: 1px solid var(--color-borders);
  gap: 10px;
  position: sticky;
  background-color: var(--color-background);
`;

type HeaderProps = {
  /** Optional element for alerts; will be rendered under the main header bar and use sticky positioning. */
  alertElement?: ReactElement;
};

export default function Header(props: PropsWithChildren<HeaderProps>): ReactElement {
  return (
    <StickyContainer>
      <HeaderContainer>
        <HeaderLogo />
        {props.children}
      </HeaderContainer>
      {props.alertElement}
    </StickyContainer>
  );
}
