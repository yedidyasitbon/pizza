/* =========================================================
   הגדרות האתר — את כל מה שמשתנה משנים כאן בלבד
   ========================================================= */
window.PIZZA_CONFIG = {
  // כתובת ה-Web App של Google Apps Script (ראו הוראות-הפעלה.md)
  // כל עוד ריק — ההזמנות נשמרות רק בדפדפן (מצב ניסיון)
  scriptUrl: "https://script.google.com/macros/s/AKfycbz5b4gpsV_m2_B2j9tt_eFwsGqI_SvY7xWDw_y5OdAWSWcxgmiF2R0LJwDThdb6uWAP/exec",

  // ימים: 0=ראשון 1=שני 2=שלישי 3=רביעי 4=חמישי 5=שישי 6=שבת
  saleWeekday: 2,       // יום ההכנה והאיסוף: שלישי
  closeWeekday: 1,      // ההזמנות נסגרות ביום שני…
  closeTime: "09:00",   // …בשעה הזו. אחרי זה האתר מקבל הזמנות לשבוע הבא
  // חריגים חד־פעמיים: תאריך מכירה ← עד מתי ההזמנות פתוחות אליו
  closeOverride: {},          // פתיחה וסגירה רגילה — מדף הניהול
  ordersOpen: true,     // false = ההזמנות סגורות (מוצגת הודעה)

  // שעות הכנה / איסוף
  timeSlots: ["18:00", "18:30", "19:00", "19:30"],
  // כמה מגשים לכל היותר בכל חצי שעה. 0 = בלי הגבלה
  maxPizzasPerSlot: 8,
  // כמה תוספות לכל היותר למגש
  freeToppings: 2,          // תוספות כלולות במחיר המגש (הראשונות שנבחרו)
  extraToppingPrice: 2,     // ברירת מחדל לתוספת נוספת; מחיר לכל תוספת — בשדה price שלה
  maxToppings: 9,

  payPhone: "0526700461",
  // קישור התשלום האישי מביט (שיתוף קוד ה-QR). ריק = בלי כפתור
  bitLink: "https://www.bitpay.co.il/app/me/A85F5BF2-6940-3480-4AAF-129ADA88CC42DE91",
  // קישור התשלום האישי מפייבוקס. ריק = בלי כפתור
  payboxLink: "https://links.payboxapp.com/6FE6XngZ67b",
  showPrices: true,

  bases: [
    { id: "red",   name: "אדומה", desc: "רוטב עגבניות וגבינת מוצרלה", price: 25 },
    { id: "white", name: "לבנה",  desc: "רוטב שמנת ושום, עם גבינת מוצרלה",  price: 25 }
  ],

  // id באנגלית קשור לצורה התלת־ממדית — לא לשנות. שם, תיאור ומחיר אפשר לשנות
  // price = כמה עולה התוספת כשהיא מעבר לכלולות במגש
  toppings: [
    { id: "greenOlive", name: "זיתים ירוקים",  desc: "",           price: 2 },
    { id: "kalamata",   name: "זיתי קלמטה",    desc: "",    price: 2 },
    { id: "tuna",       name: "טונה",          desc: "",                price: 3 },
    { id: "onion",      name: "בצל סגול",      desc: "",           price: 2 },
    { id: "tomato",     name: "עגבניות שרי",   desc: "",    price: 2 },
    { id: "chili",      name: "פלפל חריף",     desc: "",    price: 2 },
    { id: "feta",       name: "בולגרית",       desc: "",          price: 3 },
    { id: "garlic",     name: "שום קונפי",     desc: "",                price: 2 },
    { id: "corn",       name: "תירס",          desc: "",                price: 2 },
    { id: "sweet",      name: "בטטה", price: 2 }
  ]
};
