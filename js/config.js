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
  closeOverride: { "2026-11-17": "2026-11-17T17:00" },
  ordersOpen: true,     // false = ההזמנות סגורות (מוצגת הודעה)

  // שעות הכנה / איסוף
  timeSlots: ["17:30", "18:00", "18:30", "19:00", "19:30"],
  // כמה מגשים לכל היותר בכל חצי שעה. 0 = בלי הגבלה
  maxPizzasPerSlot: 8,
  // כמה תוספות לכל היותר למגש
  freeToppings: 3,          // תוספות כלולות במחיר המגש
  extraToppingPrice: 3,     // מחיר כל תוספת מעבר לכלולות
  maxToppings: 8,

  payPhone: "0526700461",
  showPrices: true,

  bases: [
    { id: "red",   name: "אדומה", desc: "רוטב עגבניות וגבינה צהובה", price: 20 },
    { id: "white", name: "לבנה",  desc: "גבינה צהובה, שמן זית ושום",  price: 20 }
  ],

  // id באנגלית קשור לצורה התלת־ממדית — לא לשנות. שם, תיאור ומחיר אפשר לשנות
  toppings: [
    { id: "greenOlive", name: "זיתים ירוקים",  desc: "",           price: 0 },
    { id: "kalamata",   name: "זיתי קלמטה",    desc: "",    price: 0 },
    { id: "tuna",       name: "טונה",          desc: "",                price: 0 },
    { id: "onion",      name: "בצל סגול",      desc: "",           price: 0 },
    { id: "tomato",     name: "עגבניות שרי",   desc: "",    price: 0 },
    { id: "chili",      name: "פלפל חריף",     desc: "",    price: 0 },
    { id: "feta",       name: "בולגרית",       desc: "",          price: 0 },
    { id: "garlic",     name: "שום קונפי",     desc: "",                price: 0 }
  ]
};
