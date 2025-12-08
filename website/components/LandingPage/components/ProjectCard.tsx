import { Button, Tooltip } from "antd";
import React, { type ReactElement } from "react";
import styled from "styled-components";

import { LoadDatasetCallback, ProjectEntry } from "../../../types";
import { ExternalLink, FlexRowAlignCenter, VisuallyHidden } from "../utils";

import DatasetList from "./DatasetList";

const ProjectContainer = styled.li`
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
`;

type ProjectCardProps = {
  project: ProjectEntry;
  index: number;
  onClickLoad: LoadDatasetCallback;
};

const InReviewFlag = styled(FlexRowAlignCenter)`
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
`;

export default function ProjectCard(props: ProjectCardProps): ReactElement {
  const { project, index, onClickLoad } = props;

  const projectNameElement = project.inReview ? (
    <FlexRowAlignCenter $gap={10}>
      <h2>{project.name}</h2>
      <Tooltip title="Final version of dataset will be released when associated paper is published">
        <InReviewFlag>
          <p>IN REVIEW</p>
        </InReviewFlag>
      </Tooltip>
    </FlexRowAlignCenter>
  ) : (
    <h2>{project.name}</h2>
  );

  const publication = project.publicationInfo;
  const publicationElement = publication ? (
    <p>
      Related publication: <ExternalLink href={publication.url.toString()}>{publication.name}</ExternalLink> (
      {publication.citation})
    </p>
  ) : null;

  const loadButton = project.loadParams ? (
    <div>
      <Button
        onClick={() => onClickLoad(project.loadParams!, project.hideTitle)}
        // Aligns text vertically
        style={{ paddingTop: 5 }}
      >
        Load<VisuallyHidden> dataset {project.name}</VisuallyHidden>
      </Button>
    </div>
  ) : null;

  // TODO: Break up list of datasets when too long and hide under collapsible section.
  const datasetList = project.datasets ? <DatasetList datasets={project.datasets} onClickLoad={onClickLoad} /> : null;

  return (
    <ProjectContainer key={index}>
      {projectNameElement}
      <p>{project.description}</p>
      {publicationElement}
      {loadButton}
      {datasetList}
    </ProjectContainer>
  );
}
