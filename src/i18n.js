/**
 * Translations.
 *
 * English and Arabic. The chosen language is applied to the whole document at
 * once: elements carrying data-i18n / data-i18n-* attributes are updated, the
 * <html> lang and dir attributes are set (Arabic flips the page to RTL), and
 * anything rendering from JavaScript re-renders on change.
 */

const STORAGE_KEY = 'lineup-studio-lang';

export const LANGS = [
  { id: 'en', name: 'English', native: 'English', short: 'EN' },
  { id: 'ar', name: 'Arabic', native: 'العربية', short: 'ع' },
];

const en = {
  'app.title': 'Lineup Studio · Football Tactics Board',

  'brand.name': 'Lineup Studio',
  'brand.subtitle': 'Drag & drop tactics board',
  'action.hidePanel': 'Hide panel',
  'action.showPanel': 'Show panel',
  'action.close': 'Close',
  'action.cancel': 'Cancel',
  'action.unlock': 'Unlock',
  'action.lock': 'Lock board',

  'panel.team': 'Team',
  'panel.addPlayer': 'Add player',
  'panel.squad': 'Squad',
  'field.clubName': 'Club name',
  'field.clubPlaceholder': 'e.g. Riverside FC',
  'field.kitColour': 'Kit colour',
  'field.formation': 'Formation',
  'field.formationHint': 'GK + 5 outfield',
  'field.playerName': 'Player name',
  'field.playerPlaceholder': 'e.g. M. Salah',
  'field.position': 'Position',
  'field.number': 'Number',
  'field.numberPlaceholder': 'auto',
  'action.addToSquad': 'Add to squad',
  'action.clearAll': 'Clear all',
  'action.resetApp': 'Reset app',
  'action.addPhoto': 'Add photo (optional)',
  'action.removePhoto': 'Remove photo',
  'hint.photo': 'Optional · JPG or PNG',
  'hint.sidebarFoot': '6 a side · 1 GK + 5 outfield',
  'squad.empty': 'No players yet. Add your squad above, then drag players onto the pitch.',
  'squad.count': 'Players',

  'action.autoFill': 'Auto-fill',
  'action.autoFillTitle': 'Fill empty slots from the bench by position',
  'action.clearPitch': 'Clear pitch',
  'action.zoomIn': 'Zoom in',
  'action.zoomOut': 'Zoom out',
  'action.resetView': 'Reset camera',
  'action.export': 'Export PNG',

  'hint.stage': 'Drag a player onto the pitch · drag onto the bench to substitute · drag empty space to orbit',
  'bench.title': 'Substitute bench',
  'bench.sub': 'Drag a player off the pitch to bench them',
  'bench.count_one': '{count} substitute',
  'bench.count_other': '{count} substitutes',
  'bench.dragUp': 'drag onto the pitch to field them',
  'bench.empty': 'Bench is empty — drop a player here to send them off the pitch',

  'board.connecting': 'Connecting',
  'board.readonly': 'View only',
  'board.editing': 'Editing',
  'board.empty': 'Empty board',
  'board.offline': 'Offline',
  'board.error': 'Board error',
  'board.local': 'This device only',
  'board.title': 'Shared board',
  'board.conflict': 'Editing · conflict',
  'board.wrongPin': 'Wrong PIN',
  'board.titleLong':
    'Shared board: everyone with this link sees the same lineup. Click to change edit access.',
  'board.titleOff': 'Sync is not configured for this build.',

  'pin.title': 'Edit the shared board',
  'pin.text':
    'Everyone with this link sees the lineup live. Enter the editor PIN to change players, formation and team details — viewing and exporting stay available without it.',
  'pin.placeholder': 'PIN',
  'pin.error': 'Wrong PIN — try again.',
  'pin.foot': 'Your PIN is kept only for this browser tab.',
  'pin.titleLocked': 'Board access',
  'pin.footLocked':
    'You have edit access on this tab. Locking it makes this browser view-only again.',

  'pos.GK': 'Goalkeeper',
  'pos.LB': 'Left Back',
  'pos.CB': 'Centre Back',
  'pos.RB': 'Right Back',
  'pos.DM': 'Defensive Midfielder',
  'pos.CM': 'Centre Midfielder',
  'pos.AM': 'Attacking Midfielder',
  'pos.ST': 'Striker',

  'squad.onPitch': 'on pitch',
  'squad.xi': 'XI',
  'squad.sub': 'Sub',
  'squad.dragHint': 'Drag onto the pitch',
  'action.removePlayer': 'Remove {name}',
  'action.switchLang': 'Switch to {lang}',
  'action.toggleTeam': 'Show or hide team settings',
  'aria.teams': 'Teams',
  'sheet.label': 'Sidebar section',
  'lang.switch': 'Switch language',
  'lang.label': 'Language',

  'fm.3-1-1.blurb': 'Back three, single pivot, lone striker',
  'fm.3-2.blurb': 'Back three with a double pivot',
  'fm.4-1.blurb': 'Flat back four hunting a single forward',
  'fm.2-2-1.blurb': 'Compact centre pair, midfield shield, poacher',

  'poster.fallbackName': 'Lineup',
  'poster.subtitle': 'Starting lineup · {formation} formation',
  'poster.subsTitle': 'SUBSTITUTES ({count})',
  'poster.subsEmpty': 'No substitutes registered',
  'poster.subsMeta': '{position} · #{number}',
  'poster.footer': '6 a side · 1 goalkeeper + 5 outfield · {gk} duties locked to goal',

  'toast.benched': 'Player benched',
  'toast.gkOnly': 'Goalkeepers can only play in goal',
  'toast.sentOff_one': '{name} sent to the bench',
  'toast.sentOff_other': '{name} sent to the bench',
  'toast.swapHint': 'Now tap another player to swap them',
  'toast.fielded_one': 'Fielded {count} player',
  'toast.fielded_other': 'Fielded {count} players',
  'toast.noMatches': 'No matching players on the bench',
  'toast.pitchCleared': 'Pitch cleared — everyone to the bench',
  'toast.pngDownloaded': 'Lineup PNG downloaded',
  'toast.exportFailed': 'Could not export the poster',
  'toast.conflict': 'Someone else edited the board — your version replaced theirs',
  'toast.locked': 'Board locked — view only on this tab',
  'toast.unlocked': 'Editing enabled — everyone can see your changes',
  'toast.boardLoaded': 'Shared board loaded — tap the Live badge to edit it',
  'toast.addSquad': 'Add your squad on the left, then drag players onto the pitch',
  'toast.imageUnreadable': 'Could not read that image',
  'toast.photoCleared': 'Photo cleared',
  'toast.storageFull': 'Storage full — photos cannot be saved',
  'toast.playerAdded': '{name} added as #{number} ({position})',
  'toast.playerRemoved': '{name} removed',
  'toast.squadCleared': 'Squad cleared',
  'toast.everythingReset': 'Everything reset',
  'toast.need_one': '{count} player does not fit this shape and moved to the bench',
  'toast.need_other': '{count} players do not fit this shape and moved to the bench',
  'confirm.clearSquad': 'Remove every player from this team?',
  'confirm.resetAll': 'Reset everything and start from scratch?',
};

