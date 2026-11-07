import { RightOutlined } from "@ant-design/icons";
import React from "react";

import type { MetadataEntry, MetadataRecord } from "../../shared/types";

import "./styles.css";

type MetadataTableProps = {
  metadata: MetadataRecord | MetadataEntry[];
  topLevel?: boolean;
};

type CollapsibleCategoryProps = {
  metadata: MetadataRecord | MetadataEntry[];
  title: string;
};

const isCategory = (entry: MetadataEntry): entry is MetadataRecord | MetadataEntry[] =>
  typeof entry === "object" && entry !== null;

const sortCategoriesFirst = (entry: MetadataEntry): MetadataEntry => {
  if (!isCategory(entry) || Array.isArray(entry)) {
    return entry;
  }

  const cats: MetadataRecord = {};
  const vals: MetadataRecord = {};
  for (const key in entry) {
    if (isCategory(entry[key])) {
      cats[key] = entry[key];
    } else {
      vals[key] = entry[key];
    }
  }

  return { ...cats, ...vals };
};

/** Component to hold collapse state */
const MetadataCategory: React.FC<CollapsibleCategoryProps> = ({ metadata, title }) => {
  const [collapsed, setCollapsed] = React.useState(true);
  const collapsedClass = collapsed ? " metadata-collapse-collapsed" : "";

  return (
    <>
      <tr className={"metadata-row-collapse-title" + collapsedClass} onClick={() => setCollapsed(!collapsed)}>
        <td colSpan={2}>
          <span className="metadata-collapse-caret">
            <RightOutlined style={{ transform: `rotate(${collapsed ? 0 : 90}deg)` }} />
          </span>
          {title}
        </td>
      </tr>
      <tr className={"metadata-row-collapse-content" + collapsedClass}>
        <td className="metadata-collapse-content" colSpan={2}>
          <MetadataTable metadata={metadata} />
        </td>
      </tr>
    </>
  );
};

const MetadataTable: React.FC<MetadataTableProps> = ({ metadata, topLevel }) => {
  const metadataKeys = Object.keys(metadata);
  const metadataIsArray = Array.isArray(metadata);

  return (
    <table className={"viewer-metadata-table" + (topLevel ? " metadata-top-level" : "")}>
      <tbody>
        {metadataKeys.map((key, idx) => {
          const metadataValue = sortCategoriesFirst(metadataIsArray ? metadata[idx] : metadata[key]);

          if (isCategory(metadataValue)) {
            return <MetadataCategory key={key} metadata={metadataValue} title={key} />;
          } else {
            return (
              <tr key={key}>
                <td className="metadata-key">{key}</td>
                <td className="metadata-value">{metadataValue + ""}</td>
              </tr>
            );
          }
        })}
      </tbody>
    </table>
  );
};

const MetadataViewer: React.FC<{ metadata: MetadataRecord }> = ({ metadata }) => (
  <MetadataTable metadata={metadata} topLevel={true} />
);

export default MetadataViewer;
