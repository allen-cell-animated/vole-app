import { type VolumeLoadError, VolumeLoadErrorType } from "@aics/vole-core";
import { RightOutlined } from "@ant-design/icons";
import { Alert, Button } from "antd";
import React from "react";

import { useConstructor } from "../../shared/utils/hooks";
import { useViewerState } from "../../state/store";

import "./styles.css";

export type ErrorAlertDescription = {
  title: string;
  description: React.ReactNode;
};

const IssueLink: React.FC<React.PropsWithChildren<{ bug?: boolean }>> = ({ bug, children }) => (
  <a
    href={`https://github.com/allen-cell-animated/vole-app/issues/new${bug ? "?template=bug_report.md" : "/choose"}`}
    target="_blank"
    rel="noreferrer noopener"
  >
    {children}
  </a>
);

const UNKNOWN_ERROR_DESCRIPTION: React.ReactNode = (
  <>
    An unknown error occurred. Check the browser console (F12) for more details. If this looks like a bug,{" "}
    <IssueLink bug>send us a bug report here</IssueLink>.
  </>
);

type DescribedErrorTypes = Exclude<VolumeLoadErrorType, VolumeLoadErrorType.TOO_LARGE>;
const ERROR_TYPE_DESCRIPTIONS: { [T in DescribedErrorTypes]: React.ReactNode } = {
  [VolumeLoadErrorType.UNKNOWN]: (
    <>
      An unknown error occurred while loading volume data. Check the browser console (F12) for more details. If this
      looks like a bug, <IssueLink bug>send us a bug report here</IssueLink>.
    </>
  ),
  [VolumeLoadErrorType.NOT_FOUND]: (
    <>
      The viewer was unable to find any volume data at the specified location. Check that the provided URL is correct
      and try again.
    </>
  ),
  [VolumeLoadErrorType.LOAD_DATA_FAILED]: (
    <>
      The viewer was able to find a source of volume data at the specified location, but encountered an error while
      trying to load it. Check that your dataset is complete and properly formatted. You can also check the browser
      console (F12) for more details about this error. If it looks like a problem on our end,{" "}
      <IssueLink bug>start a bug report here</IssueLink>.
    </>
  ),
  [VolumeLoadErrorType.INVALID_METADATA]: (
    <>
      The viewer was unable to read all necessary information from this volume&apos;s metadata. Check that your
      dataset&apos;s metadata is complete and properly formatted. If you believe your data is valid and should be
      supported by our viewer, let us know by <IssueLink>opening a GitHub issue</IssueLink>.
    </>
  ),
  [VolumeLoadErrorType.INVALID_MULTI_SOURCE_ZARR]: (
    <>
      The viewer is currently configured to consolidate multiple OME-Zarr datasets into a single volume, but the
      provided datasets can&apos;t all be matched up. Ensure that all dataset URLs are correct and that at least one
      equivalently-sized scale level exists in all datasets.
    </>
  ),
};

const getErrorTitle = (error: unknown): string =>
  (error instanceof Error && error.toString?.()) ||
  (typeof error === "string" && error) ||
  (typeof error === "object" && error !== null && (error as ErrorAlertDescription).title) ||
  "Unknown error";

const getErrorDescription = (error: unknown): React.ReactNode => {
  const type: VolumeLoadErrorType | undefined = (error as VolumeLoadError).type;
  if (!type) {
    return (
      (typeof error === "object" && error !== null && (error as ErrorAlertDescription).description) ||
      UNKNOWN_ERROR_DESCRIPTION
    );
  }
  if (type === VolumeLoadErrorType.TOO_LARGE) {
    if (useViewerState.getState().useExactScaleLevel) {
      return (
        <>
          The viewer cannot load this resolution level within memory limits. Try again with a smaller resolution level.
        </>
      );
    } else {
      return (
        <>
          No resolution level is available for this volume which fits within our maximum memory footprint. This maximum
          is tuned to ensure compatibility with the majority of browsers. If you&apos;re trying to load your own
          OME-Zarr dataset, you may be able to open this volume by including a lower resolution level.
        </>
      );
    }
  }
  return ERROR_TYPE_DESCRIPTIONS[type] ?? UNKNOWN_ERROR_DESCRIPTION;
};

export type ErrorAlertProps = {
  errors: unknown;
  /** The number of times we've seen an error of the type that is currently being displayed before */
  firstErrorCount?: number;
  afterClose?: () => void;
  onSkipError?: () => void;
};

const ErrorAlert: React.FC<ErrorAlertProps> = ({ errors, firstErrorCount = 0, afterClose, onSkipError }) => {
  const [showDetails, setShowDetails] = React.useState(false);
  const [errorsSeenCount, setErrorsSeenCount] = React.useState(0);
  const error = Array.isArray(errors) ? errors[0] : errors;

  const infoStyle = { display: showDetails ? undefined : "none" } as const;

  const errorMessage = (
    <>
      <div className="error-title">
        {getErrorTitle(error) + (firstErrorCount > 1 ? ` (${firstErrorCount})` : "")}{" "}
        <Button type="text" onClick={() => setShowDetails(!showDetails)}>
          {showDetails ? "Show less info" : "Show more info"}
        </Button>
      </div>
      <div style={infoStyle}>{getErrorDescription(error)}</div>
      {error.cause !== undefined && (
        <div className="error-cause" style={infoStyle}>
          Caused by: {getErrorTitle(error.cause)}
        </div>
      )}
    </>
  );

  const skipErrorButton = Array.isArray(errors) && errors.length > 1 && (
    <Button
      type="text"
      onClick={() => {
        setErrorsSeenCount((count) => count + 1);
        onSkipError?.();
      }}
    >
      Error {errorsSeenCount + 1} of {errors.length + errorsSeenCount} <RightOutlined />
    </Button>
  );

  return (
    <Alert
      showIcon
      type="error"
      className="load-error-alert"
      message={errorMessage}
      closable
      afterClose={() => {
        setErrorsSeenCount(0);
        afterClose?.();
      }}
      action={skipErrorButton}
    />
  );
};

export const useErrorAlert = (): [React.ReactNode, (error: unknown) => void] => {
  const [errorList, setErrorList] = React.useState<unknown[]>([]);
  // Keep track of which errors have been seen and how many times
  const seenErrors = useConstructor(() => new Map<string, number>());
  const [errorCounts, setErrorCounts] = React.useState<number[]>([]);

  const addError = React.useCallback(
    (error: unknown) => {
      const errorTitle = getErrorTitle(error);
      console.error(error instanceof Error ? error : errorTitle);
      const errorSeenCount = (seenErrors.get(errorTitle) ?? 0) + 1;

      setErrorList((prev) => [...prev, error]);
      setErrorCounts((prev) => [...prev, errorSeenCount]);
      seenErrors.set(errorTitle, errorSeenCount);
    },
    [seenErrors]
  );

  const onSkipError = React.useCallback(() => {
    setErrorList((prev) => prev.slice(1));
    setErrorCounts((prev) => prev.slice(1));
  }, []);

  const afterClose = React.useCallback(() => {
    setErrorList([]);
    setErrorCounts([]);
  }, []);

  const errCount = errorCounts[0];
  const alertComponent = errorList.length > 0 && (
    <ErrorAlert errors={errorList} firstErrorCount={errCount} onSkipError={onSkipError} afterClose={afterClose} />
  );
  return [alertComponent, addError];
};

export default ErrorAlert;
