# Privacy Policy — CelebConnect

**Effective date:** April 22, 2026
**Last updated:** August 4, 2026

CelebConnect ("we", "our", or "the app") is a mobile application that helps you remember and celebrate important events for people in your life. This Privacy Policy explains what information we collect, how we use it, and your rights.

---

## 1. Information We Collect

### Information you provide directly
- **Account information:** When you register, you provide a first name, last name, and either an email address or phone number, plus a password.
- **Event data:** You create events with titles, dates, recurrence settings, and optional notes.
- **Contact information:** You may add contacts (names, phone numbers, Instagram handles) to events so the app can help you send celebration messages. These are stored with your event and are visible only to you.
- **Message templates:** The text you write for each event, including any `{name}` placeholders.
- **Profile photo:** Optional. If you set one, the image is uploaded to Cloudinary (see Section 3) and linked to your account.
- **Instagram account details:** If you choose "Continue with Instagram", we receive your Instagram account ID, username, and display name from Meta, and use them to create or sign you in to a CelebConnect account. We do not receive your Instagram password, posts, followers, or direct messages.

### Information collected with your permission
- **Device contacts:** If you grant contacts permission, the app shows your address book so you can pick a person to add to an event. Only the contacts you explicitly select are saved. The rest are never uploaded or stored.
- **Photo library:** If you grant photo permission, only the single image you choose as a profile picture is accessed.
- **Push notification token:** A device identifier issued by Expo, used solely to deliver your own event reminders to your device.

### Information collected automatically
- **Usage data:** We may collect anonymised crash reports and error logs to improve the app. This data does not include any personally identifiable information.
- **Device information:** Platform (iOS/Android), OS version, and app version, used for debugging and compatibility purposes.

### Information we do NOT collect
- We do not read your device contacts without explicit permission.
- We do not collect your precise GPS location.
- We do not display advertising and do not share your data with advertising networks.

---

## 2. How We Use Your Information

| Purpose | Data used |
|---------|-----------|
| Providing the service (saving events, showing your calendar) | Account info, event data, contacts |
| Reminding you on the day | Event dates, notification preferences, push token |
| Preparing a message for you to send | Contact name and phone number, your message template |
| Improving the app (crash reports) | Anonymised error logs |
| Authentication and session management | Email/phone, password (hashed), JWT tokens |
| Signing you in with Instagram | Instagram account ID, username, display name |

### How message sending works

**We do not send messages on your behalf.** At your chosen time, our server sends
a push notification to *your* device. When you tap it, your phone opens WhatsApp
with the message pre-filled. You send it yourself, from your own WhatsApp account
and your own phone number.

This means your message content and your contacts' phone numbers are **never
transmitted to Meta by us**. The only place they travel is between our server and
your own device, over HTTPS, to populate that notification.

### Your events are visible only to you

Every event is tied to your account. Our API requires a valid authentication token
on every request and returns only the events belonging to the signed-in account.
No other user can read, modify, or delete your events or see your contacts.

---

## 3. Third-Party Services

CelebConnect integrates with the following third-party services:

- **Expo Push Notification Service:** Delivers your event reminders to your device. The notification payload includes the contact name, phone number, and message text needed to open WhatsApp, and is addressed only to your own device. Expo's Privacy Policy: https://expo.dev/privacy
- **Instagram / Meta:** Two separate, optional uses. (1) The app can open an Instagram profile in the Instagram app — this sends nothing to Meta beyond the profile you are visiting. (2) If you use "Continue with Instagram", we perform an OAuth sign-in with Meta and receive your Instagram account ID, username, and display name. Meta's Privacy Policy: https://privacycenter.instagram.com/policy
- **WhatsApp:** Opening a pre-filled message uses WhatsApp's standard deep link on your device. We do not use the WhatsApp Business API to message your contacts. Once you tap Send, WhatsApp's own Privacy Policy governs the message: https://www.whatsapp.com/legal/privacy-policy
- **Railway (hosting):** Our backend server and database are hosted on Railway. Data is stored in a PostgreSQL database on Railway's infrastructure. Railway's Privacy Policy: https://railway.app/legal/privacy
- **Cloudinary (image hosting):** If you upload a profile photo, it is stored on Cloudinary. Cloudinary's Privacy Policy: https://cloudinary.com/privacy
- **Resend (email) and Twilio (SMS):** Used only to deliver password reset messages to you. Resend: https://resend.com/legal/privacy-policy · Twilio: https://www.twilio.com/en-us/legal/privacy

---

## 4. Data Storage and Security

- Passwords are hashed using bcrypt before storage and are never stored in plain text.
- Authentication tokens are stored securely using the device's encrypted secure storage (iOS Keychain / Android Keystore).
- Event and account data is transmitted over HTTPS.
- We retain your data for as long as your account is active. You may delete your account at any time (see Section 6).

---

## 5. Data Sharing

We do not sell, rent, or share your personal information with third parties for their marketing purposes. We may share data:
- With the service providers listed in Section 3, strictly to operate the app.
- If required by law, court order, or government authority.
- To protect the rights, property, or safety of CelebConnect, its users, or the public.

We never share your data with other CelebConnect users.

---

## 6. Your Rights

You have the right to:
- **Access** the personal data we hold about you.
- **Correct** inaccurate data via the Account screen in the app.
- **Delete** your account and all associated data by contacting us.
- **Export** your event data (available on request).
- **Withdraw consent** for notifications at any time through your device's Settings.

To exercise any of these rights, contact us at: **suneethakonjeti@gmail.com**

---

## 7. Children's Privacy

CelebConnect is not directed at children under the age of 13. We do not knowingly collect personal information from children under 13. If you believe a child has provided us with personal information, please contact us and we will delete it promptly.

---

## 8. Changes to This Policy

We may update this Privacy Policy from time to time. We will notify you of significant changes via the app or email. Continued use of the app after changes constitutes acceptance of the updated policy.

---

## 9. Contact Us

If you have questions about this Privacy Policy or how we handle your data, please contact:

**CelebConnect Support**
Email: suneethakonjeti@gmail.com
