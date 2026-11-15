/* =========================================================
   הגדרות האתר — את כל מה שמשתנה משנים כאן בלבד
   ========================================================= */
window.PIZZA_CONFIG = {
  // כתובת ה-Web App של Google Apps Script (ראו הוראות-הפעלה.md)
  // כל עוד ריק — ההזמנות נשמרות רק בדפדפן (מצב ניסיון)
  scriptUrl: "",

  // יום המכירה בשבוע: 0=ראשון 1=שני 2=שלישי 3=רביעי 4=חמישי 5=שישי 6=שבת
  saleWeekday: 4,
  // עד איזו שעה ביום המכירה עצמו אפשר עוד להזמין
  orderCutoff: "16:00",
  // false = ההזמנות סגורות השבוע (מוצגת הודעה)
  ordersOpen: true,

  // שעות הכנה / איסוף
  timeSlots: ["17:30", "18:00", "18:30", "19:00", "19:30"],
  // כמה פיצות לכל היותר בכל חצי שעה (הטאבון מוגבל). 0 = בלי הגבלה
  maxPizzasPerSlot: 8,

  // תשלום
  payPhone: "0526700461",

  // מחירים בשקלים. showPrices:false מסתיר את כל המחירים מהאתר
  showPrices: true,

  bases: [
    { id: "red",   name: "אדומה",  desc: "רוטב עגבניות איטלקי ומוצרלה", price: 45 },
    { id: "white", name: "לבנה",   desc: "ביאנקה — מוצרלה, שמן זית ושום", price: 45 }
  ],

  // התוספות. id באנגלית חייב להתאים לצורה התלת־ממדית (אל תשנו id, רק שם/מחיר)
  // צורות קיימות: tomato, greenOlive, blackOlive, jalapeno, garlic, tuna,
  //               onion, mushroom, corn, basil, feta
  toppings: [
    { id: "tomato",     name: "עגבניות שרי",   price: 5 },
    { id: "greenOlive", name: "זיתים ירוקים",  price: 5 },
    { id: "blackOlive", name: "זיתים שחורים",  price: 5 },
    { id: "jalapeno",   name: "חלאפיניו",      price: 5 },
    { id: "garlic",     name: "שום קונפי",     price: 5 },
    { id: "onion",      name: "בצל סגול",      price: 5 },
    { id: "mushroom",   name: "פטריות",        price: 5 },
    { id: "corn",       name: "תירס",          price: 5 },
    { id: "tuna",       name: "טונה",          price: 7 },
    { id: "feta",       name: "בולגרית",       price: 6 },
    { id: "basil",      name: "בזיליקום",      price: 3 }
  ]
};
