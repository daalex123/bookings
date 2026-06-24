import type { BookingDetails } from "@/lib/notifications/templates";
import {
  businessBookingWhatsApp,
  businessBookingWhatsAppTemplateParams,
  businessCancellationWhatsApp,
  businessCancellationWhatsAppTemplateParams,
  businessConfirmedWhatsApp,
  businessConfirmedWhatsAppTemplateParams,
} from "@/lib/notifications/templates";
import {
  getMetaWhatsAppTemplateNames,
  isWhatsAppConfigured,
  sendMetaWhatsAppTemplateOrText,
} from "@/lib/notifications/meta-whatsapp";

export { isWhatsAppConfigured };

export type BusinessWhatsAppNotification =
  | { type: "new_booking"; details: BookingDetails }
  | { type: "booking_cancelled"; details: BookingDetails }
  | { type: "booking_confirmed"; details: BookingDetails };

export async function sendBusinessWhatsApp(
  to: string,
  notification: BusinessWhatsAppNotification
): Promise<boolean> {
  if (!isWhatsAppConfigured()) return false;

  const templates = getMetaWhatsAppTemplateNames();

  switch (notification.type) {
    case "new_booking":
      return sendMetaWhatsAppTemplateOrText(
        to,
        templates.newBooking,
        businessBookingWhatsAppTemplateParams(notification.details),
        businessBookingWhatsApp(notification.details)
      );
    case "booking_cancelled":
      return sendMetaWhatsAppTemplateOrText(
        to,
        templates.cancelled,
        businessCancellationWhatsAppTemplateParams(notification.details),
        businessCancellationWhatsApp(notification.details)
      );
    case "booking_confirmed":
      return sendMetaWhatsAppTemplateOrText(
        to,
        templates.confirmed,
        businessConfirmedWhatsAppTemplateParams(notification.details),
        businessConfirmedWhatsApp(notification.details)
      );
  }
}
