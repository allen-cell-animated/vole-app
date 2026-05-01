import { type Volume, type VolumeLoadError, VolumeLoadErrorType } from "@aics/vole-core";
import { LeftOutlined, RightOutlined, WarningOutlined } from "@ant-design/icons";
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

const ERROR_TYPE_DESCRIPTIONS: { [T in VolumeLoadErrorType]: React.ReactNode } = {
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
  [VolumeLoadErrorType.TOO_LARGE]: (
    <>
      No resolution level is available for this volume which fits within our maximum memory footprint. This maximum is
      tuned to ensure compatibility with the majority of browsers. If you&apos;re trying to load your own OME-Zarr
      dataset, you may be able to open this volume by including a lower resolution level.
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

type ErrorInfo = {
  error: unknown;
  count: number;
  dims?: [number, number, number, number, number];
};

const getErrorDescription = ({ error, dims }: ErrorInfo): React.ReactNode => {
  const type: VolumeLoadErrorType | undefined = (error as VolumeLoadError).type;
  if (!type) {
    return (
      (typeof error === "object" && error !== null && (error as ErrorAlertDescription).description) ||
      UNKNOWN_ERROR_DESCRIPTION
    );
  }
  if (type === VolumeLoadErrorType.TOO_LARGE && useViewerState.getState().useExactScaleLevel) {
    let dimsDetail = "";
    if (Array.isArray(dims)) {
      const [_t, _c, z, y, x] = dims;
      dimsDetail = ` (${x} x ${y} x ${z})`;
    }

    return (
      <>
        The viewer cannot load this resolution level{dimsDetail} within memory limits. Try again with a smaller
        resolution level.
      </>
    );
  }
  return ERROR_TYPE_DESCRIPTIONS[type] ?? UNKNOWN_ERROR_DESCRIPTION;
};

export type ErrorAlertProps = {
  errors: ErrorInfo[];
  afterClose?: () => void;
};

const ErrorAlert: React.FC<ErrorAlertProps> = ({ errors, afterClose }) => {
  const [showDetails, setShowDetails] = React.useState(false);
  const [errorIndex, setErrorIndex] = React.useState(0);
  const [flash, setFlash] = React.useState(false);
  const error = errors[errorIndex];

  const infoStyle = { display: showDetails ? undefined : "none" } as const;

  React.useEffect(() => {
    setErrorIndex(errors.length - 1);
    setFlash(errors.length > 1);
    window.setTimeout(() => setFlash(false), 100);
  }, [errors]);

  const cause = (error.error as any).cause;
  const msg = (
    <>
      <div className="error-title">
        {getErrorTitle(error.error) + (error.count > 1 ? ` (${error.count})` : "")}{" "}
        <Button type="text" onClick={() => setShowDetails(!showDetails)}>
          {showDetails ? "Show less info" : "Show more info"}
        </Button>
      </div>
      <div style={infoStyle}>{getErrorDescription(error)}</div>
      {cause !== undefined && (
        <div className="error-cause" style={infoStyle}>
          Caused by {getErrorTitle(cause)}
        </div>
      )}
    </>
  );

  let pageButton: React.ReactNode = undefined;

  if (errors.length > 1) {
    if (errorIndex === errors.length - 1) {
      pageButton = (
        <Button type="text" onClick={() => setErrorIndex((i) => i - 1)}>
          <LeftOutlined /> {errors.length - 1} previous error{errors.length > 2 ? "s" : ""}
        </Button>
      );
    } else {
      pageButton = (
        <>
          {errorIndex > 0 && (
            <Button type="text" onClick={() => setErrorIndex((i) => i - 1)}>
              <LeftOutlined />
            </Button>
          )}
          Error {errorIndex + 1} of {errors.length}
          <Button type="text" onClick={() => setErrorIndex((i) => i + 1)}>
            <RightOutlined />
          </Button>
        </>
      );
    }
  }

  const alertClass = flash ? "load-error-alert error-flash" : "load-error-alert";
  return (
    <Alert
      showIcon
      closable
      type="error"
      icon={<WarningOutlined />}
      className={alertClass}
      message={msg}
      afterClose={afterClose}
      action={pageButton}
    />
  );
};

export const useErrorAlert = (): [React.ReactNode, (error: unknown, image?: Volume) => void] => {
  const [errors, setErrors] = React.useState<ErrorInfo[]>([]);
  // Keep track of which errors have been seen and how many times
  const seenErrors = useConstructor(() => new Map<string, number>());

  const addError = React.useCallback(
    (error: unknown, image?: Volume) => {
      const errorTitle = getErrorTitle(error);
      console.error(error instanceof Error ? error : errorTitle);
      const count = (seenErrors.get(errorTitle) ?? 0) + 1;

      const imageInfo = image?.imageInfo.imageInfo;
      const dims = imageInfo && imageInfo.multiscaleLevelDims[imageInfo.multiscaleLevel].shape;

      setErrors((prev) => [...prev, { error, count, dims }]);
      seenErrors.set(errorTitle, count);
    },
    [seenErrors]
  );

  const afterClose = React.useCallback(() => setErrors([]), []);

  const alertNode = errors.length > 0 && <ErrorAlert errors={errors} afterClose={afterClose} />;
  return [alertNode, addError];
};

export default ErrorAlert;
