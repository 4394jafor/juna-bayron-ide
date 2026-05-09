const KEYWORDS = {
  control: ['إذا','وإلاإذا','وإلا','بينما','حلقة','في','توقف','تخطى','تمرير','إرجع','أرجع','حاول','إلا','أخيراً','رفع','مع','كـ','عالمي','محلي','حذف','تأكيد','إنتاج','لام','من','استيراد','مزامن','انتظر','if','elif','else','while','for','in','break','continue','pass','return','try','except','finally','raise','with','as','global','nonlocal','del','assert','yield','lambda','from','import','async','await'],
  define: ['دالة','كلاس','def','class'],
  builtin: ['طباعة','مدخل','مدى','طول','نوع','قائمة','قاموس','مجموعة','صف','مجموع','أكبر','أصغر','مطلق','تحويل_نص','تحويل_رقم','تحويل_عشري','تحويل_منطق','فرز','عكس','تعداد','دمج','كل','أي','افتح','مساعدة','هوية','قوة','جولة','تحويل_حرف','رمز_حرف','print','input','range','len','type','list','dict','set','tuple','sum','max','min','abs','str','int','float','bool','sorted','reversed','enumerate','zip','all','any','open','help','id','pow','round','chr','ord','super','isinstance'],
  boolean: ['صحيح','خطأ','فارغ','و','أو','ليس','هو','True','False','None','and','or','not','is'],
  self: ['ذاتي','هذا','self'],
  exceptions: ['استثناء','خطأ_نوع','خطأ_قيمة','خطأ_فهرس','خطأ_مفتاح','خطأ_اسم','خطأ_صياغة','خطأ_قسمة','خطأ_استيراد','خطأ_ملف','Exception','TypeError','ValueError','IndexError','KeyError','NameError','SyntaxError','ZeroDivisionError','ImportError','FileNotFoundError'],
};

const SNIPPETS = {
  hello: `# Bayron Hello World\n# Invented by Mohammed Kamal Alsultany\nطباعة("مرحباً بالعالم!")\nprint("Hello World!")`,
  func: `دالة ${1}اسم_الدالة(معاملات):\n    تمرير`,
  class: `كلاس اسم_الكلاس:\n    دالة __init__(ذاتي):\n        تمرير\n\n    دالة طريقة(ذاتي):\n        تمرير`,
  if: `إذا شرط:\n    تمرير\nوإلا:\n    تمرير`,
  loop: `حلقة i في مدى(10):\n    طباعة(i)`,
  try: `حاول:\n    تمرير\nإلا استثناء كـ خ:\n    طباعة(خ)\nأخيراً:\n    طباعة("انتهى")`,
  list: `أرقام = [1, 2, 3, 4, 5]\nحلقة عنصر في أرقام:\n    طباعة(عنصر)`,
  dict: `بيانات = {"اسم": "محمد", "عمر": 20}\nحلقة مفتاح في بيانات:\n    طباعة(مفتاح, بيانات[مفتاح])`,
};

const AUTOCOMPLETE_WORDS = [
  ...KEYWORDS.control,
  ...KEYWORDS.define,
  ...KEYWORDS.builtin,
  ...KEYWORDS.boolean,
  ...KEYWORDS.self,
  ...KEYWORDS.exceptions,
  'طباعة','مدخل','مدى','طول','نوع','قائمة','قاموس',
];