import { LocalNotifications, PermissionStatus } from '@capacitor/local-notifications';
import { Preferences } from '@capacitor/preferences';
import { CropCalendarSchedule } from './plantingCalendarService';

export interface StoredReminder {
  id: number;
  category: 'planting' | 'harvest' | 'livestock' | 'water' | 'soil' | 'crop_followup';
  key: string; // unique reference key e.g. "planting-onion", "harvest-onion-3d", "livestock-chickens-newcastle"
  title: string;
  body: string;
  titleHa: string;
  bodyHa: string;
  targetDateIso: string;
  targetTimestamp: number;
  createdAt: number;
  startDateFormattedEn?: string;
  startDateFormattedHa?: string;
  extra?: Record<string, any>;
}

const REMINDERS_STORAGE_KEY = 'smartvillage_unified_reminders';
const LEGACY_PLANTING_KEY = 'smartvillage_planting_reminders';

const MONTH_NAMES_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const MONTH_NAMES_HA = [
  'Janairu', 'Fabrairu', 'Maris', 'Afirilu', 'Mayu', 'Yuni',
  'Yuli', 'Agusta', 'Satumba', 'Oktoba', 'Nuwamba', 'Disamba'
];

/**
 * Generate a consistent 32-bit positive integer notification ID from a unique string key.
 */
export function getNotificationIdForKey(key: string): number {
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash << 5) - hash + key.charCodeAt(i);
    hash |= 0;
  }
  return (Math.abs(hash) % 2147483640) + 1000;
}

export function getNotificationIdForCrop(cropId: string): number {
  return getNotificationIdForKey(`planting-${cropId}`);
}

/**
 * Determine the planting start date for a crop, taking into account any active seasonal window.
 */
export function getPlantingStartDate(
  crop: CropCalendarSchedule,
  selectedMonth?: number
): { month: number; day: number; labelEn?: string; labelHa?: string } {
  if (selectedMonth && crop.plantingWindows && crop.plantingWindows.length > 0) {
    const matched = crop.plantingWindows.find((w) => {
      if (w.startMonth <= w.endMonth) {
        return selectedMonth >= w.startMonth && selectedMonth <= w.endMonth;
      } else {
        return selectedMonth >= w.startMonth || selectedMonth <= w.endMonth;
      }
    });

    if (matched) {
      return {
        month: matched.startMonth,
        day: matched.startDay,
        labelEn: matched.seasonLabelEn,
        labelHa: matched.seasonLabelHa,
      };
    }
  }

  return {
    month: crop.plantingStartMonth,
    day: crop.plantingStartDay,
  };
}

/**
 * Calculate the next upcoming Date object for the planting start date (8:00 AM).
 */
export function calculateNextPlantingDate(month: number, day: number): Date {
  const now = new Date();
  let targetYear = now.getFullYear();

  const target = new Date(targetYear, month - 1, day, 8, 0, 0, 0);

  if (target.getTime() <= now.getTime()) {
    target.setFullYear(targetYear + 1);
  }

  return target;
}

