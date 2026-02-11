import { Browser } from 'happy-dom';

const browser = new Browser();
const page = browser.newPage();

globalThis.window = page.mainFrame.window as unknown as typeof globalThis.window;
(globalThis as Record<string, unknown>).document = page.mainFrame.window.document;
(globalThis as Record<string, unknown>).navigator = page.mainFrame.window.navigator;
