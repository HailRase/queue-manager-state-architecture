/* eslint-disable max-lines */
import { CallbackReasonJson } from 'data/CallbackReason/CallbackReasonJson';
import { CallbackTerminationReasonJson } from 'data/CallbackTerminationReason/CallbackTerminationReasonJson';
import { Policy } from 'data/Policy/Policy';
import Dexie, { Table } from 'dexie';
import { OperatorStatusSchema } from 'features/User';
import { ExternalApplication } from 'pages/Settings/components/ExternalApplicationsTable';
import { Timezone } from 'pages/Settings/components/Timezones/mocks/mock';
import { ISkill } from 'pages/SkillGroups/model/skillGroups.interface';
import {
  AbonentsResponseSchema as Abonents,
  BaseRegexSerializer as Regex,
  Datasheet,
  DetailCallbackRequestSerializer,
  DetailCallSchema as Call,
  DetailCompanySerializer as Company,
  DetailLoadedListSerializer as LoadedList,
  ListAbonentsListsSerializer as ContactLists,
  ResponseCalendarSchema as Calendar,
  RetrieveSelectionSchema as Selection,
  RetrieveStrategyCallSchema as StrategyCall,
  StatusIdSchema as OperatorStatus,
  UserIdSchema as User,
} from 'shared/api-types';
import {
  Auth,
  CallEvent,
  CallsStatistics,
  CampaignJournal,
  ClickToCall,
  CompanyRuntime,
  Config,
  DialogScriptEvent,
  ICampaignEvent,
  ILogUserStatus,
  IPermissions,
  ISoftphoneSettings,
  KeyedUserSettings,
  OperatorStatusReason,
  QueryID,
  QueueIntegration,
  Role,
  SipData,
  SoftPhoneType,
  StatusesTransitionTreeSchema,
  UserAvatar,
} from 'shared/db-types';
import { AbonentsListsSyncLogs } from 'shared/db-types/AbonentsListsSyncLogs';
import { ICompanyStatistics } from 'shared/db-types/CompanyStatistics';
import { Defaults } from 'shared/db-types/Defaults';
import { IOutCallStatistic } from 'shared/db-types/IOutCallStatistic';
import { CalendarEvent } from 'types/calendar';
import { CallCommutation } from 'types/CallCommutation';
import { ICurrentUser } from 'types/currentUser';
import { IDialogueApplications } from 'types/dialogueApplications';
import { ForcedPostCallClosure } from 'types/forcedPostCallClosure';
import { QueueProvider } from 'types/QueueProvider';
import { RaiseCardData } from 'types/RaiseCardData';
import { PaginationMeta } from 'types/table';
import { UpdatedQueue } from 'types/UpdatedQueue';
import {
  IContact,
  IContactGroup,
  IContactGroups,
  IContactNote,
} from 'types/сontacts';
import {
  INotification,
  ISOSNotification,
} from 'widgets/Notification/model/Notification.interfaces';
import { IOrganizationPayload } from 'widgets/OrganizationalStructure/OrganizationChart/model';
import { IJournal } from 'widgets/SkillGroups/SkillGroupsHistory/model/skillGroupsListTable.interface';
import { Operator } from 'widgets/SkillGroups/SkillGroupsOperators/model/skillGroupsOperators.interface';
import { ISystemNotifications } from 'widgets/User/UserNotifications/model';

