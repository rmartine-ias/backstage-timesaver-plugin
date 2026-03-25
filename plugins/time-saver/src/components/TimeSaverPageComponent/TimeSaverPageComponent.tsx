import { SetStateAction, useState } from 'react';
import { Tabs, Tab } from '@material-ui/core';
import {
  Page,
  Content,
  ContentHeader,
  SupportButton,
} from '@backstage/core-components';
import { AllStatsContent } from '../AllStatsSubPage/AllStatsSubPage';
import { ByTeamContent } from '../ByTeamSubPage/ByTeamSubPage';
import { ByTemplateContent } from '../ByTemplateSubPage/ByTemplateSubPage';
import CustomHeader, {
  HeaderProps,
} from '../TimeSaverHeader/TimeSaverHeaderComponent';

export const TimeSaverPageComponent = (props: HeaderProps) => {
  const [selectedTab, setSelectedTab] = useState(0);

  const handleChange = (
    _event: unknown,
    _newValue: SetStateAction<number>,
  ) => {
    setSelectedTab(_newValue);
  };

  return (
    <Page themeId="tool">
      <CustomHeader
        title={props.title}
        subtitle={props.subtitle}
        headerLabel={props.headerLabel}
      />
      <Content>
        <ContentHeader title="Time Saver">
          <Tabs value={selectedTab} onChange={handleChange} centered={false}>
            <Tab label="All Stats" />
            <Tab label="By Team" />
            <Tab label="By Template" />
          </Tabs>
          <SupportButton>
            Time Saver plugin retrieves its config from template.metadata and
            groups it in a dedicated table, then it has a bunch of APIs for
            data queries
          </SupportButton>
        </ContentHeader>
        {selectedTab === 0 && <AllStatsContent />}
        {selectedTab === 1 && <ByTeamContent />}
        {selectedTab === 2 && <ByTemplateContent />}
      </Content>
    </Page>
  );
};