const ar = {
  'app.title': 'استوديو التشكيلة · لوحة تكتيكات كرة القدم',

  'brand.name': 'استوديو التشكيلة',
  'brand.subtitle': 'لوحة تكتيكات بالسحب والإفلات',
  'action.hidePanel': 'إخفاء اللوحة',
  'action.showPanel': 'إظهار اللوحة',
  'action.close': 'إغلاق',
  'action.cancel': 'إلغاء',
  'action.unlock': 'فتح التحرير',
  'action.lock': 'قفل اللوحة',

  'panel.team': 'الفريق',
  'panel.addPlayer': 'إضافة لاعب',
  'panel.squad': 'القائمة',
  'field.clubName': 'اسم النادي',
  'field.clubPlaceholder': 'مثال: نادي النهر',
  'field.kitColour': 'لون القميص',
  'field.formation': 'التشكيلة',
  'field.formationHint': 'حارس + 5 لاعبين',
  'field.playerName': 'اسم اللاعب',
  'field.playerPlaceholder': 'مثال: م. صلاح',
  'field.position': 'المركز',
  'field.number': 'الرقم',
  'field.numberPlaceholder': 'تلقائي',
  'action.addToSquad': 'إضافة إلى القائمة',
  'action.clearAll': 'مسح الكل',
  'action.resetApp': 'إعادة تعيين التطبيق',
  'action.addPhoto': 'إضافة صورة (اختياري)',
  'action.removePhoto': 'حذف الصورة',
  'hint.photo': 'اختياري · JPG أو PNG',
  'hint.sidebarFoot': '٦ لاعبون · حارس و٥ لاعبين',
  'squad.empty': 'لا يوجد لاعبون بعد. أضف قائمتك في الأعلى، ثم اسحب اللاعبين إلى الملعب.',
  'squad.count': 'اللاعبون',

  'action.autoFill': 'ملء تلقائي',
  'action.autoFillTitle': 'ملء الفراغات من الدكة حسب المراكز',
  'action.clearPitch': 'مسح الملعب',
  'action.zoomIn': 'تكبير',
  'action.zoomOut': 'تصغير',
  'action.resetView': 'إعادة ضبط الكاميرا',
  'action.export': 'تصدير صورة',

  'hint.stage': 'اسحب لاعباً إلى الملعب · اسحب إلى دكة البدلاء للتبديل · اسحب الفراغ لتدوير الكاميرا',
  'bench.title': 'دكة البدلاء',
  'bench.sub': 'اسحب لاعباً خارج الملعب لإرجاعه إلى الدكة',
  'bench.count_one': 'بديل واحد',
  'bench.count_other': '{count} بدلاء',
  'bench.dragUp': 'اسحبه إلى الملعب لإشراكه',
  'bench.empty': 'الدكة فارغة — أفلت لاعباً هنا لإخراجه من الملعب',

  'board.connecting': 'جارٍ الاتصال',
  'board.readonly': 'للعرض فقط',
  'board.editing': 'قيد التحرير',
  'board.empty': 'لوحة فارغة',
  'board.offline': 'غير متصل',
  'board.error': 'خطأ في اللوحة',
  'board.local': 'هذا الجهاز فقط',
  'board.title': 'اللوحة المشتركة',
  'board.conflict': 'قيد التحرير · تعارض',
  'board.wrongPin': 'رمز غير صحيح',
  'board.titleLong':
    'لوحة مشتركة: كل من يملك هذا الرابط يرى التشكيلة نفسها. اضغط لتغيير صلاحية التحرير.',
  'board.titleOff': 'المزامنة غير مُهيأة في هذه النسخة.',

  'pin.title': 'تحرير اللوحة المشتركة',
  'pin.text':
    'يرى الجميع الذي يملك هذا الرابط التشكيلة مباشرة. أدخل رمز التحرير لتغيير اللاعبين والتشكيلة وبيانات الفريق — أما المشاهدة والتصدير فمتاحان بدون رمز.',
  'pin.placeholder': 'الرمز',
  'pin.error': 'رمز غير صحيح — حاول مرة أخرى.',
  'pin.foot': 'يُحفظ رمزك في هذا التبويب فقط.',
  'pin.titleLocked': 'صلاحيات اللوحة',
  'pin.footLocked': 'لديك صلاحية التحرير في هذا التبويب. القفل يجعل المتصفح للعرض فقط.',

  'pos.GK': 'حارس مرمى',
  'pos.LB': 'ظهير أيسر',
  'pos.CB': 'قلب دفاع',
  'pos.RB': 'ظهير أيمن',
  'pos.DM': 'وسط دفاعي',
  'pos.CM': 'وسط ملعب',
  'pos.AM': 'وسط هجومي',
  'pos.ST': 'مهاجم',

  'squad.onPitch': 'في الملعب',
  'squad.xi': 'أساسي',
  'squad.sub': 'بديل',
  'squad.dragHint': 'اسحب إلى الملعب',
  'action.removePlayer': 'إزالة {name}',
  'action.switchLang': 'التبديل إلى {lang}',
  'action.toggleTeam': 'إظهار أو إخفاء إعدادات الفريق',
  'aria.teams': 'الفرق',
  'sheet.label': 'قسم اللوحة الجانبية',
  'lang.switch': 'تغيير اللغة',
  'lang.label': 'اللغة',

  'fm.3-1-1.blurb': 'ثلاثة خلف، لاعب ارتكاز واحد، ومهاجم وحيد',
  'fm.3-2.blurb': 'ثلاثة خلف مع ثنائي في الارتكاز',
  'fm.4-1.blurb': 'خط دفاع مسطح بأربعة يطارد مهاجماً واحداً',
  'fm.2-2-1.blurb': 'ثنائي مركزي متماسك، درع في الوسط، وصائد أهداف',

  'poster.fallbackName': 'التشكيلة',
  'poster.subtitle': 'التشكيلة الأساسية · صفوف {formation}',
  'poster.subsTitle': 'البدلاء ({count})',
  'poster.subsEmpty': 'لا يوجد بدلاء مسجلون',
  'poster.subsMeta': '{position} · #{number}',
  'poster.footer': '6 ضد 6 · حارس مرمى واحد + 5 لاعبين · {gk} مرتبط بالمرمى فقط',

  'toast.benched': 'تم إرجاع اللاعب إلى الدكة',
  'toast.gkOnly': 'حارس المرمى لا يمكنه اللعب إلا في المرمى',
  'toast.sentOff_one': 'تم إخراج {name} إلى الدكة',
  'toast.sentOff_other': 'تم إخراج {name} إلى الدكة',
  'toast.swapHint': 'الآن اضغط لاعباً آخر لتبديلهما',
  'toast.fielded_one': 'تم إشراك {count} لاعب',
  'toast.fielded_few': 'تم إشراك {count} لاعبين',
  'toast.fielded_many': 'تم إشراك {count} لاعباً',
  'toast.fielded_other': 'تم إشراك {count} لاعب',
  'toast.noMatches': 'لا يوجد لاعبون مناسبون في الدكة',
  'toast.pitchCleared': 'تم مسح الملعب — الجميع إلى الدكة',
  'toast.pngDownloaded': 'تم تنزيل صورة التشكيلة',
  'toast.exportFailed': 'تعذر تصدير الصورة',
  'toast.conflict': 'عدّل شخص آخر اللوحة — تم استبدال نسختك',
  'toast.locked': 'تم قفل اللوحة — للعرض فقط في هذا التبويب',
  'toast.unlocked': 'تم تفعيل التحرير — الجميع يرى تغييراتك',
  'toast.boardLoaded': 'تم تحميل اللوحة المشتركة — اضغط على شارة «مباشر» للتعديل',
  'toast.addSquad': 'أضف لاعبيك على اليمين، ثم اسحب اللاعبين إلى الملعب',
  'toast.imageUnreadable': 'تعذر قراءة هذه الصورة',
  'toast.photoCleared': 'تم حذف الصورة',
  'toast.storageFull': 'المساحة ممتلئة — لا يمكن حفظ الصور',
  'toast.playerAdded': 'تمت إضافة {name} برقم {number} ({position})',
  'toast.playerRemoved': 'تمت إزالة {name}',
  'toast.squadCleared': 'تم مسح القائمة',
  'toast.everythingReset': 'تمت إعادة تعيين كل شيء',
  'toast.need_one': 'لاعب واحد لا يناسب هذا الصف ونُقل إلى الدكة',
  'toast.need_few': '{count} لاعبين لا يناسبهم هذا الصف ونُقلوا إلى الدكة',
  'toast.need_many': '{count} لاعباً لا يناسبهم هذا الصف ونُقلوا إلى الدكة',
  'toast.need_other': '{count} لاعب لا يناسبهم هذا الصف ونُقلوا إلى الدكة',
  'confirm.clearSquad': 'هل تريد إزالة جميع اللاعبين من هذا الفريق؟',
  'confirm.resetAll': 'هل تريد إعادة تعيين كل شيء والبدء من الصفر؟',
};

