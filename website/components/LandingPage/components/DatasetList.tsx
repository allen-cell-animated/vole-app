import { Button } from "antd";
import React, { type ReactElement } from "react";
import styled from "styled-components";

import { DatasetEntry, LoadDatasetCallback } from "../../../types";
import { VisuallyHidden } from "../utils";

const DatasetListContainer = styled.ul`
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
`;

const DatasetCardContainer = styled.li`
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
`;

type DatasetCardProps = {
  dataset: DatasetEntry;
  index: number;
  onClickLoad: LoadDatasetCallback;
};

function DatasetCard(props: DatasetCardProps): ReactElement {
  const { dataset, index, onClickLoad } = props;

  return (
    <DatasetCardContainer key={index}>
      <h3>{dataset.name}</h3>
      <p>{dataset.description}</p>
      <div>
        <Button
          type="primary"
          onClick={() => onClickLoad(dataset.loadParams, dataset.hideTitle)}
          // Aligns text vertically
          style={{ paddingTop: 5 }}
        >
          Load<VisuallyHidden> dataset {dataset.name}</VisuallyHidden>
        </Button>
      </div>
    </DatasetCardContainer>
  );
}

type DatasetListProps = {
  datasets: DatasetEntry[];
  onClickLoad: LoadDatasetCallback;
};

/** Displays a list of datasets with a name, description, and load link. */
export default function DatasetList(props: DatasetListProps): ReactElement {
  const { datasets, onClickLoad } = props;

  return (
    <DatasetListContainer>
      {datasets.map((dataset, index) => (
        <DatasetCard dataset={dataset} index={index} key={index} onClickLoad={onClickLoad} />
      ))}
    </DatasetListContainer>
  );
}
