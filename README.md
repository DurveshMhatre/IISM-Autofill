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

## Updates

This GitHub installation does not update itself. To get a newer version, download and extract the latest ZIP using the steps above. On `chrome://extensions`, remove the old copy and load the new folder. Your locally saved profile may be removed when you uninstall; keep your information available so you can enter it again.

## Your Privacy

- Profile information is saved in Chrome on your device. Selected documents are saved in the extension's local browser storage.
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
- Shows whether a file is selected in the form. Only IISM can confirm that it received and accepted a file after you submit.

The IISM website can change at any time. Check every field and document before submitting. Do not repeatedly submit test applications or send unnecessary traffic to the live admissions website.

## Run Tests (Optional)

These steps are only for people who want to check or work on the code. Install Node.js, open a terminal in this project folder, and run:

```text
node --test
```

## License

This project is available under the [MIT License](LICENSE).