const DICTS = { en, ar };
const FALLBACK = 'en';

const listeners = new Set();
let current = FALLBACK;

function detect() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && DICTS[saved]) return saved;
  } catch {
    /* private mode */
  }
  const nav = (navigator.languages ?? [navigator.language ?? '']).join(',').toLowerCase();
  if (nav.includes('ar')) return 'ar';
  return FALLBACK;
}

function categoryOf(count) {
  try {
    return new Intl.PluralRules(current).select(Number(count) || 0);
  } catch {
    return Number(count) === 1 ? 'one' : 'other';
  }
}

/**
 * Translate a key. `{name}` style placeholders are replaced from `vars`.
 * When a count is supplied the dictionary is looked up with a plural
 * suffix first (fielded_one, fielded_few, ...) and falls back to _other.
 */
export function t(key, vars = {}) {
  const dict = DICTS[current] ?? DICTS[FALLBACK];
  let value;
  if (typeof vars.count === 'number') {
    const suffix = categoryOf(vars.count);
    value = dict[`${key}_${suffix}`] ?? dict[`${key}_other`] ?? dict[key];
  } else {
    value = dict[key];
  }
  if (value === undefined) value = DICTS[FALLBACK][key];
  if (value === undefined) return key;
  return String(value).replace(/\{(\w+)\}/g, (whole, name) => (vars[name] === undefined ? whole : String(vars[name])));
}

