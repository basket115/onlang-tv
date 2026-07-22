// logger.js
// Zentrales, minimales Logging mit einheitlichem Präfix. Bewusst ohne
// externe Abhängigkeit — reine Wrapper-Funktionen um console.*.

const PREFIX = '[ONLANG TV]';

export const logger = {
  info(...args) {
    console.info(PREFIX, ...args);
  },
  warn(...args) {
    console.warn(PREFIX, ...args);
  },
  error(...args) {
    console.error(PREFIX, ...args);
  },
};