export class QmsDb extends Dexie {
  abonent!: Table<Abonents>;
  abonents_lists!: Table<ContactLists>;
  abonents_selection!: Table<Abonents>;
  auth!: Table<Auth>;
  calendar!: Table<Calendar>;
  callback_request!: Table<DetailCallbackRequestSerializer>;
  calling_rules!: Table<Datasheet>;
  calls!: Table<Call>;
  campaign_journal!: Table<CampaignJournal>;
  call_event!: Table<CallEvent>;
  calls_statistics!: Table<CallsStatistics>;
  click_to_call!: Table<ClickToCall>;
  communication_channels!: Table<Datasheet>;
  company!: Table<Company>;
  company_runtime!: Table<CompanyRuntime>;
  contact_groups!: Table<IContactGroups>;
  callback_reasons!: Table<CallbackReasonJson>;
  callback_terminate_reasons!: Table<CallbackTerminationReasonJson>;
  company_abonents!: Table<IContact>;
  company_statistics!: Table<ICompanyStatistics>;
  campaign_events!: Table<ICampaignEvent>;
  call_final_report!: Table<CallCommutation>;
  closure_reason!: Table<ForcedPostCallClosure>;
  config!: Table<Config>;
  contacts!: Table<IContact>;
  current_user!: Table<ICurrentUser>;
  department!: Table<Datasheet>;
  dialog_script_events!: Table<DialogScriptEvent>;
  employee_break_reasons!: Table<OperatorStatus>;
  employee_logout_reasons!: Table<OperatorStatus>;
  employee_statuses!: Table<Datasheet>;
  groups!: Table<IContactGroup>;
  integrations!: Table<ExternalApplication>;
  journal!: Table<IJournal>;
  loaded_list!: Table<LoadedList>;
  notes!: Table<IContactNote>;
  notification!: Table<INotification>;
  notification_sos!: Table<ISOSNotification>;
  notification_sos_list!: Table<ISOSNotification>;
  operator_select_methods!: Table<Datasheet>;
  operator_status_reasons!: Table<OperatorStatusReason>;
  operator_status_history!: Table<OperatorStatusSchema>;
  operator_statuses!: Table<OperatorStatus>;
  operators!: Table<Operator>;
  permissions!: Table<IPermissions>;
  planning!: Table<CalendarEvent>;
  queues!: Table<UpdatedQueue>;
  regex!: Table<Regex>;
  roles!: Table<Role>;
  selection!: Table<Selection>;
  skills!: Table<ISkill>;
  staff_positions!: Table<Datasheet>;
  strategy_call!: Table<StrategyCall>;
  statuses_transition_tree!: Table<StatusesTransitionTreeSchema>;
  system_notifications!: Table<ISystemNotifications>;
  timezones!: Table<Timezone>;
  user_groups!: Table<Datasheet>;
  users!: Table<User>;
  users_avatar!: Table<UserAvatar>;
  user_settings!: Table<KeyedUserSettings>;
  users_statuses_log!: Table<ILogUserStatus>;
  query_id!: Table<QueryID>;
  softphone_settings!: Table<ISoftphoneSettings>;
  queue_integrations!: Table<QueueIntegration>;
  dialogue_apps!: Table<IDialogueApplications>;
  softphone_type!: Table<SoftPhoneType>;
  organization_structure!: Table<IOrganizationPayload>;
  raise_card!: Table<RaiseCardData>;

  policies!: Table<Policy>;
  paginationMeta!: Table<PaginationMeta>;

  out_call_statistic!: Table<IOutCallStatistic>;
  defaults!: Table<Defaults>;
  abonents_lists_sync_logs!: Table<AbonentsListsSyncLogs>;
  sip_data!: Table<SipData>;
  sbc_domains!: Table<QueueProvider>;

  constructor() {
    super('QmsDb');
    this.version(67).stores({
      abonent: 'id',
      abonents_lists: 'id',
      abonents_selection: 'id',
      auth: 'id',
      calendar: 'date',
      callback_request: 'id',
      calling_rules: 'id, value',
      calls: 'id',
      campaign_journal: 'id, campaign_id, date_time',
      call_event: 'id',
      calls_statistics:
        'id, parent_id, call_type, status, ts_dlg_stop, queue_id, ts_start',
      click_to_call: 'id',
      communication_channels: 'id, value',
      company: 'id, title, state',
      company_runtime: 'company_id',
      contact_groups: 'id',
      contacts: 'id',
      current_user: 'id',
      department: 'id',
      dialog_script_events: 'id',
      employee_break_reasons: 'id',
      employee_logout_reasons: 'id',
      employee_statuses: 'id, value',
      groups: 'id',
      integrations: 'id',
      journal: 'id',
      loaded_list: 'id, abonent_list_id',
      notes: 'id',
      notification: 'id',
      notification_sos: 'id',
      notification_sos_list: 'id',
      operator_select_methods: 'id, value',
      operator_status_reasons: 'id, status, default_description, time_delta',
      operator_status_history: 'id',
      operator_statuses: 'id, status, description',
      operators: 'id',
      permissions: 'id',
      planning: 'id, company_id',
      queues: 'id, name, phone, dtmf',
      regex: 'id',
      roles: 'id, title',
      selection: 'id',
      skills: 'id',
      staff_positions: 'id, value',
      strategy_call: 'id',
      statuses_transition_tree: 'id',
      system_notifications: 'id',
      timezones: 'id',
      user_groups: 'id, value',
      users: 'id, sip_phone, is_operator, operator_skills',
      users_avatar: 'id',
      users_statuses_log: 'id',
      user_settings: 'user_id',
      query_id: 'id',
      softphone_settings: 'id',
      queue_integrations: 'id',
      dialogue_apps: 'id',
      softphone_type: 'id',
      organization_structure: 'id',
      raise_card: 'operator_login',
      config: 'name',
      forced_post_call_closure: 'closure_reason',
      policies: 'id',
      paginationMeta: 'id',
      callback_reasons: 'id',
      callback_terminate_reasons: 'id',
      company_abonents: 'id',
      company_statistics: 'id',
      out_call_statistic: 'index, abonent_id',
      campaign_events: 'id',
      defaults: 'id',
      abonents_lists_sync_logs: 'id, abonents_lists_id',
      sip_data: 'id',
      sbc_domains: 'id',
      call_final_report: 'main_acallid',
    });
  }
}

export const db = new QmsDb();
