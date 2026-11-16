# IISM Autofil | Durvesh Developments

A free, open-source Chrome extension that helps you fill the IISM admission form using information you enter and save in your own browser.

**This project is not affiliated with or approved by IISM.** It cannot guarantee that the form will work, that an application will be accepted, or that a seat will be available.

## Install It (Beginner Guide)

You do not need to know how to code. You do need the Google Chrome browser on a computer. This installation method is for desktop Chrome, not a phone.

1. Open this project's [GitHub page](https://github.com/DurveshMhatre/IISM-Autofill).
2. Click the green **Code** button.
3. Click **Download ZIP**.
4. Find the downloaded `IISM-Autofill-main.zip` file. It is usually in your **Downloads** folder.
5. Right-click the ZIP file and choose **Extract All**. Click **Extract**.
6. Open Chrome and type `chrome://extensions` in the address bar. Press **Enter**.
7. Turn on the **Developer mode** switch near the top-right corner.
8. Click **Load unpacked**.
9. In the folder window, open the extracted `IISM-Autofill-main` folder. Choose the folder that contains the file named `manifest.json`, then click **Select Folder**.
10. The extension is now installed. Click Chrome's puzzle-piece **Extensions** button. If you like, click the pin next to **IISM Autofil | Durvesh Developments** so its icon stays visible.

If Chrome shows an error, check that you selected the folder containing `manifest.json`, not the ZIP file itself.

## Use It

1. Click the extension's icon in Chrome to open it.
2. Type your own information into the matching fields. The extension saves text and selected documents in this Chrome profile automatically.
3. Keep each file at or below 500 KB. IISM requires JPG, JPEG, or PNG images for the date-of-birth proof, education proof, applicant photo, and signature. Convert a PDF to an image before selecting it for one of those fields. Other upload fields may have their own IISM restrictions.
4. Open the IISM admission form in Chrome.
5. Open the extension and click **Fill open IISM form**.
6. Check the form carefully. Fix anything that is missing or incorrect.
7. The extension does not accept declarations or submit the application. You must review the form and submit it yourself on the IISM website.

To remove saved profile information and documents, open the extension and click **Clear saved data**. To uninstall the extension, go to `chrome://extensions` and click **Remove** on its card.

## Using Another Computer

Your details are saved inside the one Chrome browser on the one computer where you typed them. Nothing travels between computers on its own, and clearing your browser data or uninstalling the extension can leave you with an empty form again. There are two ways to fix that.

### Way 1: Let Chrome carry your details (easiest)

1. In the extension, tick the box **Use my other computers**.
2. On the other computer, sign in to Chrome with the same Google account, install the extension, and open it. Your typed details are already there.

Turn the box off at any time to delete the copy kept by Google. Only the text you type is carried this way. Documents are not, because they are too big to sync.

### Way 2: Keep a backup file (carries everything, including documents)

1. In the extension, click **Save backup file**. A file is downloaded, for example `iism-autofil-backup-2026-11-12.json`.
2. Put that file somewhere you can reach from the other computer: send it to your own email, copy it to a USB stick, or save it in your own cloud drive.
3. On the other computer, install the extension, click **Load backup file**, and choose that `.json` file. Your details and documents come back.

If your computer shows an **Email backup file** button, it opens your computer's sharing window so you can pick your email app. The file arrives already attached; you only type your own address and press send. On the other computer, open that email, download the attachment, then click **Load backup file** and choose the downloaded file.

A backup file holds your personal details and your documents. Anyone who opens it can read them, so keep it private and do not share it. Loading a backup replaces the details already saved in the extension with the details in the file.

## Updates

This GitHub installation does not update itself. To get a newer version, download and extract the latest ZIP using the steps above. On `chrome://extensions`, remove the old copy and load the new folder. Your locally saved profile may be removed when you uninstall, so click **Save backup file** first and you can load it back afterwards.

## Your Privacy

- Profile information is saved in Chrome on your device. Selected documents are saved in the extension's local browser storage.
- The **Use my other computers** box is off until you tick it. While it is on, your typed details are kept in your Google account by Chrome's own sync, so Google stores them. Tick it off and the synced copy is deleted.
- A backup file is only made when you click **Save backup file** or **Email backup file**. It goes to your computer, or to the sharing window you choose from. The extension does not upload it anywhere.
- The extension does not send your profile to its developer, use analytics, or store your information on a developer server.
- When you choose to submit the application, the IISM website receives the information and documents you submit. Review that website's own privacy information.
- The extension only fills the IISM form when you click its fill button. It does not click Submit, bypass CAPTCHA or OTP, or reserve seats.
- Read [privacy.html](privacy.html) for more details. Its support-contact section is still a placeholder.

## What It Does

- Fills applicant, address, academic, identification, medical, emergency-contact, and other mapped fields.
- Uses a date picker for date of birth and provides dropdowns for education and diet.
- Checks common formats such as email, phone number, and PIN code before filling.
- Lets you collapse or expand profile sections.
- Uses the currently visible choices on the IISM form rather than guessing dropdown values.
- Stores selected documents locally, up to 500 KB each. It checks IISM's image-only requirement for the date-of-birth proof, education proof, applicant photo, and signatures; other fields remain subject to IISM's rules.
- Saves your details and documents into one backup file, which you can load on another computer, and can carry your typed details between computers through Chrome's own sync.
- Keeps the extension's own data in your browser only. There is no developer server, no account to create, and no fee.
- Shows whether a file is selected in the form. Only IISM can confirm that it received and accepted a file after you submit.

The IISM website can change at any time. Check every field and document before submitting. Do not repeatedly submit test applications or send unnecessary traffic to the live admissions website.

## Run Tests (Optional)

These steps are only for people who want to check or work on the code. Install Node.js, open a terminal in this project folder, and run:

```text
node --test
```

## License

This project is available under the [MIT License](LICENSE).
