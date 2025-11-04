import React, { PropsWithChildren, ReactElement } from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";

import { AicsLogoAndNameSVG, AicsLogoSVG } from "../assets/icons";
import { FlexRowAlignCenter } from "./LandingPage/utils";

// TODO: Adjust this when additional buttons are added to the header.
const AICS_LOGO_RESIZE_THRESHOLD_PX = 610;
/**
 * Used to determine header height on viewer page.
 * TODO: Determine this dynamically?
 */
export const HEADER_HEIGHT_PX = 61;

const HeaderTitleLink = styled(Link)`
  &&,
  && h1 {
    color: var(--color-header-title);
    font-size: 20px;
    margin: 0;

    &:hover {
      color: var(--color-header-hover-title);
    }
    /* Do not show underline on app title link */
    text-decoration: none;
  }
`;

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
      max-width: 36px;
      max-height: 36px;
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
  background-color: var(--color-layout-dividers);
  display: inline-block;
  margin: 0 16px;

  @media only screen and (max-width: ${AICS_LOGO_RESIZE_THRESHOLD_PX}px) {
    margin: 0 10px;
  }
`;

/**
 * The logo and title of the app, to be used with the Header component.
 * Both the logo and app title are links that can be used for navigation.
 */
function HeaderLogo({ noNavigate }: { noNavigate?: boolean }): ReactElement {
  return (
    <FlexRowAlignCenter>
      <AicsLogoLink href="https://www.allencell.org/" rel="noopener noreferrer" target="_blank">
        <div title={"https://www.allencell.org"}>
          <AicsLogoSVG />
          <AicsLogoAndNameSVG />
        </div>
      </AicsLogoLink>
      <VerticalDivider />
      <HeaderTitleLink
        to="/"
        aria-label="Go to home page"
        rel="noopener noreferrer"
        target={noNavigate ? "_blank" : undefined}
      >
        <h1>Vol-E</h1>
      </HeaderTitleLink>
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
  padding: 12px 20px;
  border-bottom: 1px solid var(--color-header-border);
  gap: 10px;
  position: sticky;
  background-color: var(--color-header-bg);
`;

type HeaderProps = {
  /** Optional element for alerts; will be rendered under the main header bar and use sticky positioning. */
  alertElement?: ReactElement;
  /** When `true`, open links in a new tab rather than navigating away and causing the user to potentially lose work. */
  noNavigate?: boolean;
  title?: string;
};

export default function Header(props: PropsWithChildren<HeaderProps>): ReactElement {
  return (
    <StickyContainer>
      <HeaderContainer>
        <HeaderLogo noNavigate={props.noNavigate} />
        {props.title && <h3 style={{ margin: 0 }}>{props.title}</h3>}
        {props.children}
      </HeaderContainer>
      {props.alertElement}
    </StickyContainer>
  );
}
