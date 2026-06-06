# Bora! - Travel & Expense Planner

> **Bora!** is a collaborative mobile app designed for groups of friends who love to travel. Plan your itinerary, invite your travel buddies, check the destination's weather, and most importantly, manage and split all trip expenses fairly and transparently all in real-time!

---

## Key Features

Based on the application screens, **Bora!** offers:

 **Collaborative Trip Management:** Create trips (with real-time city search), set dates, and invite friends via email.
 **Shared Itineraries:** Add activities to the schedule. If a friend adds a restaurant to the plan, it instantly appears on your screen.
 **Smart Expense Control:** Keep track of who paid what and who owes you. Supports multi-currency conversion (EUR, USD, GBP, CZK, HUF) in real-time.
 **Payment System:** Push notifications when someone registers a debt, sends a payment, when a payment is confirmed and when someone invites you to a trip.
 **Integrated Weather:** 5-day weather forecast on the itinerary screen using your trip's coordinates.
 **Real-Time Distance:** Shows how many kilometers away you are from your next destination using location services.
 **Customization:** Full support for Dark Mode and profile avatars.



## Technologies Used

This project was built using the following technologies:

 **Frontend:** [React Native](https://reactnative.dev/)
 **Framework & Environment:** [Expo](https://expo.dev/) (Tested via Expo Go)
 **Backend & Database:** [Firebase](https://firebase.google.com/) (Authentication & Cloud Firestore)
 **External APIs:**
   [Open-Meteo Geocoding](https://open-meteo.com/) (For weather prevision)
   [Exchange Rate API](https://www.exchangerate-api.com/) (For currency conversion)

---

##  Prerequisites

Before you begin, ensure you have the following installed on your machine:
 [Node.js](https://nodejs.org/en/) (LTS version recommended)
 [Git](https://git-scm.com)
 The **Expo Go** app installed on your smartphone ([iOS](https://apps.apple.com/us/app/expo-go/id982107779) / [Android](https://play.google.com/store/apps/details?id=host.exp.exponent)).

---

##  Installation and Setup

Follow these steps to run the application locally on your computer and phone:

1. **Clone the repository:**
   \`\`\`bash
   git clone https://github.com/your-username/bora-app.git
   \`\`\`

2. **Navigate to the project folder:**
   \`\`\`bash
   cd bora-app
   \`\`\`

3. **Install dependencies:**
   \`\`\`bash
   npm install
   \`\`\`

4. **Start the Expo server:**
   \`\`\`bash
   npx expo start
   \`\`\`

5. **Test on your phone:**
    Open the **Expo Go** app on your smartphone.
    If you are on an **iPhone**, open your Camera app and scan the QR code displayed in your terminal.
    If you are on an **Android**, you can scan the QR code directly inside the Expo Go app.
    *Note: Your phone and computer must be connected to the same Wi-Fi network.*