export function positionLabel(id) {
  return t(`pos.${id}`);
}

export function formationLabel(formation) {
  return formation?.label ?? '';
}

/** Formation shapes are numeric ("4-1"); only their descriptions are words. */
export function formationBlurb(id) {
  return t(`fm.${id}.blurb`);
}

export function getLang() {
  return current;
}

export function dir() {
  return current === 'ar' ? 'rtl' : 'ltr';
}

export function isRtl() {
  return dir() === 'rtl';
}

export function onLangChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Re-render everything that is not driven by data-i18n attributes. */
function notify() {
  for (const fn of listeners) {
    try {
      fn(current);
    } catch {
      /* a broken listener must not stop the rest */
    }
  }
}

const ATTR_MAP = {
  'data-i18n': 'textContent',
  'data-i18n-placeholder': 'placeholder',
  'data-i18n-title': 'title',
  'data-i18n-aria-label': 'aria-label',
};

export function applyDom(root = document) {
  for (const [attr, prop] of Object.entries(ATTR_MAP)) {
    for (const node of root.querySelectorAll(`[${attr}]`)) {
      const value = t(node.getAttribute(attr));
      if (node[prop] !== value) node[prop] = value;
    }
  }
}

export function setLang(lang) {
  const next = DICTS[lang] ? lang : FALLBACK;
  if (next === current) return current;
  current = next;
  try {
    localStorage.setItem(STORAGE_KEY, current);
  } catch {
    /* private mode */
  }
  const html = document.documentElement;
  html.lang = current;
  html.dir = dir();
  applyDom();
  notify();
  return current;
}

export function toggleLang() {
  return setLang(current === 'en' ? 'ar' : 'en');
}

/** Call once at start-up, before the first render. */
export function initLang() {
  current = detect();
  const html = document.documentElement;
  html.lang = current;
  html.dir = dir();
  return current;
}