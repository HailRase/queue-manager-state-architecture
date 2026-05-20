/**
 * - purpose: re-export notification payload types
 * - inputs: none
 * - outputs: INotification, ISOSNotification
 * - source: src/widgets/Notification/model/Notification.interfaces
 * - usage: notificationsStore + selectors
 */

export type {
  INotification,
  ISOSNotification,
  NotificationType,
  NotificationPosition,
} from '../../../src/widgets/Notification/model/Notification.interfaces';