export const reminderService = {
  /**
   * Load all stored reminders from Preferences (survives app restart).
   */
  async getStoredReminders(): Promise<Record<string, StoredReminder>> {
    try {
      const { value } = await Preferences.get({ key: REMINDERS_STORAGE_KEY });
      if (value) {
        return JSON.parse(value);
      }
    } catch (err) {
      console.warn('Preferences read warning, checking fallback:', err);
    }

    try {
      const fallback = localStorage.getItem(REMINDERS_STORAGE_KEY) || localStorage.getItem(LEGACY_PLANTING_KEY);
      return fallback ? JSON.parse(fallback) : {};
    } catch {
      return {};
    }
  },

  /**
   * Save or update a reminder in Preferences.
   */
  async saveReminder(reminder: StoredReminder): Promise<void> {
    try {
      const current = await this.getStoredReminders();
      current[reminder.key] = reminder;
      // Also alias by cropId if category is planting for backward compatibility
      if (reminder.category === 'planting' && reminder.extra?.cropId) {
        current[reminder.extra.cropId] = reminder;
      }
      const json = JSON.stringify(current);
      await Preferences.set({ key: REMINDERS_STORAGE_KEY, value: json });
      try {
        localStorage.setItem(REMINDERS_STORAGE_KEY, json);
      } catch {}
    } catch (err) {
      console.warn('Could not save reminder to Preferences:', err);
    }
  },

  /**
   * Remove a reminder from Preferences.
   */
  async deleteReminder(key: string): Promise<void> {
    try {
      const current = await this.getStoredReminders();
      delete current[key];
      // Also delete cropId alias if any
      for (const k of Object.keys(current)) {
        if (current[k]?.extra?.cropId === key || current[k]?.key === key) {
          delete current[k];
        }
      }
      const json = JSON.stringify(current);
      await Preferences.set({ key: REMINDERS_STORAGE_KEY, value: json });
      try {
        localStorage.setItem(REMINDERS_STORAGE_KEY, json);
      } catch {}
    } catch (err) {
      console.warn('Could not delete reminder from Preferences:', err);
    }
  },

  /**
   * Check current local notification permission.
   */
  async checkPermission(): Promise<'granted' | 'denied' | 'prompt'> {
    try {
      const status: PermissionStatus = await LocalNotifications.checkPermissions();
      if (status.display === 'granted') return 'granted';
      if (status.display === 'denied') return 'denied';
      return 'prompt';
    } catch {
      if (typeof window !== 'undefined' && 'Notification' in window) {
        if (Notification.permission === 'granted') return 'granted';
        if (Notification.permission === 'denied') return 'denied';
      }
      return 'prompt';
    }
  },

  /**
   * Request local notification permission from user.
   */
  async requestPermission(): Promise<boolean> {
    try {
      const status = await LocalNotifications.requestPermissions();
      if (status.display === 'granted') {
        return true;
      }
    } catch (err) {
      console.warn('LocalNotifications.requestPermissions error:', err);
    }

    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const webPerm = await Notification.requestPermission();
        return webPerm === 'granted';
      } catch {}
    }

    return false;
  },

  // ==========================================
  // 1. FARMING CALENDAR (PLANTING)
  // ==========================================
  async scheduleCropReminder(
    crop: CropCalendarSchedule,
    selectedMonth?: number
  ): Promise<{ success: boolean; reminder?: StoredReminder; error?: string }> {
    const { month, day } = getPlantingStartDate(crop, selectedMonth);
    const targetDate = calculateNextPlantingDate(month, day);
    const key = `planting-${crop.id}`;
    const notifId = getNotificationIdForKey(key);

    const dateFormattedEn = `${MONTH_NAMES_EN[month - 1]} ${day}`;
    const dateFormattedHa = `${day} ga ${MONTH_NAMES_HA[month - 1]}`;

    const titleEn = `Time to plant ${crop.name}!`;
    const titleHa = `Lokacin shuka ${crop.hausa_name} ya yi!`;
    const bodyEn = `SmartVillage Calendar: Start of ${crop.name} (${crop.hausa_name}) planting window.`;
    const bodyHa = `Lokacin fara shuka ${crop.hausa_name} a gona ya yi.`;

    const reminder: StoredReminder = {
      id: notifId,
      category: 'planting',
      key,
      title: `${titleEn} • ${titleHa}`,
      body: `${bodyEn} / ${bodyHa}`,
      titleHa,
      bodyHa,
      targetDateIso: targetDate.toISOString(),
      targetTimestamp: targetDate.getTime(),
      createdAt: Date.now(),
      extra: {
        cropId: crop.id,
        cropName: crop.name,
        cropHausaName: crop.hausa_name,
        startMonth: month,
        startDay: day,
        startDateFormattedEn: dateFormattedEn,
        startDateFormattedHa: dateFormattedHa,
      },
    };

    try {
      await LocalNotifications.cancel({ notifications: [{ id: notifId }] }).catch(() => {});
      await LocalNotifications.schedule({
        notifications: [
          {
            id: notifId,
            title: reminder.title,
            body: reminder.body,
            schedule: { at: targetDate },
            smallIcon: 'ic_stat_name',
            extra: { key, category: 'planting', cropId: crop.id },
          },
        ],
      });
    } catch (err) {
      console.warn('LocalNotifications schedule note:', err);
    }

    await this.saveReminder(reminder);
    return { success: true, reminder };
  },

  async cancelCropReminder(cropId: string): Promise<boolean> {
    const key = `planting-${cropId}`;
    const notifId = getNotificationIdForKey(key);
    try {
      await LocalNotifications.cancel({ notifications: [{ id: notifId }] });
    } catch {}
    await this.deleteReminder(key);
    await this.deleteReminder(cropId);
    return true;
  },

  // ==========================================
  // 2. HARVEST COUNTDOWN (3 DAYS BEFORE + ON DAY)
  // ==========================================
  async scheduleHarvestReminders(
    plantedCropId: string,
    cropName: string,
    cropHausaName: string,
    fieldLabel: string,
    harvestDate: Date
  ): Promise<{ success: boolean; threeDayDate: Date; harvestDate: Date }> {
    const key3d = `harvest-${plantedCropId}-3d`;
    const keyDay = `harvest-${plantedCropId}-day`;
    const id3d = getNotificationIdForKey(key3d);
    const idDay = getNotificationIdForKey(keyDay);

    // Calculate 3 days before harvest at 8:00 AM
    const threeDayDate = new Date(harvestDate.getTime() - 3 * 24 * 60 * 60 * 1000);
    threeDayDate.setHours(8, 0, 0, 0);

    const harvestDayDate = new Date(harvestDate.getTime());
    harvestDayDate.setHours(8, 0, 0, 0);

    const now = Date.now();

    const notificationsToSchedule = [];

    // Notification 1: 3 Days Before
    if (threeDayDate.getTime() > now) {
      const title3d = `Harvest preparation for ${cropName}! 3 days left • Shirin girbin ${cropHausaName}! Sauran kwanaki 3`;
      const body3d = `3 days remaining until harvest at ${fieldLabel}. Prepare drying mats and storage / Sauran kwanaki 3 a fara girbi a ${fieldLabel}.`;

      const reminder3d: StoredReminder = {
        id: id3d,
        category: 'harvest',
        key: key3d,
        title: title3d,
        body: body3d,
        titleHa: `Sauran kwanaki 3 a fara girbin ${cropHausaName}!`,
        bodyHa: `Shirya rumbu da wurin shanya amfanin gona na ${fieldLabel}.`,
        targetDateIso: threeDayDate.toISOString(),
        targetTimestamp: threeDayDate.getTime(),
        createdAt: now,
        extra: { plantedCropId, cropName, cropHausaName, type: '3day_warning' },
      };

      await this.saveReminder(reminder3d);
      notificationsToSchedule.push({
        id: id3d,
        title: title3d,
        body: body3d,
        schedule: { at: threeDayDate },
        extra: { key: key3d, category: 'harvest' },
      });
    }

    // Notification 2: On Harvest Day
    if (harvestDayDate.getTime() > now) {
      const titleDay = `Harvest Day for ${cropName}! • Ranar girbin ${cropHausaName} ta yi!`;
      const bodyDay = `Your crop at ${fieldLabel} has reached full maturity today! / Amfanin gonarka na ${fieldLabel} ya nuna a yau don girbi.`;

      const reminderDay: StoredReminder = {
        id: idDay,
        category: 'harvest',
        key: keyDay,
        title: titleDay,
        body: bodyDay,
        titleHa: `Ranar girbin ${cropHausaName} ta yi!`,
        bodyHa: `Amfanin gonarka na ${fieldLabel} ya nuna a yau don girbi.`,
        targetDateIso: harvestDayDate.toISOString(),
        targetTimestamp: harvestDayDate.getTime(),
        createdAt: now,
        extra: { plantedCropId, cropName, cropHausaName, type: 'harvest_day' },
      };

      await this.saveReminder(reminderDay);
      notificationsToSchedule.push({
        id: idDay,
        title: titleDay,
        body: bodyDay,
        schedule: { at: harvestDayDate },
        extra: { key: keyDay, category: 'harvest' },
      });
    }

    // Cancel old and schedule new
    try {
      await LocalNotifications.cancel({
        notifications: [{ id: id3d }, { id: idDay }],
      }).catch(() => {});

      if (notificationsToSchedule.length > 0) {
        await LocalNotifications.schedule({ notifications: notificationsToSchedule });
      }
    } catch (err) {
      console.warn('Harvest reminders schedule warning:', err);
    }

    // Also set parent tag for easy checking
    const parentReminder: StoredReminder = {
      id: idDay,
      category: 'harvest',
      key: `harvest-${plantedCropId}`,
      title: `Harvest Alarms for ${cropName}`,
      body: `Scheduled for 3 days before and on harvest day.`,
      titleHa: `Tunatarwar Girbin ${cropHausaName}`,
      bodyHa: `Kwanaki 3 kafin da kuma ranar girbi.`,
      targetDateIso: harvestDayDate.toISOString(),
      targetTimestamp: harvestDayDate.getTime(),
      createdAt: now,
      extra: { plantedCropId },
    };
    await this.saveReminder(parentReminder);

    return { success: true, threeDayDate, harvestDate: harvestDayDate };
  },

  async cancelHarvestReminders(plantedCropId: string): Promise<void> {
    const id3d = getNotificationIdForKey(`harvest-${plantedCropId}-3d`);
    const idDay = getNotificationIdForKey(`harvest-${plantedCropId}-day`);
    try {
      await LocalNotifications.cancel({
        notifications: [{ id: id3d }, { id: idDay }],
      });
    } catch {}

    await this.deleteReminder(`harvest-${plantedCropId}-3d`);
    await this.deleteReminder(`harvest-${plantedCropId}-day`);
    await this.deleteReminder(`harvest-${plantedCropId}`);
  },

  // ==========================================
  // 3. LIVESTOCK VACCINATION & DEWORMING
  // ==========================================
  async scheduleLivestockVaccination(
    animalId: string,
    animalName: string,
    animalHausa: string,
    vaccineName: string,
    vaccineHausa: string,
    daysAhead = 90
  ): Promise<StoredReminder> {
    const key = `livestock-${animalId}-${getNotificationIdForKey(vaccineName)}`;
    const notifId = getNotificationIdForKey(key);

    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + daysAhead);
    targetDate.setHours(8, 0, 0, 0);

    const title = `Livestock Vaccination Due: ${vaccineName} • Lokacin Allurar ${vaccineHausa}`;
    const body = `Time to administer ${vaccineName} for ${animalName} (${animalHausa}). / Lokacin yi wa ${animalHausa} allurar ${vaccineHausa} ya yi.`;

    const reminder: StoredReminder = {
      id: notifId,
      category: 'livestock',
      key,
      title,
      body,
      titleHa: `Allurar ${vaccineHausa} ta ${animalHausa} ta yi!`,
      bodyHa: `Ka kiyaye lafiyar dabbobinka ta hanyar yi musu allura ko maganin tsutsa a kan lokaci.`,
      targetDateIso: targetDate.toISOString(),
      targetTimestamp: targetDate.getTime(),
      createdAt: Date.now(),
      extra: { animalId, animalName, animalHausa, vaccineName, vaccineHausa, daysAhead },
    };

    try {
      await LocalNotifications.cancel({ notifications: [{ id: notifId }] }).catch(() => {});
      await LocalNotifications.schedule({
        notifications: [
          {
            id: notifId,
            title,
            body,
            schedule: { at: targetDate },
            extra: { key, category: 'livestock' },
          },
        ],
      });
    } catch (err) {
      console.warn('Livestock vaccination schedule caught:', err);
    }

    await this.saveReminder(reminder);
    return reminder;
  },

  async cancelLivestockReminder(key: string): Promise<void> {
    const notifId = getNotificationIdForKey(key);
    try {
      await LocalNotifications.cancel({ notifications: [{ id: notifId }] });
    } catch {}
    await this.deleteReminder(key);
  },

  // ==========================================
  // 4. WATER TREATMENT TIMERS & SAFE REFRESH
  // ==========================================
  async scheduleWaterTreatmentReminder(
    type: 'waterguard_30min' | 'boiling_safe' | 'storage_refresh_24h'
  ): Promise<StoredReminder> {
    const key = `water-${type}`;
    const notifId = getNotificationIdForKey(key);

    const targetDate = new Date();
    let title = '';
    let body = '';
    let titleHa = '';
    let bodyHa = '';

    if (type === 'waterguard_30min') {
      targetDate.setMinutes(targetDate.getMinutes() + 30);
      title = `Safe Water Ready to Drink! • Ruwa ya yi Tsabta don Sha!`;
      body = `The 30-minute WaterGuard disinfection period is complete. Safe for household drinking. / Minti 30 na WaterGuard ya cika. Ruwan yana da tsabta don sha.`;
      titleHa = `Ruwa ya yi Tsabta don Sha!`;
      bodyHa = `Minti 30 na WaterGuard ya cika. Ruwanku ya zama mai aminci.`;
    } else if (type === 'storage_refresh_24h') {
      targetDate.setHours(targetDate.getHours() + 24);
      title = `Safe Drinking Water Refresh • Tunatarwar Sabunta Ruwan Sha`;
      body = `Check stored water containers. Disinfect or boil water daily to prevent contamination. / Don Allah duba kwanon ruwan shanku domin tabbatar da tsabtarsa.`;
      titleHa = `Tunatarwar Sabunta Ruwan Sha`;
      bodyHa = `Tabbatar da cewa an kiyaye ruwan sha a rufe, kuma a tafasa ko a sa WaterGuard a sabon ruwa.`;
    } else {
      targetDate.setMinutes(targetDate.getMinutes() + 15);
      title = `Boiled Water Cooled & Safe • Ruwan Tafasa ya Huce`;
      body = `Boiled water has cooled down and is ready for safe drinking. Keep container tightly covered. / Ruwan tafasa ya huce don sha. A bar shi a rufe.`;
      titleHa = `Ruwan Tafasa ya Huce`;
      bodyHa = `Ruwan tafasa ya huce kuma ya shirya don sha. A bar shi a rufe.`;
    }

    const reminder: StoredReminder = {
      id: notifId,
      category: 'water',
      key,
      title,
      body,
      titleHa,
      bodyHa,
      targetDateIso: targetDate.toISOString(),
      targetTimestamp: targetDate.getTime(),
      createdAt: Date.now(),
      extra: { type },
    };

    try {
      await LocalNotifications.cancel({ notifications: [{ id: notifId }] }).catch(() => {});
      await LocalNotifications.schedule({
        notifications: [
          {
            id: notifId,
            title,
            body,
            schedule: { at: targetDate },
            extra: { key, category: 'water' },
          },
        ],
      });
    } catch (err) {
      console.warn('Water reminder schedule caught:', err);
    }

    await this.saveReminder(reminder);
    return reminder;
  },

  async cancelWaterReminder(type: string): Promise<void> {
    const key = `water-${type}`;
    const notifId = getNotificationIdForKey(key);
    try {
      await LocalNotifications.cancel({ notifications: [{ id: notifId }] });
    } catch {}
    await this.deleteReminder(key);
  },

  // ==========================================
  // 5. SOIL HEALTH RE-TESTING
  // ==========================================
  async scheduleSoilRetestReminder(plotName: string, daysAhead = 60): Promise<StoredReminder> {
    const key = `soil-${getNotificationIdForKey(plotName)}`;
    const notifId = getNotificationIdForKey(key);

    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + daysAhead);
    targetDate.setHours(8, 0, 0, 0);

    const title = `Soil Re-Test Reminder for ${plotName} • Tunatarwar Sake Gwajin Ƙasa`;
    const body = `Time to re-test moisture and pH for ${plotName} before fertilizing or planting. / Lokacin sake auna laima da matakin asid (pH) a ${plotName} ya yi kafin zuba taki.`;

    const reminder: StoredReminder = {
      id: notifId,
      category: 'soil',
      key,
      title,
      body,
      titleHa: `Sake Gwajin Ƙasa a ${plotName}`,
      bodyHa: `Auna laima da asid don sanin takin da ya dace.`,
      targetDateIso: targetDate.toISOString(),
      targetTimestamp: targetDate.getTime(),
      createdAt: Date.now(),
      extra: { plotName, daysAhead },
    };

    try {
      await LocalNotifications.cancel({ notifications: [{ id: notifId }] }).catch(() => {});
      await LocalNotifications.schedule({
        notifications: [
          {
            id: notifId,
            title,
            body,
            schedule: { at: targetDate },
            extra: { key, category: 'soil' },
          },
        ],
      });
    } catch (err) {
      console.warn('Soil reminder schedule caught:', err);
    }

    await this.saveReminder(reminder);
    return reminder;
  },

  async cancelSoilReminder(plotName: string): Promise<void> {
    const key = `soil-${getNotificationIdForKey(plotName)}`;
    const notifId = getNotificationIdForKey(key);
    try {
      await LocalNotifications.cancel({ notifications: [{ id: notifId }] });
    } catch {}
    await this.deleteReminder(key);
  },

  // ==========================================
  // 6. CROP DISEASE FOLLOW-UP (7-DAY RESPEC/SPRAY)
  // ==========================================
  async scheduleCropFollowupReminder(
    cropName: string,
    cropHausa: string,
    diseaseName: string,
    daysAhead = 7
  ): Promise<StoredReminder> {
    const key = `crop-followup-${getNotificationIdForKey(cropName + diseaseName)}`;
    const notifId = getNotificationIdForKey(key);

    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + daysAhead);
    targetDate.setHours(8, 0, 0, 0);

    const title = `7-Day Field Check for ${cropName}! • Duba Warakar ${cropHausa}!`;
    const body = `Inspect your ${cropName} field for recovery from ${diseaseName} or apply a second booster spray. / Duba gonar ${cropHausa} don ganin ko cutar ${diseaseName} ta lafa.`;

    const reminder: StoredReminder = {
      id: notifId,
      category: 'crop_followup',
      key,
      title,
      body,
      titleHa: `Duba Warakar ${cropHausa}!`,
      bodyHa: `Duba gonar ${cropHausa} don tabbatar da lafiyar shukar bayan magani.`,
      targetDateIso: targetDate.toISOString(),
      targetTimestamp: targetDate.getTime(),
      createdAt: Date.now(),
      extra: { cropName, cropHausa, diseaseName, daysAhead },
    };

    try {
      await LocalNotifications.cancel({ notifications: [{ id: notifId }] }).catch(() => {});
      await LocalNotifications.schedule({
        notifications: [
          {
            id: notifId,
            title,
            body,
            schedule: { at: targetDate },
            extra: { key, category: 'crop_followup' },
          },
        ],
      });
    } catch (err) {
      console.warn('Crop follow-up reminder caught:', err);
    }

    await this.saveReminder(reminder);
    return reminder;
  },

  async cancelCropFollowupReminder(key: string): Promise<void> {
    const notifId = getNotificationIdForKey(key);
    try {
      await LocalNotifications.cancel({ notifications: [{ id: notifId }] });
    } catch {}
    await this.deleteReminder(key);
  },
};
