import { faUpRightFromSquare } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Button } from "antd";
import React, { type ReactElement } from "react";
import { type ErrorResponse, Link, useRouteError } from "react-router-dom";
import styled from "styled-components";

import { FlexColumnAlignCenter } from "./LandingPage/utils";

import Header from "./Header";

const ErrorPageWrapper = styled.div`
  background-color: var(--color-landingpage-bg);
  h2,
  h3,
  p {
    margin: 0;
  }
`;

type ErrorPageProps = {};

const isErrorResponse = (error: unknown): error is ErrorResponse => {
  return typeof (error as ErrorResponse).status === "number" && typeof (error as ErrorResponse).statusText === "string";
};

export default function ErrorPage(props: ErrorPageProps): ReactElement {
  const error = useRouteError() as unknown;
  let errorMessage = "";

  if (isErrorResponse(error)) {
    errorMessage = error.status + " " + error.statusText;
  } else if (error instanceof Error) {
    errorMessage = error.message;
  } else {
    errorMessage = "Unknown error";
  }

  return (
    <ErrorPageWrapper style={{ background: "var(--color-landingpage-bg)", height: "100%" }}>
      <Header></Header>
      <FlexColumnAlignCenter style={{ width: "100%", padding: "40px 0" }}>
        <h1>Sorry, something went wrong.</h1>
        <FlexColumnAlignCenter>
          <p>We encountered the following error:</p>
          <FlexColumnAlignCenter style={{ margin: "20px 0" }} $gap={10}>
            <h3>{errorMessage}</h3>
            <p>
              <i>Check the browser console for more details.</i>
            </p>
          </FlexColumnAlignCenter>
          <p>
            If the issue persists after a refresh,{" "}
            <Link
              to="https://github.com/allen-cell-animated/vole-app/issues/new?template=bug_report.md"
              rel="noopener noreferrer"
              target="_blank"
            >
              please click here to report it.
              <FontAwesomeIcon
                icon={faUpRightFromSquare}
                size="sm"
                style={{ marginBottom: "-1px", marginLeft: "3px" }}
              />
            </Link>
          </p>
        </FlexColumnAlignCenter>
        <br />
        {/* TODO: Bad practice to wrap a button inside a link, since it's confusing for tab navigation. */}
        <Link to="/">
          <Button type="primary">Return to homepage</Button>
        </Link>
      </FlexColumnAlignCenter>
    </ErrorPageWrapper>
  );
}
