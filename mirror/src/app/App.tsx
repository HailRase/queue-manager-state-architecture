// import { UcellOperatorCard } from 'shared/ui/UcellOperatorCard';
import { WebSocketProvider } from 'app/providers/WebSocketProvider';
import { router } from 'app/routes';
import { NewVersionOverlay, SystemLogger } from 'features';
import { CampaignEvent } from 'features/CampaignEvent/CampaignEvent';
import { FC } from 'react';
import { RouterProvider } from 'react-router-dom';
import { DataChannel, SoftPhone } from 'shared/ui';
import { WebimChatModal } from 'shared/ui/WebimChatModal';
import { CallEvents } from 'widgets/CallEvents';
import { DialogScript } from 'widgets/DialogScript/DialogScript';

import {
  CallsStatisticsProvider,
  HelpCenterProvider,
  TableDataProvider,
  UsersStatusesLogProvider,
} from './providers';
import { PermissionsProvider } from './providers/PermissionsProvider';
import { SystemLoggerProvider } from './providers/SystemLoggerProvider';
import { UserSettingsProvider } from './providers/UserSettingsProvider';

export const App: FC = () => {
  return (
    <div className={'app'}>
      <NewVersionOverlay />
      <PermissionsProvider>
        <SystemLoggerProvider>
          <TableDataProvider>
            <CallsStatisticsProvider>
              <UsersStatusesLogProvider>
                <WebSocketProvider>
                  <HelpCenterProvider>
                    <UserSettingsProvider>
                      <SystemLogger />
                      <CampaignEvent />
                      <CallEvents />
                      <DataChannel />
                      <SoftPhone />
                      <DialogScript />
                      <RouterProvider router={router} />
                      <WebimChatModal />
                      {/* <UcellOperatorCard /> */}
                    </UserSettingsProvider>
                  </HelpCenterProvider>
                </WebSocketProvider>
              </UsersStatusesLogProvider>
            </CallsStatisticsProvider>
          </TableDataProvider>
        </SystemLoggerProvider>
      </PermissionsProvider>
    </div>
  );
};
